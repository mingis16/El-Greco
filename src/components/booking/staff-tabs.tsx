import Link from "next/link";
import { StaffSignOut } from "@/components/booking/staff-login";

export function StaffTabs({ current }: { current: "bookings" | "orders" }) {
  const tab = (id: "bookings" | "orders", href: string, label: string) => (
    <Link
      href={href}
      aria-current={current === id ? "page" : undefined}
      className="rounded-full px-4 py-2 text-sm font-semibold text-ink-muted ring-1 ring-line hover:text-ink aria-[current=page]:bg-charcoal-900 aria-[current=page]:text-cream aria-[current=page]:ring-charcoal-900"
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <nav aria-label="Staff sections" className="flex gap-2">
        {tab("bookings", "/staff", "Bookings")}
        {tab("orders", "/staff/orders", "Orders")}
      </nav>
      <StaffSignOut />
    </div>
  );
}
