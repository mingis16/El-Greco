import type { Metadata } from "next";
import Link from "next/link";
import { Camera, ShieldCheck } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Verify a booking pass",
  description: "How El Greco booking passes are verified at the door.",
  alternates: { canonical: "/verify" },
};

export default function VerifyIndexPage() {
  return (
    <section className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow text-primary-text">Booking passes</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">How we verify your pass</h1>
        <p className="mt-4 text-ink-muted">
          Every El Greco booking pass has a unique reference (like <span className="font-mono font-semibold text-ink">EG-7KQ4-M2XP</span>)
          and a QR code. At the door, our team scans the QR code, which opens the live booking on our system, so what you
          see and what we see always match.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <Camera aria-hidden className="size-6 text-primary-text" />
            <h2 className="mt-3 font-semibold">Scan the QR code</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Point any phone camera at the QR code on the pass or PDF. It opens the verification page for that booking.
            </p>
          </div>
          <div className="rounded-card bg-surface p-5 ring-1 ring-line">
            <ShieldCheck aria-hidden className="size-6 text-primary-text" />
            <h2 className="mt-3 font-semibold">Fakes don&apos;t verify</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Each QR code carries a signature only our system can create. Edited, copied or invented passes show as
              &ldquo;not valid&rdquo;, and used passes show when they were checked in.
            </p>
          </div>
        </div>

        <p className="mt-8 text-sm text-ink-muted">
          Lost your pass? Open the link from your booking confirmation, or{" "}
          <a href={whatsappLink("Hello El Greco, I need help finding my booking.")} className="font-semibold text-primary-text underline" target="_blank" rel="noopener noreferrer">
            WhatsApp {site.phoneDisplay}
          </a>{" "}
          with your name and booking date. Staff can look up any reference from the{" "}
          <Link href="/staff" className="font-semibold text-primary-text underline">
            staff area
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
