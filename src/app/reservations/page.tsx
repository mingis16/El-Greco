import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, CalendarCheck, QrCode, ScanLine } from "lucide-react";
import { BookingForm } from "@/components/booking/booking-form";
import { photos } from "@/lib/photos";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reservations",
  description:
    "Book a table at El Greco Kafe - Resto in Aberdeen, Freetown. Birthdays, anniversaries, date nights, business meetings and private events, with a verified digital booking pass.",
  alternates: { canonical: "/reservations" },
  openGraph: { url: "/reservations" },
};

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Book in a minute",
    body: "Pick your occasion, time and party size from live availability.",
  },
  {
    icon: BadgeCheck,
    title: "Get a clear answer",
    body: "Tables up to 6 are confirmed instantly. Larger groups and events are confirmed personally.",
  },
  {
    icon: QrCode,
    title: "Receive your pass",
    body: "A unique reference, QR code, PDF and calendar invite, ready on your phone.",
  },
  {
    icon: ScanLine,
    title: "Scan at the door",
    body: "Staff scan your QR and see the live booking, so nothing gets mixed up.",
  },
];

export default function ReservationsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-charcoal-900 text-cream">
        <div className="absolute inset-0">
          <Image
            src={photos.celebrationLongTable.src}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="100vw"
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-linear-to-r from-charcoal-900 via-charcoal-900/85 to-charcoal-900/40" />
        </div>
        <div className="container-page relative py-14 sm:py-20">
          <p className="eyebrow text-mint-400">Reservations</p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-tight font-bold sm:text-5xl">
            Reserve your table. Plan your occasion.
          </h1>
          <p className="mt-4 max-w-xl text-charcoal-200">
            Birthdays, anniversaries, date nights, business lunches and private events. Book online and get a verified
            digital pass, so your table is waiting and everyone knows the plan.
          </p>
        </div>
        <div aria-hidden className="meander opacity-50" />
      </section>

      <section className="container-page py-10 sm:py-14">
        <Suspense fallback={<FormSkeleton />}>
          <BookingForm />
        </Suspense>
      </section>

      <section aria-labelledby="how-heading" className="bg-surface">
        <div className="container-page py-14 sm:py-20">
          <p className="eyebrow text-primary-text">How it works</p>
          <h2 id="how-heading" className="mt-2 text-3xl font-bold">
            No confusion, no double bookings, no fake passes
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-card bg-background p-5 ring-1 ring-line">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-mint-400 text-charcoal-900">
                    <step.icon aria-hidden className="size-5" />
                  </span>
                  <span className="text-xs font-semibold text-ink-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm text-ink-muted">
            Already booked?{" "}
            <Link href="/verify" className="font-semibold text-primary-text underline-offset-4 hover:underline">
              Check a booking pass
            </Link>{" "}
            or{" "}
            <a
              href={whatsappLink("Hello El Greco, I have a question about my booking.")}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary-text underline-offset-4 hover:underline"
            >
              WhatsApp {site.phoneDisplay}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-busy="true" aria-label="Loading booking form">
      <div className="space-y-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-card bg-surface ring-1 ring-line" />
        ))}
      </div>
      <div className="hidden h-96 animate-pulse rounded-card bg-surface ring-1 ring-line lg:block" />
    </div>
  );
}
