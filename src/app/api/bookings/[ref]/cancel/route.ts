import { checkBookingToken, hashIdentifier, normalizeRef } from "@/lib/booking/security";
import { cancelByGuest, guestCanCancel } from "@/lib/booking/service";
import { getBookingStore } from "@/lib/booking/store";
import { isSameOrigin, json, jsonError, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);

  const limit = await rateLimit(`cancel:${hashIdentifier(clientIp(request.headers))}`, 10, 600);
  if (!limit.ok) return jsonError("Too many attempts. Please wait a few minutes.", 429);

  const ref = normalizeRef((await params).ref);
  let token: unknown;
  try {
    token = ((await readJson(request, 1000)) as { token?: unknown }).token;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (!ref || typeof token !== "string" || !checkBookingToken("manage", ref, token)) {
    return jsonError("This booking link isn't valid.", 403);
  }

  const booking = await (await getBookingStore()).findByRef(ref);
  if (!booking) return jsonError("Booking not found.", 404);
  if (!guestCanCancel(booking)) {
    return jsonError("This booking can no longer be cancelled online. Please call or WhatsApp us.", 409);
  }

  const updated = await cancelByGuest(booking);
  if (!updated) return jsonError("This booking was just updated. Please refresh the page.", 409);
  return json({ ok: true, status: updated.status });
}
