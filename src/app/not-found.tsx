import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <section className="container-page flex flex-col items-start py-24 sm:py-32">
      <p className="font-display text-7xl font-bold text-mint-500 sm:text-8xl">404</p>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">This table isn&apos;t set.</h1>
      <p className="mt-3 max-w-md text-ink-muted">
        The page you&apos;re looking for has moved or never existed. The menu, though, is right
        where we left it.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/menu"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-ink transition hover:bg-mint-400"
        >
          Browse the menu <ArrowRight aria-hidden className="size-5" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold ring-1 ring-line transition hover:ring-charcoal-400"
        >
          Back to home
        </Link>
      </div>
    </section>
  );
}
