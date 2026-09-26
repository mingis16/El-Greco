"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CalendarCheck, Menu as MenuIcon, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { HeaderCart } from "@/components/ordering/header-cart";
import { navLinks } from "@/lib/site";

type NavVariant = "desktop" | "mobile";

const LINK_CLASS: Record<NavVariant, string> = {
  desktop:
    "rounded-full px-4 py-2 text-sm font-medium text-charcoal-200 transition-colors hover:text-cream aria-[current=page]:bg-charcoal-800 aria-[current=page]:text-mint-300",
  mobile:
    "block rounded-xl px-4 py-3 text-base font-medium text-charcoal-100 hover:bg-charcoal-800 aria-[current=page]:text-mint-300",
};

function NavItems({ variant, pathname, onNavigate }: { variant: NavVariant; pathname: string | null; onNavigate?: () => void }) {
  return navLinks.map((link) => (
    <li key={link.href}>
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={pathname && !link.href.includes("#") && pathname.startsWith(link.href) ? "page" : undefined}
        className={LINK_CLASS[variant]}
      >
        {link.label}
      </Link>
    </li>
  ));
}

/** Reads the URL for the active-link style. Kept in its own Suspense boundary so pages can still prerender. */
function ActiveNavItems(props: { variant: NavVariant; onNavigate?: () => void }) {
  return <NavItems {...props} pathname={usePathname()} />;
}

function Nav(props: { variant: NavVariant; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavItems {...props} pathname={null} />}>
      <ActiveNavItems {...props} />
    </Suspense>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-charcoal-900/95 text-cream backdrop-blur supports-[backdrop-filter]:bg-charcoal-900/85 print:hidden">
      <div className="container-page flex h-(--header-height) items-center justify-between gap-4">
        <Logo className="h-11 w-auto sm:h-12" priority />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            <Nav variant="desktop" />
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <HeaderCart />
          <Link
            href="/reservations"
            className="hidden items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-ink transition hover:bg-mint-300 sm:inline-flex"
          >
            <CalendarCheck aria-hidden className="size-4" />
            Book a table
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center rounded-full text-cream transition hover:bg-charcoal-800 md:hidden"
          >
            {open ? <X className="size-6" /> : <MenuIcon className="size-6" />}
          </button>
        </div>
      </div>

      <nav id="mobile-nav" aria-label="Main" hidden={!open} className="border-t border-charcoal-800 md:hidden">
        <ul className="container-page flex flex-col gap-1 py-3">
          <Nav variant="mobile" onNavigate={close} />
          <li className="pt-2">
            <Link
              href="/reservations"
              onClick={close}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-ink"
            >
              <CalendarCheck aria-hidden className="size-5" />
              Book a table
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
