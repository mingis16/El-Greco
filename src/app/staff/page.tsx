import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Phone, Search } from "lucide-react";
import { StaffActions } from "@/components/booking/staff-actions";
import { StaffLogin, StaffSignOut } from "@/components/booking/staff-login";
import { StatusBadge } from "@/components/booking/status-badge";
import { ACTIVE_STATUSES, occasionLabel, spaceLabel } from "@/lib/booking/config";
import { formatPhone } from "@/lib/booking/phone";
import { usingDevStaffCode } from "@/lib/booking/security";
import { STAFF_ACTIONS, staffActionsFor } from "@/lib/booking/service";
import { isStaffRequest } from "@/lib/booking/staff-session";
import { getBookingStore } from "@/lib/booking/store";
import { addDays, formatDateLong, formatDateShort, formatTime, venueNow } from "@/lib/booking/time";
import type { Booking } from "@/lib/booking/types";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

export default function StaffPage(props: PageProps<"/staff">) {
  return (
    <section className="container-page py-10 sm:py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card bg-surface ring-1 ring-line" />}>
        <StaffArea {...props} />
      </Suspense>
    </section>
  );
}

async function StaffArea({ searchParams }: PageProps<"/staff">) {
  const [query, staff] = await Promise.all([searchParams, isStaffRequest()]);
  const next = typeof query.next === "string" && query.next.startsWith("/") && !query.next.startsWith("//") ? query.next : "/staff";
  if (!staff) return <StaffLogin next={next} devHint={usingDevStaffCode()} />;

  const today = venueNow().date;
  const date = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : today;
  const store = await getBookingStore();
  const [day, pending] = await Promise.all([store.listForDate(date), store.listPending(today)]);

  const active = day.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const stats = [
    { label: "Bookings", value: active.length },
    { label: "Guests", value: active.reduce((n, b) => n + b.partySize, 0) },
    { label: "Awaiting confirmation", value: day.filter((b) => b.status === "pending").length },
    { label: "Checked in", value: day.filter((b) => b.status === "checked_in").length },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary-text">Staff area</p>
          <h1 className="mt-1 text-3xl font-bold">Bookings</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action="/staff/find" className="flex items-center gap-2">
            <label htmlFor="find" className="sr-only">
              Find by booking reference
            </label>
            <input
              id="find"
              name="ref"
              placeholder="EG-XXXX-XXXX"
              autoComplete="off"
              className="h-10 w-40 rounded-full bg-surface px-4 font-mono text-sm uppercase ring-1 ring-line focus:ring-2 focus:ring-mint-500 focus:outline-none"
            />
            <button type="submit" aria-label="Find booking" className="grid size-10 place-items-center rounded-full bg-charcoal-900 text-cream">
              <Search className="size-4" />
            </button>
          </form>
          <StaffSignOut />
        </div>
      </div>

      {pending.length > 0 && (
        <section aria-labelledby="pending-heading" className="rounded-card bg-warning-50 p-5 ring-1 ring-warning-700/20">
          <h2 id="pending-heading" className="font-semibold text-warning-700">
            {pending.length} {pending.length === 1 ? "request needs" : "requests need"} confirmation
          </h2>
          <ul className="mt-4 space-y-3">
            {pending.map((b) => (
              <li key={b.id} className="flex flex-col gap-3 rounded-xl bg-surface p-4 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <Link href={`/staff/bookings/${b.ref}`} className="font-mono font-semibold text-primary-text hover:underline">
                    {b.ref}
                  </Link>
                  <p className="font-semibold">
                    {formatDateShort(b.date)} · {formatTime(b.time)} · {b.partySize} guests · {occasionLabel(b.occasion)}
                  </p>
                  <p className="text-ink-muted">
                    {b.guestName} · <a href={`tel:${b.guestPhone}`} className="underline">{formatPhone(b.guestPhone)}</a>
                  </p>
                </div>
                <StaffActions compact bookingRef={b.ref} actions={actionList(b)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="day-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="day-heading" className="text-xl font-semibold">
            {date === today ? "Today, " : ""}
            {formatDateLong(date)}
          </h2>
          <nav aria-label="Change date" className="flex items-center gap-1">
            <Link href={`/staff?date=${addDays(date, -1)}`} aria-label="Previous day" className="grid size-10 place-items-center rounded-full ring-1 ring-line hover:ring-charcoal-400">
              <ChevronLeft className="size-5" />
            </Link>
            <Link href="/staff" className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-charcoal-400">
              Today
            </Link>
            <Link href={`/staff?date=${addDays(date, 1)}`} aria-label="Next day" className="grid size-10 place-items-center rounded-full ring-1 ring-line hover:ring-charcoal-400">
              <ChevronRight className="size-5" />
            </Link>
          </nav>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-card bg-surface p-4 ring-1 ring-line">
              <dt className="text-xs text-ink-muted">{s.label}</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>

        {day.length === 0 ? (
          <p className="mt-6 rounded-card bg-surface p-8 text-center text-ink-muted ring-1 ring-line">No bookings for this day yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {day.map((b) => (
              <li key={b.id} className="grid gap-3 rounded-card bg-surface p-4 ring-1 ring-line md:grid-cols-[5rem_1fr_auto] md:items-center">
                <p className="font-display text-xl font-bold tabular-nums">{formatTime(b.time)}</p>
                <div className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/staff/bookings/${b.ref}`} className="font-mono font-semibold text-primary-text hover:underline">
                      {b.ref}
                    </Link>
                    <StatusBadge status={b.status} />
                    {b.kind === "event" && <span className="rounded-full bg-wood-100 px-2 py-0.5 text-xs font-semibold text-wood-800">Event</span>}
                  </div>
                  <p className="mt-1 font-semibold">
                    {b.guestName} · {b.partySize} {b.partySize === 1 ? "guest" : "guests"}
                  </p>
                  <p className="text-ink-muted">
                    {occasionLabel(b.occasion)} · {spaceLabel(b.space)}
                    {b.notes ? ` · “${b.notes}”` : ""}
                  </p>
                  <a href={`tel:${b.guestPhone}`} className="mt-1 inline-flex items-center gap-1 text-ink-muted hover:text-ink">
                    <Phone aria-hidden className="size-3.5" /> {formatPhone(b.guestPhone)}
                  </a>
                </div>
                <StaffActions compact bookingRef={b.ref} actions={actionList(b)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function actionList(b: Booking) {
  return staffActionsFor(b.status)
    .filter((id) => id !== "reopen" && id !== "undo_check_in")
    .map((id) => ({ id, label: STAFF_ACTIONS[id].label }));
}
