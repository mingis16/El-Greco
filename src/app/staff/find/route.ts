import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { normalizeRef, refKind } from "@/lib/booking/security";

/** Staff reference search: EG-… opens the booking, OR-… opens the order. */
export function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("ref") ?? "";
  const kind = refKind(input);
  if (kind === "OR") redirect(`/staff/orders/${normalizeRef(input, "OR")}`);
  const ref = normalizeRef(input);
  redirect(ref ? `/staff/bookings/${ref}` : "/staff?notfound=1");
}
