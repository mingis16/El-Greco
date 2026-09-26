"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type Action = { id: string; label: string };

const DESTRUCTIVE = new Set(["decline", "cancel", "no_show"]);
const PRIMARY = new Set(["check_in", "confirm"]);

export function StaffActions({
  bookingRef,
  actions,
  compact = false,
}: {
  bookingRef: string;
  actions: Action[];
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = async (action: Action) => {
    setBusy(action.id);
    setError(null);
    try {
      const res = await fetch(`/api/staff/bookings/${bookingRef}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action.id, note: note || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "That didn't work. Refresh and try again.");
      setConfirming(null);
      setNote("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!actions.length) return null;
  const size = compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={busy !== null}
            onClick={() => (DESTRUCTIVE.has(a.id) ? setConfirming(a) : run(a))}
            className={`inline-flex items-center gap-1.5 rounded-full font-semibold transition disabled:opacity-60 ${size} ${
              PRIMARY.has(a.id)
                ? "bg-primary text-primary-ink hover:bg-mint-300"
                : DESTRUCTIVE.has(a.id)
                  ? "text-danger-700 ring-1 ring-danger-700/30 hover:bg-danger-50"
                  : "ring-1 ring-line hover:ring-charcoal-400"
            }`}
          >
            {busy === a.id && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {a.label}
          </button>
        ))}
      </div>

      {confirming && (
        <div className="rounded-xl bg-danger-50 p-3 text-sm ring-1 ring-danger-700/20">
          <p className="font-semibold text-danger-700">
            {confirming.label} {bookingRef}?
          </p>
          <label htmlFor={`note-${bookingRef}`} className="mt-2 block text-xs text-ink-muted">
            Reason (saved in the booking history)
          </label>
          <input
            id={`note-${bookingRef}`}
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg bg-surface px-3 ring-1 ring-line"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => run(confirming)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-full bg-danger-700 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Yes, {confirming.label.toLowerCase()}
            </button>
            <button type="button" onClick={() => setConfirming(null)} className="rounded-full px-4 py-2 font-semibold ring-1 ring-line">
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
