"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

/** Lets the guest add a mobile money transaction ID from the receipt page. */
export function PaymentReport({ orderRef, token, methodLabel, account, amount }: {
  orderRef: string;
  token: string;
  methodLabel: string;
  account: string | null;
  amount: string;
}) {
  const router = useRouter();
  const [transactionId, setTransactionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderRef}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, transactionId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Couldn't send. Please try again.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl bg-warning-50 p-4 text-sm ring-1 ring-warning-700/20 print:hidden">
      <p className="font-semibold text-warning-700">Paying by {methodLabel}?</p>
      <p className="mt-1 text-ink-muted">
        Send {amount}
        {account ? ` to ${account}` : ""}, then enter the transaction ID from your confirmation SMS. Staff check it and your
        receipt changes to Paid.
      </p>
      <label htmlFor="tx-id" className="sr-only">
        Transaction ID
      </label>
      <div className="mt-3 flex gap-2">
        <input
          id="tx-id"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          maxLength={40}
          placeholder="Transaction ID"
          required
          className="h-11 min-w-0 flex-1 rounded-xl bg-surface px-3 font-mono uppercase ring-1 ring-line focus:ring-2 focus:ring-mint-500 focus:outline-none"
        />
        <button type="submit" disabled={busy || transactionId.trim().length < 6} className="inline-flex items-center gap-2 rounded-xl bg-charcoal-900 px-4 font-semibold text-cream disabled:opacity-60">
          {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Send
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-medium text-danger-700">
          {error}
        </p>
      )}
    </form>
  );
}
