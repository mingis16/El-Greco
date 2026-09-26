"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { SETTLEMENT_METHODS, type PaymentStatus, type SettlementMethod } from "@/lib/ordering/config";

type Action = { id: string; label: string };

export function StaffOrderActions({
  orderRef,
  actions,
  paymentStatus,
  suggestedMethod,
  reportedReference,
  compact = false,
}: {
  orderRef: string;
  actions: Action[];
  paymentStatus: PaymentStatus;
  suggestedMethod: SettlementMethod;
  reportedReference: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [settledWith, setSettledWith] = useState<SettlementMethod>(suggestedMethod);
  const [reference, setReference] = useState(reportedReference ?? "");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const send = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(`/api/staff/orders/${orderRef}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? "That didn't work. Refresh and try again.");
      setPaying(false);
      setConfirmCancel(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const size = compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";
  const unpaid = paymentStatus === "unpaid" || paymentStatus === "pending_verification";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) =>
          a.id === "cancel" ? (
            <button key={a.id} type="button" disabled={busy !== null} onClick={() => setConfirmCancel(true)} className={`rounded-full font-semibold text-danger-700 ring-1 ring-danger-700/30 hover:bg-danger-50 disabled:opacity-60 ${size}`}>
              {a.label}
            </button>
          ) : (
            <button key={a.id} type="button" disabled={busy !== null} onClick={() => send(a.id, { action: a.id })} className={`inline-flex items-center gap-1.5 rounded-full bg-primary font-semibold text-primary-ink hover:bg-mint-300 disabled:opacity-60 ${size}`}>
              {busy === a.id && <Loader2 aria-hidden className="size-4 animate-spin" />}
              {a.label}
            </button>
          ),
        )}
        {unpaid && (
          <button type="button" disabled={busy !== null} onClick={() => setPaying((v) => !v)} className={`rounded-full bg-charcoal-900 font-semibold text-cream hover:bg-charcoal-700 disabled:opacity-60 ${size}`}>
            Mark paid
          </button>
        )}
        {paymentStatus === "pending_verification" && (
          <button type="button" disabled={busy !== null} onClick={() => send("reject", { action: "reject_payment", note: "Transfer not found" })} className={`rounded-full font-semibold text-warning-700 ring-1 ring-warning-700/30 hover:bg-warning-50 disabled:opacity-60 ${size}`}>
            Payment not found
          </button>
        )}
        {paymentStatus === "paid" && !compact && (
          <button type="button" disabled={busy !== null} onClick={() => send("refund", { action: "refund" })} className={`rounded-full font-semibold ring-1 ring-line hover:ring-charcoal-400 disabled:opacity-60 ${size}`}>
            Refund
          </button>
        )}
      </div>

      {paying && (
        <div className="grid gap-2 rounded-xl bg-background p-3 text-sm ring-1 ring-line sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-xs text-ink-muted">Received by</span>
            <select value={settledWith} onChange={(e) => setSettledWith(e.target.value as SettlementMethod)} className="mt-1 h-10 w-full rounded-lg bg-surface px-2 ring-1 ring-line">
              {SETTLEMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-ink-muted">Reference / transaction ID (optional)</span>
            <input value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} className="mt-1 h-10 w-full rounded-lg bg-surface px-3 font-mono uppercase ring-1 ring-line" />
          </label>
          <button type="button" disabled={busy !== null} onClick={() => send("pay", { action: "mark_paid", settledWith, reference })} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-success-700 px-4 font-semibold text-white disabled:opacity-60">
            {busy === "pay" && <Loader2 aria-hidden className="size-4 animate-spin" />}
            Confirm paid
          </button>
        </div>
      )}

      {confirmCancel && (
        <div className="rounded-xl bg-danger-50 p-3 text-sm ring-1 ring-danger-700/20">
          <p className="font-semibold text-danger-700">Cancel order {orderRef}?</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy !== null} onClick={() => send("cancel", { action: "cancel" })} className="rounded-full bg-danger-700 px-4 py-2 font-semibold text-white disabled:opacity-60">
              Yes, cancel
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)} className="rounded-full px-4 py-2 font-semibold ring-1 ring-line">
              Back
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
