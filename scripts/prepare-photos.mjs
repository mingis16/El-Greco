#!/usr/bin/env node
// Turns the raw WhatsApp photos in "public/el greco pics" into cleanly named,
// optimized JPEGs in src/assets/photos (imported by src/lib/photos.ts), and
// builds the logo files in public/brand from assets/brand/logo-source.jpg.
//
//   node scripts/prepare-photos.mjs
//
// `trim` removes Instagram overlay icons (mute/carousel badges) left on
// screenshots, in source pixels.

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

sharp.concurrency(1);
sharp.cache(false);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "public/el greco pics");
const OUT_DIR = path.join(ROOT, "src/assets/photos");
const BRAND_DIR = path.join(ROOT, "public/brand");
const APP_DIR = path.join(ROOT, "src/app");

const W = "WhatsApp Image 2026-09-26 at ";
const MUTE_ICON = { bottom: 75 };

const PHOTOS = [
  // Spaces
  { src: "13.01.34iu5.jpeg", out: "dining-oak-ceiling", trim: MUTE_ICON },
  { src: "13.01.33fg.jpeg", out: "dining-room", trim: MUTE_ICON },
  { src: "13.01.34.jpeg", out: "dining-lounge", trim: MUTE_ICON },
  { src: "13.01.35.jpeg", out: "dining-hall", trim: { top: 70, bottom: 75 } },
  { src: "13.01.55oioolkj.jpeg", out: "dining-rattan-lamps" },
  { src: "13.02.03huygg.jpeg", out: "dining-evening" },
  { src: "13.01.59 mn.jpeg", out: "cafe-hall" },
  { src: "13.02.02.jpeg", out: "terrace-sea-table" },
  { src: "13.01.37765.jpeg", out: "terrace-sea-view" },
  { src: "13.01.58aaaaaaaaaaa.jpeg", out: "terrace-open-air" },
  { src: "13.01.35675.jpeg", out: "conference-u-shape" },
  { src: "13.01.35897.jpeg", out: "conference-room" },
  { src: "13.01.33.jpeg", out: "event-hall" },
  { src: "13.01.3456.jpeg", out: "event-hall-logo" },
  { src: "13.01.33534.jpeg", out: "event-hall-table" },
  // Occasions
  { src: "13.01.54hg.jpeg", out: "celebration-long-table" },
  { src: "13.01.52huj.jpeg", out: "celebration-blue-yellow" },
  { src: "13.01.53jmnk.jpeg", out: "celebration-table-setting" },
  { src: "13.0ghui.jpeg", out: "birthday-balloons" },
  { src: "13.01.46hkg.jpeg", out: "event-guests" },
  { src: "13.01.3613.jpeg", out: "date-night-table" },
  { src: "13.01.3867.jpeg", out: "fine-dining-plate" },
  { src: "13.01.537786o8.jpeg", out: "live-music-sax" },
  { src: "13.01.54hhg.jpeg", out: "live-music-band" },
  // Food
  { src: "13.01.36.jpeg", out: "acheke-jollof-platter" },
  { src: "13.01.40564.jpeg", out: "eggs-benedict" },
  { src: "13.01.41564.jpeg", out: "seafood-jollof" },
  { src: "13.01.4187.jpeg", out: "seafood-bowl" },
  { src: "13.01.41hlk.jpeg", out: "burger-and-fries" },
  { src: "13.01.42ytu.jpeg", out: "spring-rolls" },
  { src: "13.01.45.jpeg", out: "steak-plate" },
  { src: "13.01.48.jpeg", out: "chocolate-cake" },
  { src: "13.01.52ygkj.jpeg", out: "mini-burgers" },
  { src: "13.01.56aass.jpeg", out: "lobster-platter" },
  { src: "13.01.58.jpeg", out: "flatbread-pizza" },
  { src: "13.02.01.jpeg", out: "breakfast-plate" },
  { src: "13.02.04.jpeg", out: "pasta-garlic-bread" },
  { src: "13.02.05hih.jpeg", out: "fried-chicken-rice" },
  { src: "13.02.14,mgfr.jpeg", out: "pizza-peppers" },
  { src: "13.01.3776.jpeg", out: "waffle-sandwich" },
  // Drinks
  { src: "13.01.387gh.jpeg", out: "margarita" },
  { src: "13.01.38jklhg.jpeg", out: "iced-latte" },
  { src: "13.01.39iju.jpeg", out: "cappuccino" },
  { src: "13.01.39kjh.jpeg", out: "frappe" },
  { src: "13.01.46uhulh.jpeg", out: "smoking-cocktail", trim: MUTE_ICON },
  { src: "13.01.51.jpeg", out: "blue-cocktail", trim: { right: 12, bottom: 80 } },
  { src: "13.01.59huygu.jpeg", out: "cosmopolitan" },
  { src: "13.02.00.jpeg", out: "pina-colada" },
  { src: "13.02.04luy.jpeg", out: "milkshakes" },
  { src: "13.02.06.jpeg", out: "aperol-spritz" },
  { src: "13.01.54hgpkpko.jpeg", out: "irish-coffee" },
];

