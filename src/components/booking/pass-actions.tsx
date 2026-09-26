"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, Check, Copy, FileDown, Loader2, Printer, XCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/whatsapp-icon";

interface PassActionsProps {
  bookingRef: string;
  token: string;
  pdfHref: string;
  calendarHref: string;
  whatsappHref: string;
  canCancel: boolean;
}

export function PassActions({ bookingRef, token, pdfHref, calendarHref, whatsappHref, canCancel }: PassActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState<"ref" | "link" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async (what: "ref" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "ref" ? bookingRef : window.location.href.replace(/&new=1$/, ""));
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Couldn't copy. Please select and copy it manually.");
    }
  };

  const cancel = async () => {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Couldn't cancel. Please WhatsApp us.");
      setConfirming(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const base = "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition";
  const button = `${base} bg-surface ring-1 ring-line hover:ring-charcoal-400`;

  return (
    <div className="space-y-4 print:hidden">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <a href={pdfHref} target="_blank" rel="noopener" className={`${base} col-span-2 bg-primary text-primary-ink hover:bg-mint-300 sm:col-span-1`}>
          <FileDown aria-hidden className="size-4" /> Download PDF
        </a>
        <a href={calendarHref} className={button}>
          <CalendarPlus aria-hidden className="size-4" /> Add to calendar
        </a>
        <button type="button" onClick={() => window.print()} className={button}>
          <Printer aria-hidden className="size-4" /> Print
        </button>
        <button type="button" onClick={() => copy("ref")} className={button}>
          {copied === "ref" ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          {copied === "ref" ? "Copied" : "Copy reference"}
        </button>
        <button type="button" onClick={() => copy("link")} className={button}>
          {copied === "link" ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          {copied === "link" ? "Link copied" : "Copy pass link"}
        </button>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={button}>
          <WhatsAppIcon className="size-4 text-[#128c7e]" /> Message us
        </a>
      </div>

      <p aria-live="polite" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </p>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}

      {canCancel &&
        (confirming ? (
          <div className="rounded-xl bg-danger-50 p-4 text-sm ring-1 ring-danger-700/20">
            <p className="font-semibold text-danger-700">Cancel booking {bookingRef}?</p>
            <p className="mt-1 text-ink-muted">This frees your table for other guests and can&apos;t be undone online.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 rounded-full bg-danger-700 px-4 py-2 font-semibold text-white disabled:opacity-70"
              >
                {cancelling && <Loader2 aria-hidden className="size-4 animate-spin" />}
                Yes, cancel booking
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-4 py-2 font-semibold ring-1 ring-line">
                Keep booking
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-danger-700 underline-offset-4 hover:underline"
          >
            <XCircle aria-hidden className="size-4" /> Cancel this booking
          </button>
        ))}
    </div>
  );
}
