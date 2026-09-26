import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { PassActions } from "@/components/booking/pass-actions";
import { QrCode } from "@/components/booking/qr-code";
import { StatusBadge, statusPanelClass } from "@/components/booking/status-badge";
import { BOOKING_RULES, STATUS_COPY, extraLabel, occasionLabel, spaceLabel } from "@/lib/booking/config";
import { maskPhone } from "@/lib/booking/phone";
import { checkBookingToken, normalizeRef } from "@/lib/booking/security";
import { guestCanCancel, verifyPath } from "@/lib/booking/service";
import { getBookingStore } from "@/lib/booking/store";
import { formatDateLong, formatTime, formatTimestamp, holdUntil } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";
import { requestOrigin } from "@/lib/origin";
import { whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your booking pass",
  robots: { index: false, follow: false },
};

export default function BookingPassPage(props: PageProps<"/reservations/[ref]">) {
  return (
    <section className="container-page py-10 sm:py-14">
      <Suspense fallback={<div className="mx-auto h-[36rem] max-w-xl animate-pulse rounded-card bg-surface ring-1 ring-line" />}>
        <BookingPass {...props} />
      </Suspense>
    </section>
  );
}

async function BookingPass({ params, searchParams }: PageProps<"/reservations/[ref]">) {
  const [{ ref: rawRef }, query] = await Promise.all([params, searchParams]);
  const ref = normalizeRef(rawRef);
  const token = typeof query.t === "string" ? query.t : null;
  const isNew = query.new === "1";

  const booking = ref && checkBookingToken("manage", ref, token) ? await (await getBookingStore()).findByRef(ref) : null;
  if (!ref || !token || !booking) return <InvalidLink />;

  const origin = await requestOrigin();
  const verifyUrl = `${origin}${verifyPath(booking.ref)}`;
  const passQuery = `?t=${encodeURIComponent(token)}`;
  const status = STATUS_COPY[booking.status];

  return (
    <div className="mx-auto max-w-xl">
      {isNew && (
        <div role="status" className={`mb-6 flex gap-3 rounded-card p-4 ring-1 print:hidden ${statusPanelClass(booking.status)}`}>
          <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              {booking.status === "confirmed"
                ? "You're booked! Your table is confirmed."
                : booking.kind === "event"
                  ? "Event request received."
                  : "Booking request received."}
            </p>
            <p className="mt-1">
              Save this page: it&apos;s your pass. Download the PDF or add it to your calendar so it&apos;s always to hand.
            </p>
          </div>
        </div>
      )}

      <article className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line print:shadow-none">
        <header className="flex items-center justify-between gap-4 bg-charcoal-900 px-6 py-5 text-cream">
          <Logo plain className="h-14 w-auto" />
          <div className="text-right">
            <p className="eyebrow text-mint-400">{booking.kind === "event" ? "Event booking" : "Table booking"}</p>
            <p className="mt-1 font-display text-lg">Booking pass</p>
          </div>
        </header>
        <div aria-hidden className="h-1 bg-mint-400" />

        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-start">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">Reference</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-wider">{booking.ref}</p>
            <StatusBadge status={booking.status} className="mt-3" />
            <p className="mt-3 text-sm text-ink-muted">{status.guest}</p>
          </div>
          <figure className="mx-auto w-44 text-center sm:mx-0">
            <QrCode value={verifyUrl} label={`QR code to verify booking ${booking.ref}`} className="w-full rounded-xl ring-1 ring-line" />
            <figcaption className="mt-2 text-xs text-ink-muted">Staff scan this at the door</figcaption>
          </figure>
        </div>

        <dl className="grid gap-x-6 gap-y-4 border-t border-dashed border-line p-6 text-sm sm:grid-cols-2">
          <Detail label="Guest" value={booking.guestName} />
          <Detail label="Phone" value={maskPhone(booking.guestPhone)} />
          <Detail label="Date" value={formatDateLong(booking.date)} />
          <Detail
            label="Time"
            value={formatTime(booking.time)}
            hint={booking.kind === "table" ? `Table held until ${holdUntil(booking.time)}` : undefined}
          />
          <Detail label="Guests" value={String(booking.partySize)} />
          <Detail label="Occasion" value={occasionLabel(booking.occasion)} />
          <Detail label="Seating" value={spaceLabel(booking.space)} />
          {booking.celebrant && <Detail label="Celebrating" value={booking.celebrant} />}
          {booking.extras.length > 0 && (
            <Detail label="Requests" value={booking.extras.map((e) => extraLabel(booking.occasion, e)).join(", ")} wide />
          )}
          {booking.notes && <Detail label="Notes" value={booking.notes} wide />}
        </dl>

        <div className="border-t border-line bg-background/60 p-6 text-xs text-ink-muted">
          <p className="flex items-start gap-2">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-primary-text" />
            This pass is valid only if its QR code verifies on our system at the door. The live status there always wins
            over any screenshot or printout.
          </p>
          <p className="mt-2 flex items-start gap-2">
            <Clock aria-hidden className="size-4 shrink-0 text-primary-text" />
            {booking.kind === "table"
              ? `Tables are held for ${BOOKING_RULES.arrivalGraceMinutes} minutes after the booking time.`
              : "Our events team will confirm set-up and arrival times with you before the day."}{" "}
            Issued{" "}
            {formatTimestamp(booking.createdAt)}.
          </p>
        </div>
      </article>

      <div className="mt-6">
        <PassActions
          bookingRef={booking.ref}
          token={token}
          pdfHref={`/reservations/${booking.ref}/pass.pdf${passQuery}`}
          calendarHref={`/reservations/${booking.ref}/calendar.ics${passQuery}`}
          whatsappHref={whatsappLink(guestMessage(booking))}
          canCancel={guestCanCancel(booking)}
        />
        <p className="mt-6 rounded-xl bg-wood-50 p-4 text-sm text-wood-800 ring-1 ring-wood-100 print:hidden">
          Keep this link private. Anyone with it can view or cancel this booking. The QR code only lets staff check that the
          pass is genuine.
        </p>
      </div>
    </div>
  );
}

function guestMessage(booking: Booking) {
  return `Hello El Greco, this is ${booking.guestName}. My booking reference is ${booking.ref} (${occasionLabel(
    booking.occasion,
  )}, ${booking.partySize} guests, ${formatDateLong(booking.date)} at ${formatTime(booking.time)}).`;
}

function Detail({ label, value, hint, wide }: { label: string; value: string; hint?: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
      {hint && <dd className="text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

function InvalidLink() {
  return (
    <div className="mx-auto max-w-lg rounded-card bg-surface p-8 text-center shadow-card ring-1 ring-line">
      <h1 className="text-2xl font-bold">We can&apos;t open this booking</h1>
      <p className="mt-3 text-ink-muted">
        The link may be incomplete or mistyped. Open the link from your booking confirmation again, or contact us with your
        booking reference.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <a
          href={whatsappLink("Hello El Greco, I can't open my booking pass. My reference is: ")}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-primary px-5 py-3 font-semibold text-primary-ink"
        >
          WhatsApp us
        </a>
        <Link href="/reservations" className="rounded-full px-5 py-3 font-semibold ring-1 ring-line">
          Make a booking
        </Link>
      </div>
    </div>
  );
}
