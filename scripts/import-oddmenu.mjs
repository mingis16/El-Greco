#!/usr/bin/env node
// Pulls the live El Greco menu from oddmenu.com and writes it to
// src/data/menu.generated.ts as typed seed data.
//
//   npm run menu:import                  # fetch from the live API
//   npm run menu:import -- --from x.json # use a saved API response
//
// Names are title-cased and ALL-CAPS descriptions are sentence-cased for
// display. Spelling, prices and availability are kept exactly as published.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SLUG = "el-greco-seaview";
const SOURCE_URL = `https://oddmenu.com/p/${SLUG}`;
const API_URL = `https://api.oddmenu.com/place/EN/${SLUG}`;
const OUT_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/data/menu.generated.ts",
);

// Keys are the lower-cased, trimmed oddmenu category names.
const CATEGORY_OVERRIDES = {
  brunch: { name: "Brunch", group: "brunch" },
  sandwich: { name: "Sandwiches", group: "mains" },
  african: { name: "African", group: "specialities" },
  "fast food": { name: "Fast Food", group: "mains" },
  appetizers: { name: "Appetizers", group: "appetizers" },
  soup: { name: "Soups", group: "appetizers" },
  salads: { name: "Salads", group: "appetizers" },
  chicken: { name: "Chicken", group: "mains" },
  pasta: { name: "Pasta", group: "mains" },
  "beef & lamb": { name: "Beef & Lamb", group: "mains" },
  seafood: { name: "Seafood", group: "mains" },
  pizza: { name: "Pizza", group: "mains" },
  indian: { name: "Indian", group: "specialities" },
  dessert: { name: "Desserts", group: "desserts" },
  "soft drinks": { name: "Soft Drinks", group: "drinks" },
  beer: { name: "Beer", group: "drinks" },
  mocktail: { name: "Mocktails", group: "drinks" },
  cocktail: { name: "Cocktails", group: "drinks" },
  glass: { name: "Spirits & Wine", group: "drinks" },
  // oddmenu spells these "BEVERGES"/"BEVEREGES"; the correct spelling is
  // mapped too so a future fix upstream doesn't change the grouping.
  "hot beverges": { name: "Hot Beverages", group: "drinks" },
  "hot beverages": { name: "Hot Beverages", group: "drinks" },
  "iced bevereges": { name: "Iced Beverages", group: "drinks" },
  "iced beverages": { name: "Iced Beverages", group: "drinks" },
  "milk shakes": { name: "Milkshakes", group: "drinks" },
  frappe: { name: "Frappés", group: "drinks" },
};

// Categories added later on oddmenu fall back to their parent menu's group.
const MENU_GROUP_FALLBACK = { food: "mains", desert: "desserts", dessert: "desserts", drinks: "drinks" };

// Template text left over from oddmenu, not real descriptions.
const PLACEHOLDER_DESCRIPTIONS = new Set(["the description for a second beer"]);

// Price corrections confirmed by the restaurant (2026-09-26), keyed by display
// category name then lower-cased item name. Applied on every import so a
// re-sync from oddmenu can't bring back old values. `freeAddons` makes every
// add-on option in the category free (pasta sauces are included).
const CATEGORY_FIXES = {
  pasta: {
    prices: {
      "chicken alfredo": 430,
      "seafood pasta": 530,
      "stir fried noodles": 480,
      "bolognese pasta": 450,
      arabiata: 340,
    },
    freeAddons: true,
  },
};

const MINOR_WORDS = new Set(["a", "an", "and", "of", "on", "the", "with", "in", "de"]);
const TOKEN_CASE = { cl: "cl", bbq: "BBQ" };

const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();

function upperRatio(s) {
  const letters = s.replace(/[^a-zA-Z]/g, "");
  if (!letters) return 0;
  return letters.replace(/[^A-Z]/g, "").length / letters.length;
}

function titleCase(input) {
  return clean(input)
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      if (TOKEN_CASE[word]) return TOKEN_CASE[word];
      if (i > 0 && MINOR_WORDS.has(word)) return word;
      return word.replace(/(^|[(.\-/&])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
    })
    .join(" ");
}

function sentenceCase(input) {
  const s = clean(input);
  const lowered = upperRatio(s) > 0.7 ? s.toLowerCase() : s;
  return lowered.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
}

