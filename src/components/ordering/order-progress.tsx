"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Check } from "lucide-react";
import { ORDER_RULES, ORDER_STATUS_COPY, type OrderStatus } from "@/lib/ordering/config";

const STEPS: OrderStatus[] = ["received", "preparing", "ready", "completed"];

/** Live order tracker: refreshes the page's server data until the order is finished. */
export function OrderProgress({ status }: { status: OrderStatus }) {
  const router = useRouter();
  const live = status !== "completed" && status !== "cancelled";

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => router.refresh(), ORDER_RULES.trackerRefreshSeconds * 1000);
    return () => clearInterval(id);
  }, [live, router]);

  if (status === "cancelled") {
    return <p className="rounded-xl bg-danger-50 p-3 text-sm font-semibold text-danger-700">{ORDER_STATUS_COPY.cancelled.guest}</p>;
  }

  const current = STEPS.indexOf(status);
  return (
    <div>
      <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
        {STEPS.map((step, i) => {
          const done = i <= current;
          return (
            <li key={step} aria-current={i === current ? "step" : undefined} className="text-center">
              <span
                className={`mx-auto grid size-9 place-items-center rounded-full text-sm font-bold ${
                  done ? "bg-mint-400 text-charcoal-900" : "bg-charcoal-100 text-charcoal-400"
                } ${i === current && live ? "ring-4 ring-mint-200" : ""}`}
              >
                {i < current || status === "completed" ? <Check aria-hidden className="size-4" /> : i + 1}
              </span>
              <span className={`mt-1.5 block text-xs font-semibold ${done ? "text-ink" : "text-ink-muted"}`}>
                {ORDER_STATUS_COPY[step].label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-sm text-ink-muted" aria-live="polite">
        {ORDER_STATUS_COPY[status].guest}
        {live && " This page updates automatically."}
      </p>
    </div>
  );
}
