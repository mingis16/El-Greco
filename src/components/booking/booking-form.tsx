"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  BOOKING_RULES,
  CELEBRANT_OCCASIONS,
  OCCASIONS,
  OCCASION_EXTRAS,
  SPACES,
  occasionLabel,
  resolveKind,
  spaceLabel,
  type OccasionId,
  type SpaceId,
} from "@/lib/booking/config";
import { normalizePhone } from "@/lib/booking/phone";
import { addDays, bookingWindow, formatDateLong, formatTime, toMinutes } from "@/lib/booking/time";
import type { Slot } from "@/lib/booking/types";
import { whatsappLink } from "@/lib/site";

type FieldErrors = Partial<Record<string, string[]>>;
type SlotsState = { key: string; slots: Slot[] | null; error: string | null };

const isOccasion = (v: string | null): v is OccasionId => OCCASIONS.some((o) => o.id === v);
const SELECTABLE = new Set(["available", "limited", "request"]);

const DAY_PARTS = [
  { label: "Morning", from: 0, to: 12 * 60 },
  { label: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { label: "Evening", from: 17 * 60, to: 24 * 60 },
];

export function BookingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const range = useMemo(() => bookingWindow(), []);

  const [occasion, setOccasion] = useState<OccasionId>(() => {
    const o = params.get("occasion");
    return isOccasion(o) ? o : "dining";
  });
  const [partySize, setPartySize] = useState(() => {
    const n = Number(params.get("party"));
    return Number.isInteger(n) && n >= 1 && n <= BOOKING_RULES.maxEventPartySize ? n : 2;
  });
  const [date, setDate] = useState(() => {
    const d = params.get("date");
    return d && d >= range.min && d <= range.max ? d : range.min;
  });
  const [time, setTime] = useState(params.get("time") ?? "");
  const [space, setSpace] = useState<SpaceId>("any");
  const [extras, setExtras] = useState<string[]>([]);
  const [celebrant, setCelebrant] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  const [slotsState, setSlotsState] = useState<SlotsState>({ key: "", slots: null, error: null });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ message: string; alternatives?: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reload, setReload] = useState(0);

  const startedAt = useRef(0);
  const idempotencyKey = useRef("");
  const bannerRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  useEffect(() => {
    startedAt.current = Date.now();
    idempotencyKey.current = crypto.randomUUID();
  }, []);

  const kind = resolveKind(occasion, space, partySize);
  const occasionKind = OCCASIONS.find((o) => o.id === occasion)?.kind ?? "table";
  const showEventSpaces = occasionKind === "event" || partySize > BOOKING_RULES.maxTablePartySize;
  const spaces = SPACES.filter((s) => showEventSpaces || !s.eventsOnly);
  const extrasForOccasion = OCCASION_EXTRAS[occasion];
  const instant = kind === "table" && partySize <= BOOKING_RULES.autoConfirmMaxParty;

  // Load live availability whenever the date, party or type of booking changes.
  const slotsKey = `${date}|${partySize}|${occasion}|${space}|${reload}`;
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ date, party: String(partySize), occasion, space });
    fetch(`/api/availability?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message ?? "Couldn't load times.");
        setSlotsState({ key: slotsKey, slots: body.slots as Slot[], error: null });
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setSlotsState({ key: slotsKey, slots: null, error: error.message || "Couldn't load times." });
      });
    return () => controller.abort();
  }, [slotsKey, date, partySize, occasion, space]);

  const slotsLoading = slotsState.key !== slotsKey;
  const slots = slotsLoading ? null : slotsState.slots;
  const visibleSlots = (slots ?? []).filter((s) => s.status !== "past");
  const selectedSlot = slots?.find((s) => s.time === time);
  const timeIsValid = Boolean(selectedSlot && SELECTABLE.has(selectedSlot.status));

  const changeOccasion = (next: OccasionId) => {
    setOccasion(next);
    setExtras([]);
    const nextEvent = OCCASIONS.find((o) => o.id === next)?.kind === "event";
    if (!nextEvent && SPACES.find((s) => s.id === space)?.eventsOnly && partySize <= BOOKING_RULES.maxTablePartySize) {
      setSpace("any");
    }
  };

  const changeParty = (next: number) => {
    const clamped = Math.min(BOOKING_RULES.maxEventPartySize, Math.max(1, Math.round(next) || 1));
    setPartySize(clamped);
    if (clamped <= BOOKING_RULES.maxTablePartySize && occasionKind === "table" && SPACES.find((s) => s.id === space)?.eventsOnly) {
      setSpace("any");
    }
  };

  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!timeIsValid) e.time = ["Choose an available time."];
    if (name.trim().length < 2) e.name = ["Enter your full name."];
    if (!normalizePhone(phone)) e.phone = ["Enter a valid phone number, e.g. 099 423 234 or +232 99 423 234."];
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = ["Enter a valid email address, or leave it empty."];
    if (!acceptPolicy) e.acceptPolicy = ["Please accept the booking policy to continue."];
    return e;
  }

  function showProblem(message: string, alternatives?: string[]) {
    setBanner({ message, alternatives });
    requestAnimationFrame(() => bannerRef.current?.focus());
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      showProblem("Please check the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion,
          space,
          date,
          time,
          partySize,
          name,
          phone,
          email,
          celebrant: CELEBRANT_OCCASIONS.includes(occasion) ? celebrant : "",
          extras,
          notes,
          acceptPolicy,
          website: honeypot,
          startedAt: startedAt.current,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.managePath) {
        try {
          localStorage.setItem("egk.lastBooking", JSON.stringify({ ref: body.ref, path: body.managePath }));
        } catch {
          // Storage unavailable: the pass page link is still shown after redirect.
        }
        router.push(`${body.managePath}&new=1`);
        return;
      }
      setErrors((body.fieldErrors as FieldErrors) ?? {});
      if (body.code === "full") setReload((n) => n + 1);
      showProblem(body.message ?? "Something went wrong. Please try again.", body.alternatives);
      setSubmitting(false);
    } catch {
      showProblem("We couldn't reach our booking system. Check your connection and try again. Your booking was not made.");
      setSubmitting(false);
    }
  }

  const summary = (
    <div className="space-y-3 text-sm">
      <SummaryRow icon={<CheckCircle2 className="size-4" />} label="Occasion" value={occasionLabel(occasion)} />
      <SummaryRow icon={<CalendarDays className="size-4" />} label="Date" value={formatDateLong(date)} />
      <SummaryRow icon={<Clock className="size-4" />} label="Time" value={timeIsValid ? formatTime(time) : "Choose a time"} muted={!timeIsValid} />
      <SummaryRow icon={<Users className="size-4" />} label="Guests" value={`${partySize} ${partySize === 1 ? "guest" : "guests"}`} />
      {space !== "any" && <SummaryRow icon={<CheckCircle2 className="size-4" />} label="Seating" value={spaceLabel(space)} />}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <form id={formId} onSubmit={onSubmit} noValidate className="space-y-6">
        {banner && (
          <div
            ref={bannerRef}
            tabIndex={-1}
            role="alert"
            className="rounded-card border border-danger-700/20 bg-danger-50 p-4 text-danger-700 outline-none"
          >
            <div className="flex gap-3">
              <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">{banner.message}</p>
                {banner.alternatives && banner.alternatives.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {banner.alternatives.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTime(t);
                          clearError("time");
                          setBanner(null);
                        }}
                        className="rounded-full bg-surface px-3 py-1.5 font-semibold text-ink ring-1 ring-danger-700/30 hover:ring-danger-700"
                      >
                        Book {formatTime(t)} instead
                      </button>
                    ))}
                  </div>
                )}
                <a
                  href={whatsappLink("Hello El Greco, I'd like help with a booking.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-medium underline underline-offset-4"
                >
                  Need help? WhatsApp us
                </a>
              </div>
            </div>
          </div>
        )}

        <Step number={1} title="What's the occasion?">
          <fieldset>
            <legend className="sr-only">Occasion</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {OCCASIONS.map((o) => (
                <label key={o.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="occasion"
                    value={o.id}
                    checked={occasion === o.id}
                    onChange={() => changeOccasion(o.id)}
                    className="peer sr-only"
                  />
                  <span className="flex h-full min-h-14 items-center rounded-xl bg-surface px-3 py-2.5 text-sm font-medium ring-1 ring-line transition peer-checked:bg-charcoal-900 peer-checked:text-cream peer-checked:ring-charcoal-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint-500 hover:ring-charcoal-400">
                    {o.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {occasionKind === "event" && (
            <Note>
              Events are confirmed personally. Send your request and our events team will contact you within 24 hours
              to agree the room, menu and any deposit.
            </Note>
          )}
        </Step>

        <Step number={2} title="Guests, date and time">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="party" className="text-sm font-semibold">
                Number of guests
              </label>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeParty(partySize - 1)}
                  disabled={partySize <= 1}
                  aria-label="One guest fewer"
                  className="grid size-12 place-items-center rounded-xl bg-surface ring-1 ring-line hover:ring-charcoal-400 disabled:opacity-40"
                >
                  <Minus className="size-5" />
                </button>
                <input
                  id="party"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={BOOKING_RULES.maxEventPartySize}
                  value={partySize}
                  onChange={(e) => changeParty(Number(e.target.value))}
                  className="h-12 w-20 rounded-xl bg-surface text-center text-lg font-semibold tabular-nums ring-1 ring-line focus:ring-2 focus:ring-mint-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => changeParty(partySize + 1)}
                  aria-label="One guest more"
                  className="grid size-12 place-items-center rounded-xl bg-surface ring-1 ring-line hover:ring-charcoal-400"
                >
                  <Plus className="size-5" />
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-muted">
                {partySize > BOOKING_RULES.maxTablePartySize
                  ? `Groups over ${BOOKING_RULES.maxTablePartySize} are handled as an event request.`
                  : instant
                    ? "Confirmed instantly when seats are free."
                    : "We'll confirm tables for groups this size personally."}
              </p>
            </div>

            <div>
              <label htmlFor="date" className="text-sm font-semibold">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                min={range.min}
                max={range.max}
                value={date}
                onChange={(e) => {
                  if (e.target.value) setDate(e.target.value);
                }}
                className="mt-2 h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-line focus:ring-2 focus:ring-mint-500 focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                {[
                  { label: "Today", value: range.min },
                  { label: "Tomorrow", value: addDays(range.min, 1) },
                ].map((d) => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setDate(d.value)}
                    aria-pressed={date === d.value}
                    className="rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-line aria-pressed:bg-mint-50 aria-pressed:text-mint-800 aria-pressed:ring-mint-300"
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <fieldset className="mt-6" aria-describedby={errors.time ? "time-error" : undefined}>
            <legend className="text-sm font-semibold">
              Time <span className="font-normal text-ink-muted">· {formatDateLong(date)}</span>
            </legend>
            {slotsLoading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted" role="status">
                <Loader2 aria-hidden className="size-4 animate-spin" /> Checking live availability…
              </p>
            ) : slotsState.error ? (
              <p className="mt-3 text-sm text-danger-700" role="alert">
                {slotsState.error}{" "}
                <button type="button" onClick={() => setReload((n) => n + 1)} className="font-semibold underline">
                  Try again
                </button>
              </p>
            ) : visibleSlots.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                No times left online for this date. Try another day or{" "}
                <a href={whatsappLink("Hello El Greco, do you have a table available?")} className="font-semibold text-primary-text underline">
                  WhatsApp us
                </a>
                .
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                {DAY_PARTS.map((part) => {
                  const inPart = visibleSlots.filter((s) => toMinutes(s.time) >= part.from && toMinutes(s.time) < part.to);
                  if (!inPart.length) return null;
                  return (
                    <div key={part.label}>
                      <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{part.label}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {inPart.map((slot) => {
                          const selectable = SELECTABLE.has(slot.status);
                          return (
                            <label key={slot.time} className={selectable ? "cursor-pointer" : "cursor-not-allowed"}>
                              <input
                                type="radio"
                                name="time"
                                value={slot.time}
                                checked={time === slot.time}
                                disabled={!selectable}
                                onChange={() => {
                                  setTime(slot.time);
                                  clearError("time");
                                }}
                                className="peer sr-only"
                              />
                              <span className="flex flex-col items-center rounded-xl bg-surface px-2 py-2 text-sm font-semibold tabular-nums ring-1 ring-line transition peer-checked:bg-mint-400 peer-checked:text-charcoal-900 peer-checked:ring-mint-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint-500 peer-disabled:bg-charcoal-50 peer-disabled:text-charcoal-300 peer-disabled:line-through hover:ring-charcoal-400">
                                {formatTime(slot.time)}
                                <span className="text-[0.65rem] font-medium no-underline opacity-80">
                                  {slot.status === "full" ? "Full" : slot.status === "limited" ? "Few left" : slot.status === "request" ? "Request" : "Available"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <FieldError id="time-error" messages={errors.time} />
          </fieldset>
        </Step>

        <Step number={3} title="Where would you like to sit?">
          <fieldset aria-describedby={errors.space ? "space-error" : undefined}>
            <legend className="sr-only">Seating preference</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {spaces.map((s) => (
                <label key={s.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="space"
                    value={s.id}
                    checked={space === s.id}
                    onChange={() => {
                      setSpace(s.id);
                      clearError("space");
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex h-full items-center rounded-xl bg-surface px-4 py-3 text-sm font-medium ring-1 ring-line transition peer-checked:bg-charcoal-900 peer-checked:text-cream peer-checked:ring-charcoal-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-mint-500 hover:ring-charcoal-400">
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted">We&apos;ll do our best to honour your preference; it isn&apos;t guaranteed until confirmed.</p>
            <FieldError id="space-error" messages={errors.space} />
          </fieldset>
        </Step>

        {(extrasForOccasion.length > 0 || CELEBRANT_OCCASIONS.includes(occasion)) && (
          <Step number={4} title="Make it special">
            {CELEBRANT_OCCASIONS.includes(occasion) && (
              <TextField
                id="celebrant"
                label={occasion === "anniversary" ? "Names to celebrate (optional)" : "Who are we celebrating? (optional)"}
                hint="For the cake, card or table sign."
                value={celebrant}
                onChange={setCelebrant}
                maxLength={60}
              />
            )}
            {extrasForOccasion.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold">Requests</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {extrasForOccasion.map((x) => (
                    <label key={x.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-3 text-sm ring-1 ring-line hover:ring-charcoal-400">
                      <input
                        type="checkbox"
                        checked={extras.includes(x.id)}
                        onChange={(e) =>
                          setExtras((prev) => (e.target.checked ? [...prev, x.id] : prev.filter((v) => v !== x.id)))
                        }
                        className="mt-0.5 size-4 accent-mint-600"
                      />
                      {x.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-muted">Some requests may carry a charge; we&apos;ll confirm before your visit.</p>
              </fieldset>
            )}
          </Step>
        )}

        <Step number={extrasForOccasion.length > 0 || CELEBRANT_OCCASIONS.includes(occasion) ? 5 : 4} title="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="name"
              label="Full name"
              autoComplete="name"
              value={name}
              onChange={(v) => {
                setName(v);
                clearError("name");
              }}
              errors={errors.name}
              required
              maxLength={80}
            />
            <TextField
              id="phone"
              label="Phone (WhatsApp)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="099 423 234"
              hint="We'll use this to confirm or reach you about your booking."
              value={phone}
              onChange={(v) => {
                setPhone(v);
                clearError("phone");
              }}
              errors={errors.phone}
              required
              maxLength={20}
            />
            <TextField
              id="email"
              label="Email (optional)"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(v) => {
                setEmail(v);
                clearError("email");
              }}
              errors={errors.email}
              maxLength={120}
            />
          </div>
          <div className="mt-4">
            <label htmlFor="notes" className="text-sm font-semibold">
              Special requests (optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, accessibility needs, arrival details…"
              className="mt-2 w-full rounded-xl bg-surface px-4 py-3 text-base ring-1 ring-line focus:ring-2 focus:ring-mint-500 focus:outline-none"
            />
            <p className="text-right text-xs text-ink-muted tabular-nums">{notes.length}/500</p>
          </div>

          {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <div className="mt-2 rounded-xl bg-wood-50 p-4 text-sm ring-1 ring-wood-100">
            <p className="font-semibold">Booking policy</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
              <li>Tables are held for {BOOKING_RULES.arrivalGraceMinutes} minutes after your booking time.</li>
              <li>You&apos;ll get a digital pass with a unique reference and QR code. Staff scan it at the door; edited or shared screenshots won&apos;t verify.</li>
              <li>You can cancel online from your pass until your booking time. Please tell us early if plans change.</li>
            </ul>
            <label className="mt-3 flex cursor-pointer items-start gap-3 font-medium">
              <input
                type="checkbox"
                checked={acceptPolicy}
                onChange={(e) => {
                  setAcceptPolicy(e.target.checked);
                  clearError("acceptPolicy");
                }}
                aria-invalid={Boolean(errors.acceptPolicy)}
                aria-describedby={errors.acceptPolicy ? "policy-error" : undefined}
                className="mt-0.5 size-4 accent-mint-600"
              />
              I agree to the booking policy
            </label>
            <FieldError id="policy-error" messages={errors.acceptPolicy} />
          </div>
        </Step>

        <div className="rounded-card bg-surface p-5 shadow-card ring-1 ring-line lg:hidden">
          {summary}
        </div>

        <SubmitButton submitting={submitting} kind={kind} />
      </form>

      <aside className="hidden lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:block">
        <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
          <div className="bg-charcoal-900 px-5 py-4 text-cream">
            <p className="eyebrow text-mint-400">Your booking</p>
          </div>
          <div className="p-5">
            {summary}
            <div className={`mt-5 rounded-xl p-3 text-sm ${instant ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"}`}>
              {instant
                ? "Instant confirmation when you submit, if the time is still free."
                : kind === "event"
                  ? "Event request: our team confirms personally within 24 hours."
                  : "Request: we'll confirm by phone or WhatsApp before your visit."}
            </div>
            <div className="mt-5">
              <SubmitButton submitting={submitting} kind={kind} form={formId} />
            </div>
          </div>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-ink-muted">
          <li className="flex gap-3">
            <QrCode aria-hidden className="size-5 shrink-0 text-primary-text" />
            A digital pass with a QR code that staff scan at the door.
          </li>
          <li className="flex gap-3">
            <ShieldCheck aria-hidden className="size-5 shrink-0 text-primary-text" />
            Every pass is checked live against our system, so fakes and edited copies are caught.
          </li>
        </ul>
      </aside>
    </div>
  );
}

