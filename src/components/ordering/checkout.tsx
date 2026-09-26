"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircle, Clock, Loader2, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { normalizePhone } from "@/lib/booking/phone";
import { formatTime } from "@/lib/booking/time";
import type { MenuCategory } from "@/lib/menu-types";
import { formatPrice } from "@/lib/menu-utils";
import { clearCart, removeFromCart, setCartQuantity, useCart } from "@/lib/ordering/cart";
import { FULFILMENT_OPTIONS, ORDER_RULES, type Fulfilment, type PaymentMethodId } from "@/lib/ordering/config";
import { isOrderingOpen, pickupTimes } from "@/lib/ordering/hours";
import { buildMenuIndex, orderTotals, priceLine } from "@/lib/ordering/pricing";
import { whatsappLink } from "@/lib/site";

type Method = { id: PaymentMethodId; label: string; mobileMoney: boolean; account: string | null };
type FieldErrors = Partial<Record<string, string[]>>;

export function Checkout({ categories, paymentMethods }: { categories: MenuCategory[]; paymentMethods: Method[] }) {
  const router = useRouter();
  const cart = useCart();
  const index = useMemo(() => buildMenuIndex(categories), [categories]);

  const [fulfilment, setFulfilment] = useState<Fulfilment>("dine_in");
  const [tableLabel, setTableLabel] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>(paymentMethods[0]?.id ?? "pay_at_restaurant");
  const [transactionId, setTransactionId] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [lineProblems, setLineProblems] = useState<Record<string, string>>({});
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [clock, setClock] = useState<{ open: boolean; times: string[] } | null>(null);

  const startedAt = useRef(0);
  const idempotencyKey = useRef("");
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
    idempotencyKey.current = crypto.randomUUID();
    const tick = () => setClock({ open: isOrderingOpen(), times: pickupTimes() });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const priced = cart.map((line) => ({ line, result: priceLine(index, line) }));
  const valid = priced.flatMap((p) => (p.result.ok ? [p.result.line] : []));
  const totals = orderTotals(valid);
  const method = paymentMethods.find((m) => m.id === paymentMethod);
  const hasInvalid = priced.some((p) => !p.result.ok) || Object.keys(lineProblems).length > 0;

  const clearError = (field: string) =>
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });

  function showProblem(message: string) {
    setBanner(message);
    requestAnimationFrame(() => bannerRef.current?.focus());
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (fulfilment === "dine_in" && !tableLabel.trim() && !bookingRef.trim()) e.tableLabel = ["Enter your table number (it's on the table stand)."];
    if (fulfilment === "pickup" && !pickupTime) e.pickupTime = ["Choose a pickup time."];
    if (name.trim().length < 2) e.name = ["Enter your name."];
    if (!normalizePhone(phone)) e.phone = ["Enter a valid phone number, e.g. 099 423 234."];
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = ["Enter a valid email address, or leave it empty."];
    if (method?.mobileMoney && transactionId && !/^[A-Za-z0-9][A-Za-z0-9.\-]{5,39}$/.test(transactionId.trim())) {
      e.transactionId = ["Enter the transaction ID exactly as it appears in the SMS."];
    }
    return e;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (hasInvalid) {
      showProblem("Please remove the items marked as unavailable first.");
      return;
    }
    const clientErrors = validate();
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      showProblem("Please check the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.map(({ itemId, variantId, addonOptionIds, quantity, note }) => ({ itemId, variantId, addonOptionIds, quantity, note })),
          fulfilment,
          tableLabel: fulfilment === "dine_in" ? tableLabel : "",
          bookingRef: fulfilment === "dine_in" ? bookingRef : "",
          pickupTime: fulfilment === "pickup" ? pickupTime : null,
          name,
          phone,
          email,
          notes,
          paymentMethod,
          transactionId: method?.mobileMoney ? transactionId : "",
          expectedTotal: serverTotal ?? totals.total,
          website: honeypot,
          startedAt: startedAt.current,
          idempotencyKey: idempotencyKey.current,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.receiptPath) {
        clearCart();
        router.push(`${body.receiptPath}&new=1`);
        return;
      }
      setErrors((body.fieldErrors as FieldErrors) ?? {});
      if (body.code === "unavailable_items" && Array.isArray(body.invalidLines)) {
        const problems: Record<string, string> = {};
        for (const { index: i, reason } of body.invalidLines as { index: number; reason: string }[]) {
          if (cart[i]) problems[cart[i].key] = reason;
        }
        setLineProblems(problems);
      }
      if (body.code === "price_changed" && typeof body.total === "number") setServerTotal(body.total);
      showProblem(body.message ?? "Something went wrong. Please try again.");
    } catch {
      showProblem("We couldn't reach the kitchen. Check your connection and try again. Your order was not placed.");
    }
    setSubmitting(false);
  }

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-lg rounded-card bg-surface p-8 text-center shadow-card ring-1 ring-line">
        <ShoppingBag aria-hidden className="mx-auto size-10 text-primary-text" />
        <h2 className="mt-3 text-xl font-semibold">Your order is empty</h2>
        <p className="mt-2 text-ink-muted">Add dishes and drinks from the menu, then come back here to check out.</p>
        <Link href="/menu" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-primary-ink">
          Browse the menu
        </Link>
      </div>
    );
  }

  const closed = clock !== null && !clock.open;

  return (
    <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div className="space-y-6">
        {banner && (
          <div ref={bannerRef} tabIndex={-1} role="alert" className="flex gap-3 rounded-card bg-danger-50 p-4 text-sm text-danger-700 ring-1 ring-danger-700/20 outline-none">
            <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">{banner}</p>
              {serverTotal !== null && (
                <p className="mt-1">
                  New total: <strong>{formatPrice(serverTotal)}</strong>. Press &ldquo;Place order&rdquo; again to confirm.
                </p>
              )}
            </div>
          </div>
        )}

        {closed && (
          <p className="flex gap-3 rounded-card bg-warning-50 p-4 text-sm font-medium text-warning-700 ring-1 ring-warning-700/20">
            <Clock aria-hidden className="size-5 shrink-0" />
            The kitchen takes online orders from {formatTime(ORDER_RULES.firstOrder)} to {formatTime(ORDER_RULES.lastOrder)}. Your
            order is saved here until then.
          </p>
        )}

        <Section title="Your order">
          <ul className="divide-y divide-line">
            {priced.map(({ line, result }) => {
              const problem = lineProblems[line.key] ?? (!result.ok ? result.reason : null);
              const entry = index.get(line.itemId);
              return (
                <li key={line.key} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {entry?.item.name ?? "Unavailable item"}
                      {result.ok && result.line.variantName && <span className="font-normal text-ink-muted"> · {result.line.variantName}</span>}
                    </p>
                    {result.ok && result.line.addons.length > 0 && (
                      <p className="text-sm text-ink-muted">{result.line.addons.map((a) => `+ ${a.name}`).join(", ")}</p>
                    )}
                    {line.note && <p className="text-sm text-ink-muted italic">&ldquo;{line.note}&rdquo;</p>}
                    {problem && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-danger-700">
                        <AlertCircle aria-hidden className="size-4" /> {problem}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-full ring-1 ring-line">
                        <button type="button" aria-label="One fewer" onClick={() => setCartQuantity(line.key, line.quantity - 1)} className="grid size-9 place-items-center rounded-full">
                          <Minus className="size-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label="One more"
                          disabled={line.quantity >= ORDER_RULES.maxQuantityPerLine}
                          onClick={() => setCartQuantity(line.key, line.quantity + 1)}
                          className="grid size-9 place-items-center rounded-full disabled:opacity-40"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeFromCart(line.key);
                          setLineProblems((p) => {
                            const next = { ...p };
                            delete next[line.key];
                            return next;
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-danger-700"
                      >
                        <Trash2 aria-hidden className="size-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">{result.ok ? formatPrice(result.line.lineTotal) : "-"}</p>
                </li>
              );
            })}
          </ul>
          <Link href="/menu" className="mt-4 inline-block text-sm font-semibold text-primary-text hover:underline">
            + Add more items
          </Link>
        </Section>

        <Section title="Dine in or pickup?">
          <div className="grid gap-2 sm:grid-cols-2">
            {FULFILMENT_OPTIONS.map((f) => (
              <label key={f.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-4 ring-1 ring-line has-[:checked]:bg-charcoal-900 has-[:checked]:text-cream has-[:checked]:ring-charcoal-900">
                <input type="radio" name="fulfilment" checked={fulfilment === f.id} onChange={() => setFulfilment(f.id)} className="mt-1 size-4 accent-mint-400" />
                <span>
                  <span className="block font-semibold">{f.label}</span>
                  <span className="text-sm opacity-80">{f.description}</span>
                </span>
              </label>
            ))}
          </div>
          {fulfilment === "dine_in" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="table" label="Table number" hint="Shown on the stand on your table." errors={errors.tableLabel}>
                <input id="table" value={tableLabel} maxLength={20} onChange={(e) => { setTableLabel(e.target.value); clearError("tableLabel"); }} className={inputClass} aria-invalid={Boolean(errors.tableLabel)} />
              </Field>
              <Field id="booking" label="Booking reference (optional)" hint="If you booked a table, e.g. EG-7KQ4-M2XP." errors={errors.bookingRef}>
                <input id="booking" value={bookingRef} maxLength={20} onChange={(e) => { setBookingRef(e.target.value); clearError("bookingRef"); clearError("tableLabel"); }} className={`${inputClass} font-mono uppercase`} aria-invalid={Boolean(errors.bookingRef)} />
              </Field>
            </div>
          ) : (
            <div className="mt-4 max-w-xs">
              <Field id="pickup" label="Pickup time (today)" errors={errors.pickupTime}>
                <select id="pickup" value={pickupTime} onChange={(e) => { setPickupTime(e.target.value); clearError("pickupTime"); }} className={inputClass} aria-invalid={Boolean(errors.pickupTime)}>
                  <option value="">Choose a time</option>
                  {(clock?.times ?? []).map((t) => (
                    <option key={t} value={t}>
                      {formatTime(t)}
                    </option>
                  ))}
                </select>
              </Field>
              {clock && clock.times.length === 0 && <p className="mt-2 text-sm text-ink-muted">No pickup times left today.</p>}
            </div>
          )}
        </Section>

        <Section title="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Name" errors={errors.name}>
              <input id="name" autoComplete="name" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); clearError("name"); }} className={inputClass} aria-invalid={Boolean(errors.name)} />
            </Field>
            <Field id="phone" label="Phone (WhatsApp)" hint="We'll call if there's a question about your order." errors={errors.phone}>
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="099 423 234" value={phone} maxLength={20} onChange={(e) => { setPhone(e.target.value); clearError("phone"); }} className={inputClass} aria-invalid={Boolean(errors.phone)} />
            </Field>
            <Field id="email" label="Email for your receipt (optional)" errors={errors.email}>
              <input id="email" type="email" autoComplete="email" value={email} maxLength={120} onChange={(e) => { setEmail(e.target.value); clearError("email"); }} className={inputClass} aria-invalid={Boolean(errors.email)} />
            </Field>
            <Field id="notes" label="Order notes (optional)" errors={errors.notes}>
              <input id="notes" value={notes} maxLength={300} placeholder="Allergies, cutlery, timing…" onChange={(e) => setNotes(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="company">Company</label>
            <input id="company" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </div>
        </Section>

        <Section title="Payment">
          <div className="grid gap-2">
            {paymentMethods.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-4 ring-1 ring-line has-[:checked]:ring-2 has-[:checked]:ring-mint-500">
                <input type="radio" name="payment" checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="mt-1 size-4 accent-mint-600" />
                <span className="text-sm">
                  <span className="block font-semibold">{m.label}</span>
                  <span className="text-ink-muted">
                    {m.mobileMoney
                      ? `Send ${formatPrice(serverTotal ?? totals.total)} to ${m.account}, then enter the transaction ID from the SMS. Staff confirm it before your receipt shows Paid.`
                      : "Pay by cash, card or mobile money when you're served or collect. Your receipt updates to Paid at the till."}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {method?.mobileMoney && (
            <div className="mt-4 max-w-sm">
              <Field id="tx" label="Transaction ID (you can also add it later)" errors={errors.transactionId}>
                <input id="tx" value={transactionId} maxLength={40} onChange={(e) => { setTransactionId(e.target.value); clearError("transactionId"); }} className={`${inputClass} font-mono uppercase`} aria-invalid={Boolean(errors.transactionId)} />
              </Field>
            </div>
          )}
        </Section>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
        <div className="overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
          <div className="bg-charcoal-900 px-5 py-4 text-cream">
            <p className="eyebrow text-mint-400">Order summary</p>
          </div>
          <dl className="space-y-2 p-5 text-sm">
            <Row label={`Items (${valid.reduce((n, l) => n + l.quantity, 0)})`} value={formatPrice(totals.subtotal)} />
            {totals.serviceCharge > 0 && <Row label="Service charge" value={formatPrice(totals.serviceCharge)} />}
            {totals.tax > 0 && <Row label="Tax" value={formatPrice(totals.tax)} />}
            <div className="flex items-center justify-between border-t border-line pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(serverTotal ?? totals.total)}</dd>
            </div>
          </dl>
          <div className="px-5 pb-5">
            <button
              type="submit"
              disabled={submitting || closed || hasInvalid}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 font-semibold text-primary-ink transition hover:bg-mint-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 aria-hidden className="size-5 animate-spin" />}
              {submitting ? "Sending to the kitchen…" : `Place order · ${formatPrice(serverTotal ?? totals.total)}`}
            </button>
            <p className="mt-3 flex gap-2 text-xs text-ink-muted">
              <ShieldCheck aria-hidden className="size-4 shrink-0 text-primary-text" />
              You&apos;ll get an itemized digital receipt with an order number and a QR code staff scan to confirm it&apos;s yours.
            </p>
            <a href={whatsappLink("Hello El Greco, I have a question about ordering.")} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs font-semibold text-primary-text underline-offset-4 hover:underline">
              Questions? WhatsApp us
            </a>
          </div>
        </div>
      </aside>
    </form>
  );
}

const inputClass =
  "mt-2 h-12 w-full rounded-xl bg-surface px-4 text-base ring-1 ring-line placeholder:text-charcoal-300 focus:ring-2 focus:ring-mint-500 focus:outline-none aria-invalid:ring-2 aria-invalid:ring-danger-700";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card bg-surface/60 p-5 ring-1 ring-line sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, errors, children }: { id: string; label: string; hint?: string; errors?: string[]; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
      {errors?.[0] && (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger-700">
          <AlertCircle aria-hidden className="size-4 shrink-0" /> {errors[0]}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
