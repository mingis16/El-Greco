"use client";

import Image from "next/image";
import { useDeferredValue, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Search, X } from "lucide-react";
import { MenuItemCard } from "@/components/menu/menu-item-card";
import type { MenuCategory, MenuGroupId, MenuItem } from "@/lib/menu-types";
import { MENU_GROUPS, isMenuGroupId, normalizeSearch } from "@/lib/menu-utils";
import type { Photo } from "@/lib/photos";
import { whatsappLink } from "@/lib/site";

type GroupFilter = MenuGroupId | "all";

// The active group lives in the URL hash (/menu#drinks) so it can be linked
// to from other pages and survives a refresh.
function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readHash = () => window.location.hash.slice(1);
const readServerHash = () => "";

function setHash(group: GroupFilter) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", group === "all" ? pathname + search : `#${group}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type IndexedCategory = Omit<MenuCategory, "items"> & {
  items: { item: MenuItem; haystack: string }[];
};

export function MenuBrowser({
  categories,
  categoryPhotos = {},
}: {
  categories: MenuCategory[];
  /** Optional photo per category slug, shown beside the section heading. */
  categoryPhotos?: Record<string, Photo>;
}) {
  const hash = useSyncExternalStore(subscribeToHash, readHash, readServerHash);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const topRef = useRef<HTMLDivElement>(null);

  const indexed = useMemo<IndexedCategory[]>(
    () =>
      categories.map((c) => ({
        ...c,
        items: c.items.map((item) => ({
          item,
          haystack: normalizeSearch(
            [item.name, item.description, c.name, ...item.variants.map((v) => v.name)].join(" "),
          ),
        })),
      })),
    [categories],
  );

  const groupCounts = useMemo(() => {
    const counts = new Map<GroupFilter, number>([["all", 0]]);
    for (const c of categories) {
      counts.set(c.group, (counts.get(c.group) ?? 0) + c.items.length);
      counts.set("all", counts.get("all")! + c.items.length);
    }
    return counts;
  }, [categories]);

  const terms = normalizeSearch(deferredQuery.trim()).split(/\s+/).filter(Boolean);
  const searching = terms.length > 0;
  // Search covers the whole menu; the tabs only filter when not searching.
  const activeGroup: GroupFilter = searching ? "all" : isMenuGroupId(hash) ? hash : "all";

  const visible = indexed
    .filter((c) => activeGroup === "all" || c.group === activeGroup)
    .map((c) => ({
      ...c,
      items: searching ? c.items.filter(({ haystack }) => terms.every((t) => haystack.includes(t))) : c.items,
    }))
    .filter((c) => c.items.length > 0);
  const resultCount = visible.reduce((n, c) => n + c.items.length, 0);

  const scrollToTop = () => {
    const top = topRef.current;
    if (top && top.getBoundingClientRect().top < 0) {
      top.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  };

  const selectGroup = (group: GroupFilter) => {
    setQuery("");
    setHash(group);
    scrollToTop();
  };

  const jumpToCategory = (slug: string) => {
    document
      .getElementById(`c-${slug}`)
      ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const tabs: { id: GroupFilter; label: string }[] = [{ id: "all", label: "All" }, ...MENU_GROUPS];

  return (
    <div className="container-page pb-24">
      <div className="relative -mt-7 max-w-xl">
        <label htmlFor="menu-search" className="sr-only">
          Search the menu
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-charcoal-400"
        />
        <input
          id="menu-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the menu"
          autoComplete="off"
          enterKeyHint="search"
          className="h-14 w-full rounded-full bg-surface pr-12 pl-12 text-base shadow-float ring-1 ring-line placeholder:text-charcoal-400 focus:ring-2 focus:ring-mint-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-charcoal-500 hover:bg-charcoal-100"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div ref={topRef} className="scroll-mt-(--header-height)" />
      <div className="sticky top-(--header-height) z-30 -mx-4 mt-6 border-b border-line bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div
          role="group"
          aria-label="Menu sections"
          className="no-scrollbar flex snap-x gap-2 overflow-x-auto py-3"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-pressed={activeGroup === tab.id}
              onClick={() => selectGroup(tab.id)}
              className="inline-flex shrink-0 snap-start items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-ink-muted ring-1 ring-line transition-colors hover:text-ink aria-pressed:bg-charcoal-900 aria-pressed:text-cream aria-pressed:ring-charcoal-900"
            >
              {tab.label}
              <span className="text-xs tabular-nums opacity-70">{groupCounts.get(tab.id) ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="mt-5 text-sm text-ink-muted">
        {searching
          ? `${resultCount} ${resultCount === 1 ? "result" : "results"} for “${deferredQuery.trim()}”`
          : `${resultCount} items`}
      </p>

      {!searching && visible.length > 1 && (
        <nav aria-label="Jump to category" className="no-scrollbar -mx-4 mt-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
          <ul className="flex gap-2">
            {visible.map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => jumpToCategory(c.slug)}
                  className="rounded-full bg-mint-50 px-3 py-1.5 text-xs font-semibold text-mint-800 ring-1 ring-mint-100 hover:bg-mint-100"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {visible.length === 0 ? (
        <div className="mt-10 rounded-card bg-surface p-8 text-center ring-1 ring-line">
          <p className="font-display text-lg font-semibold">Nothing matches “{deferredQuery.trim()}”</p>
          <p className="mt-2 text-sm text-ink-muted">
            Try another word, or ask us. The kitchen may be able to help.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-full bg-charcoal-900 px-5 py-2.5 text-sm font-semibold text-cream"
            >
              Clear search
            </button>
            <a
              href={whatsappLink(`Hello El Greco, do you have ${deferredQuery.trim()}?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-5 py-2.5 text-sm font-semibold ring-1 ring-line hover:ring-charcoal-400"
            >
              Ask on WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {visible.map((c) => (
            <section
              key={c.id}
              id={`c-${c.slug}`}
              aria-labelledby={`h-${c.slug}`}
              className="scroll-mt-[calc(var(--header-height)+5rem)]"
            >
              <div className="flex items-center justify-between gap-4 border-b border-line pb-3">
                <div className="flex items-center gap-3">
                  {categoryPhotos[c.slug] && (
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-charcoal-100 sm:size-14">
                      <Image
                        src={categoryPhotos[c.slug].src}
                        alt={categoryPhotos[c.slug].alt}
                        fill
                        placeholder="blur"
                        sizes="56px"
                        className="object-cover"
                      />
                    </span>
                  )}
                  <h2 id={`h-${c.slug}`} className="text-xl font-semibold sm:text-2xl">
                    {c.name}
                  </h2>
                </div>
                <span className="text-sm text-ink-muted tabular-nums">{c.items.length}</span>
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {c.items.map(({ item }) => (
                  <li key={item.id}>
                    <MenuItemCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
