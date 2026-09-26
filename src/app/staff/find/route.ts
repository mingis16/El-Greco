import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { normalizeRef } from "@/lib/booking/security";

/** Staff reference search: /staff/find?ref=eg7kq4m2xp -> /staff/bookings/EG-7KQ4-M2XP */
export function GET(request: NextRequest) {
  const ref = normalizeRef(request.nextUrl.searchParams.get("ref") ?? "");
  redirect(ref ? `/staff/bookings/${ref}` : "/staff?notfound=1");
}
