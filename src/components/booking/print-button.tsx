"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-charcoal-400 print:hidden"
    >
      <Printer aria-hidden className="size-4" /> {label}
    </button>
  );
}
