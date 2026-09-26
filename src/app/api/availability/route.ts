import type { NextRequest } from "next/server";
import { z } from "zod";
import { BOOKING_RULES, OCCASIONS, SPACES, resolveKind } from "@/lib/booking/config";
import { BookingConfigError, hashIdentifier } from "@/lib/booking/security";
import { getAvailability } from "@/lib/booking/service";
import { BookingStoreUnavailableError } from "@/lib/booking/store";
import { json, jsonError } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const query = z.object({
  date: z.iso.date(),
  party: z.coerce.number().int().min(1).max(BOOKING_RULES.maxEventPartySize),
  occasion: z.enum(OCCASIONS.map((o) => o.id) as [string, ...string[]]).default("dining"),
  space: z.enum(SPACES.map((s) => s.id) as [string, ...string[]]).default("any"),
});

export async function GET(request: NextRequest) {
  try {
    return await availability(request);
  } catch (error) {
    if (error instanceof BookingStoreUnavailableError || error instanceof BookingConfigError) {
      console.error(error.message);
      return jsonError("Online booking is temporarily unavailable. Please book on WhatsApp.", 503);
    }
    throw error;
  }
}

async function availability(request: NextRequest) {
  const limit = await rateLimit(`avail:${hashIdentifier(clientIp(request.headers))}`, 90, 60);
  if (!limit.ok) return jsonError("Too many requests. Please slow down.", 429);

  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return jsonError("Invalid date or party size.", 400);
  const { date, party, occasion, space } = parsed.data;

  const kind = resolveKind(
    occasion as (typeof OCCASIONS)[number]["id"],
    space as (typeof SPACES)[number]["id"],
    party,
  );
  const slots = await getAvailability(date, party, kind);
  return json({ ok: true, date, party, kind, slots });
}