async function preparePhotos() {
  await mkdir(OUT_DIR, { recursive: true });
  for (const photo of PHOTOS) {
    const input = sharp(path.join(SRC_DIR, W + photo.src)).rotate();
    const { width, height } = await input.metadata();
    const t = { top: 0, right: 0, bottom: 0, left: 0, ...photo.trim };
    await input
      .extract({ left: t.left, top: t.top, width: width - t.left - t.right, height: height - t.top - t.bottom })
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(OUT_DIR, `${photo.out}.jpg`));
  }
  console.log(`✓ ${PHOTOS.length} photos -> src/assets/photos`);
}

// The source is a screenshot of white lettering on the brand mint (#4DDBC3),
// with a TikTok watermark bottom-right. Alpha comes from the red channel:
// mint's red is 77, the white lettering's is 255, and the drop shadow is
// darker than the background so it drops out.
const LOGO_CROP = { left: 150, top: 88, width: 840, height: 520 };
const MINT = { r: 77, g: 219, b: 195 };

async function prepareLogo() {
  await mkdir(BRAND_DIR, { recursive: true });
  const { data, info } = await sharp(path.join(ROOT, "assets/brand/logo-source.jpg"))
    .extract(LOGO_CROP)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alpha = Buffer.alloc(info.width * info.height);
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  for (let i = 0, p = 0; i < data.length; i += info.channels, p++) {
    const a = Math.round(Math.min(1, Math.max(0, (data[i] - MINT.r - 25) / (255 - MINT.r - 45))) * 255);
    alpha[p] = a;
    if (a > 40) {
      const x = p % info.width, y = Math.floor(p / info.width);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }

  const tint = async (hex, file) => {
    const pad = 6;
    const box = {
      left: Math.max(0, minX - pad),
      top: Math.max(0, minY - pad),
      width: Math.min(info.width, maxX + pad) - Math.max(0, minX - pad),
      height: Math.min(info.height, maxY + pad) - Math.max(0, minY - pad),
    };
    const colour = sharp({ create: { width: info.width, height: info.height, channels: 3, background: hex } });
    const rgba = await colour.joinChannel(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toBuffer();
    await sharp(rgba).extract(box).png({ compressionLevel: 9 }).toFile(path.join(BRAND_DIR, file));
    return box;
  };

  const box = await tint("#ffffff", "logo-white.png");
  await tint("#1d1915", "logo-dark.png");
  await tint("#4ddbc3", "logo-mint.png");

  // Square app icons: white lettering on the brand mint.
  const white = await sharp(path.join(BRAND_DIR, "logo-white.png")).toBuffer();
  const icon = async (size, file, radius) => {
    const inner = Math.round(size * 0.8);
    const art = await sharp(white).resize(inner, inner, { fit: "inside" }).toBuffer();
    const mask = radius
      ? Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="#fff"/></svg>`)
      : null;
    let img = sharp({ create: { width: size, height: size, channels: 4, background: { ...MINT, alpha: 1 } } })
      .composite([{ input: art, gravity: "center" }]);
    if (mask) img = sharp(await img.png().toBuffer()).composite([{ input: mask, blend: "dest-in" }]);
    await img.png({ compressionLevel: 9 }).toFile(file);
  };
  await icon(512, path.join(APP_DIR, "icon.png"), 96);
  await icon(180, path.join(APP_DIR, "apple-icon.png"), 0);

  console.log(`✓ logo ${box.width}x${box.height} -> public/brand, app icons -> src/app`);
}

// 1200x630 social preview: the oak-ceiling dining room, darkened, with the logo.
async function prepareOgImage() {
  const W = 1200, H = 630;
  const photo = await sharp(path.join(OUT_DIR, "dining-oak-ceiling.jpg")).resize(W, H, { fit: "cover" }).toBuffer();
  const shade = Buffer.from(
    `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#1d1915" stop-opacity=".94"/><stop offset=".55" stop-color="#1d1915" stop-opacity=".75"/><stop offset="1" stop-color="#1d1915" stop-opacity=".2"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><rect y="${H - 10}" width="${W}" height="10" fill="#4ddbc3"/><text x="80" y="470" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff">Good food. Good vibe. More memories.</text><text x="80" y="530" font-family="Segoe UI, Arial, sans-serif" font-size="28" fill="#4ddbc3">Sea-view dining · Aberdeen, Freetown · Book online</text></svg>`,
  );
  const logo = await sharp(path.join(BRAND_DIR, "logo-white.png")).resize({ height: 300 }).toBuffer();
  await sharp(photo)
    .composite([{ input: shade }, { input: logo, left: 80, top: 70 }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(path.join(APP_DIR, "opengraph-image.jpg"));
  console.log("✓ social preview -> src/app/opengraph-image.jpg");
}

await preparePhotos();
await prepareLogo();
await prepareOgImage();