function SubmitButton({ submitting, kind, form }: { submitting: boolean; kind: "table" | "event"; form?: string }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={submitting}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-primary-ink transition hover:bg-mint-300 disabled:cursor-wait disabled:opacity-70"
    >
      {submitting && <Loader2 aria-hidden className="size-5 animate-spin" />}
      {submitting ? "Securing your booking…" : kind === "event" ? "Send event request" : "Confirm booking"}
    </button>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-surface/60 p-5 ring-1 ring-line sm:p-6">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="grid size-8 place-items-center rounded-full bg-charcoal-900 text-sm text-mint-300">{number}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-xl bg-mint-50 p-3 text-sm text-mint-900 ring-1 ring-mint-100">{children}</p>;
}

function SummaryRow({ icon, label, value, muted }: { icon: ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-0.5 text-primary-text">
        {icon}
      </span>
      <div>
        <p className="text-xs text-ink-muted">{label}</p>
        <p className={muted ? "text-ink-muted" : "font-semibold"}>{value}</p>
      </div>
    </div>
  );
}

function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-danger-700">
      <AlertCircle aria-hidden className="size-4 shrink-0" />
      {messages[0]}
    </p>
  );
}

function TextField({
  id,
  label,
  hint,
  errors,
  onChange,
  ...input
}: {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  const describedBy = [hint && `${id}-hint`, errors?.length && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        {...input}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(errors?.length)}
        aria-describedby={describedBy}
        className="mt-2 h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-line placeholder:text-charcoal-300 focus:ring-2 focus:ring-mint-500 focus:outline-none aria-invalid:ring-2 aria-invalid:ring-danger-700"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} messages={errors} />
    </div>
  );
}
