import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, BadgeCheck, ShieldX } from "lucide-react";
import { StaffActions } from "@/components/booking/staff-actions";
import { StatusBadge } from "@/components/booking/status-badge";
import { STATUS_COPY, extraLabel, occasionLabel, spaceLabel } from "@/lib/booking/config";
import { formatPhone } from "@/lib/booking/phone";
import { OrderVerification } from "@/components/ordering/order-verification";
import { checkBookingToken, hashIdentifier, normalizeRef, refKind } from "@/lib/booking/security";
import { STAFF_ACTIONS, isForToday, staffActionsFor } from "@/lib/booking/service";
import { isStaffRequest } from "@/lib/booking/staff-session";
import { getBookingStore } from "@/lib/booking/store";
import { formatDateLong, formatTime, formatTimestamp } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Verify pass or receipt",
  robots: { index: false, follow: false },
};

export default function VerifyPage(props: PageProps<"/verify/[ref]">) {
  return (
    <section className="container-page py-10 sm:py-14">
      <Suspense fallback={<div className="mx-auto h-96 max-w-xl animate-pulse rounded-card bg-surface ring-1 ring-line" />}>
        <Verification {...props} />
      </Suspense>
    </section>
  );
}

async function Verification({ params, searchParams }: PageProps<"/verify/[ref]">) {
  const [{ ref: rawRef }, query, staff, h] = await Promise.all([params, searchParams, isStaffRequest(), headers()]);

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = await rateLimit(`verify:${hashIdentifier(ip)}`, 40, 600);
  if (!limit.ok && !staff) return <Result tone="danger" title="Too many checks" body="Please wait a few minutes and scan again." />;

  const token = typeof query.v === "string" ? query.v : null;
  if (refKind(rawRef) === "OR") return <OrderVerification rawRef={rawRef} token={token} staff={staff} />;

  const ref = normalizeRef(rawRef);
  const genuine = Boolean(ref && checkBookingToken("verify", ref, token));
  const booking = ref && (genuine || staff) ? await (await getBookingStore()).findByRef(ref) : null;

  if (!booking || (!genuine && !staff)) {
    return (
      <Result
        tone="danger"
        title="Not a valid El Greco pass"
        body="This code doesn't match any booking on our system. Do not accept it. Ask the guest for their booking reference and check it with the manager."
      />
    );
  }

  const warnings = passWarnings(booking);
  const admit = booking.status === "confirmed" || booking.status === "pending";
  const firstName = booking.guestName.split(" ")[0];
  const initial = booking.guestName.split(" ").slice(1).join(" ").charAt(0);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div
        className={`rounded-card p-6 text-center ring-1 ${
          admit ? "bg-success-50 text-success-700 ring-success-700/20" : "bg-danger-50 text-danger-700 ring-danger-700/20"
        }`}
      >
        {admit ? <BadgeCheck aria-hidden className="mx-auto size-12" /> : <ShieldX aria-hidden className="mx-auto size-12" />}
        <h1 className="mt-3 text-2xl font-bold">
          {genuine ? "Genuine El Greco booking" : "Booking found (reference lookup)"}
        </h1>
        <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-ink">{booking.ref}</p>
        <StatusBadge status={booking.status} className="mt-3" />
        <p className="mt-3 text-sm">{STATUS_COPY[booking.status].guest}</p>
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2 rounded-xl bg-warning-50 p-3 text-sm font-medium text-warning-700 ring-1 ring-warning-700/20">
              <AlertTriangle aria-hidden className="size-5 shrink-0" />
              {w}
            </li>
          ))}
        </ul>
      )}

      <dl className="grid gap-4 rounded-card bg-surface p-6 text-sm shadow-card ring-1 ring-line sm:grid-cols-2">
        <Item label="Name" value={staff ? booking.guestName : `${firstName}${initial ? ` ${initial}.` : ""}`} />
        <Item label="Guests" value={String(booking.partySize)} />
        <Item label="Date" value={formatDateLong(booking.date)} />
        <Item label="Time" value={formatTime(booking.time)} />
        {staff && (
          <>
            <Item label="Phone" value={formatPhone(booking.guestPhone)} />
            <Item label="Occasion" value={occasionLabel(booking.occasion)} />
            <Item label="Seating" value={spaceLabel(booking.space)} />
            {booking.celebrant && <Item label="Celebrating" value={booking.celebrant} />}
            {booking.extras.length > 0 && (
              <Item wide label="Requests" value={booking.extras.map((e) => extraLabel(booking.occasion, e)).join(", ")} />
            )}
            {booking.notes && <Item wide label="Notes" value={booking.notes} />}
          </>
        )}
      </dl>

      {staff ? (
        <div className="rounded-card bg-surface p-5 ring-1 ring-line">
          <p className="mb-3 text-sm font-semibold">Staff actions</p>
          <StaffActions
            bookingRef={booking.ref}
            actions={staffActionsFor(booking.status).map((id) => ({ id, label: STAFF_ACTIONS[id].label }))}
          />
          <Link href={`/staff/bookings/${booking.ref}`} className="mt-4 inline-block text-sm font-semibold text-primary-text underline-offset-4 hover:underline">
            Open full booking and history
          </Link>
        </div>
      ) : (
        <p className="text-center text-sm text-ink-muted">
          Staff: <Link href={`/staff?next=${encodeURIComponent(`/verify/${booking.ref}?v=${token}`)}`} className="font-semibold text-primary-text underline">sign in</Link>{" "}
          to see full details and check this guest in.
        </p>
      )}
    </div>
  );
}

function passWarnings(booking: Booking) {
  const warnings: string[] = [];
  if (!isForToday(booking)) warnings.push(`This booking is for ${formatDateLong(booking.date)}, not today.`);
  if (booking.status === "checked_in" && booking.checkedInAt) {
    warnings.push(`Already checked in at ${formatTimestamp(booking.checkedInAt)}. This pass has been used.`);
  }
  if (booking.status === "pending") warnings.push("Not confirmed yet. Check with the manager before seating.");
  if (["cancelled", "declined", "no_show"].includes(booking.status)) warnings.push("Do not admit on this pass.");
  return warnings;
}

function Item({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}

function Result({ tone, title, body }: { tone: "danger"; title: string; body: string }) {
  return (
    <div className={`mx-auto max-w-xl rounded-card p-8 text-center ring-1 ${tone === "danger" ? "bg-danger-50 text-danger-700 ring-danger-700/20" : ""}`}>
      <ShieldX aria-hidden className="mx-auto size-12" />
      <h1 className="mt-3 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm">{body}</p>
    </div>
  );
}