// "…served with rice. 20min" -> { text: "…served with rice.", prepMinutes: 20 }
function splitPrepTime(description) {
  const match = description.match(/[\s.]*(\d{1,3})\s*mins?\.?\s*$/i);
  if (!match) return { text: description, prepMinutes: undefined };
  return { text: description.slice(0, match.index).trim(), prepMinutes: Number(match[1]) };
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const toPrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid price: ${value}`);
  return n;
};

const byPosition = (a, b) => a.position - b.position;

function applyFixes(categoryName, items) {
  const fix = CATEGORY_FIXES[categoryName.toLowerCase()];
  if (!fix) return;
  const unmatched = new Set(Object.keys(fix.prices ?? {}));
  for (const item of items) {
    const key = item.name.toLowerCase();
    const price = fix.prices?.[key];
    if (price !== undefined) {
      unmatched.delete(key);
      if (item.price !== price) console.log(`  fix: ${item.name} price ${item.price} -> ${price}`);
      item.price = price;
    }
    if (fix.freeAddons) {
      for (const option of item.addons.flatMap((a) => a.options)) {
        if (option.price !== 0) console.log(`  fix: ${item.name} add-on ${option.name} ${option.price} -> 0`);
        option.price = 0;
      }
    }
  }
  if (unmatched.size) console.warn(`! Price fixes for ${categoryName} not applied (item renamed?): ${[...unmatched].join(", ")}`);
}

function transform(raw) {
  const menus = [...raw.menus].filter((m) => m.isVisible).sort(byPosition);
  const categories = [];
  const unmapped = [];

  for (const menu of menus) {
    const menuKey = clean(menu.info.name).toLowerCase();
    const menuCategories = raw.menuCategories
      .filter((c) => c.menuId === menu.id && c.isVisible)
      .sort(byPosition);

    for (const category of menuCategories) {
      const key = clean(category.info.name).toLowerCase();
      const override = CATEGORY_OVERRIDES[key];
      if (!override) unmapped.push(category.info.name);
      const name = override?.name ?? titleCase(category.info.name);
      const group = override?.group ?? MENU_GROUP_FALLBACK[menuKey] ?? "mains";

      const items = raw.menuItems
        .filter((i) => i.menuCategoryId === category.id && i.isVisible)
        .sort(byPosition)
        .map((item) => {
          const rawDescription = clean(item.info.description);
          const described = PLACEHOLDER_DESCRIPTIONS.has(rawDescription.toLowerCase())
            ? ""
            : sentenceCase(rawDescription);
          const { text, prepMinutes } = splitPrepTime(described);
          const variants = (item.variant?.options ?? []).map((o) => ({
            id: o.id,
            name: titleCase(o.info.title),
            price: toPrice(o.price),
          }));
          const addons = (item.addon ?? []).map((a) => ({
            id: a.id,
            name: titleCase(a.info.title),
            selectType: a.selectType === "MULTI" ? "multi" : "single",
            options: a.options.map((o) => ({
              id: o.id,
              name: titleCase(o.info.title),
              price: toPrice(o.price),
            })),
          }));

          return {
            id: item.id,
            name: titleCase(item.info.name),
            ...(text && { description: text }),
            price: toPrice(item.price),
            ...(clean(item.info.weight) && { weight: clean(item.info.weight).toLowerCase() }),
            ...(prepMinutes && { prepMinutes }),
            available: item.isAvailable,
            variants,
            addons,
          };
        });

      applyFixes(name, items);
      categories.push({ id: category.id, slug: slugify(name), name, group, items });
    }
  }

  // Two oddmenu categories can share a display name; keep anchors unique.
  const seen = new Map();
  for (const c of categories) {
    const n = seen.get(c.slug) ?? 0;
    seen.set(c.slug, n + 1);
    if (n) c.slug = `${c.slug}-${n + 1}`;
  }

  if (unmapped.length) {
    console.warn(`! Unmapped categories (used menu fallback group): ${unmapped.join(", ")}`);
  }

  const { place } = raw;
  return {
    source: SOURCE_URL,
    importedAt: new Date().toISOString(),
    currency: "SLE",
    place: {
      name: clean(place.name),
      phone: place.phone,
      address: clean(place.info?.address).replace(/\.$/, ""),
      city: clean(place.info?.city),
      country: clean(place.info?.country),
    },
    categories,
  };
}

async function loadRaw() {
  const fromIndex = process.argv.indexOf("--from");
  if (fromIndex !== -1) {
    return JSON.parse(await readFile(process.argv[fromIndex + 1], "utf8"));
  }
  const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`oddmenu API responded ${res.status} for ${API_URL}`);
  return res.json();
}

const data = transform(await loadRaw());
const itemCount = data.categories.reduce((n, c) => n + c.items.length, 0);

const file = `// Generated by scripts/import-oddmenu.mjs from ${SOURCE_URL}
// Do not edit by hand; re-run \`npm run menu:import\` instead.

import type { MenuData } from "@/lib/menu-types";

export const menuData: MenuData = ${JSON.stringify(data, null, 2)};
`;

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, file, "utf8");
console.log(`✓ Wrote ${data.categories.length} categories / ${itemCount} items to ${path.relative(process.cwd(), OUT_FILE)}`);
