"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";

export function StaffLogin({ next, devHint }: { next: string; devHint: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Sign-in failed.");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm rounded-card bg-surface p-6 shadow-card ring-1 ring-line">
      <LockKeyhole aria-hidden className="size-8 text-primary-text" />
      <h1 className="mt-3 text-2xl font-bold">Staff sign-in</h1>
      <p className="mt-1 text-sm text-ink-muted">For El Greco team members only.</p>
      <label htmlFor="code" className="mt-5 block text-sm font-semibold">
        Access code
      </label>
      <input
        id="code"
        type="password"
        autoComplete="current-password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "code-error" : undefined}
        className="mt-2 h-12 w-full rounded-xl bg-background px-4 ring-1 ring-line focus:ring-2 focus:ring-mint-500 focus:outline-none"
      />
      {error && (
        <p id="code-error" role="alert" className="mt-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
      {devHint && (
        <p className="mt-3 rounded-lg bg-warning-50 p-2 text-xs text-warning-700">
          Development mode: the code is <span className="font-mono font-semibold">elgreco-staff</span> until STAFF_ACCESS_CODE is set.
        </p>
      )}
      <button
        type="submit"
        disabled={busy || !code}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-charcoal-900 px-5 py-3 font-semibold text-cream disabled:opacity-60"
      >
        {busy && <Loader2 aria-hidden className="size-4 animate-spin" />}
        Sign in
      </button>
    </form>
  );
}

export function StaffSignOut() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/staff/session", { method: "DELETE" });
        router.refresh();
      }}
      className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-line hover:ring-charcoal-400"
    >
      Sign out
    </button>
  );
}
