import { after } from "next/server";
import { notifyStaffOfBooking } from "@/lib/booking/notify";
import { BookingConfigError } from "@/lib/booking/security";
import { createBooking, type BookingErrorCode } from "@/lib/booking/service";
import { BookingStoreUnavailableError } from "@/lib/booking/store";
import { isSameOrigin, json, jsonError, readJson } from "@/lib/http";
import { clientIp } from "@/lib/rate-limit";

const STATUS_BY_CODE: Record<BookingErrorCode, number> = {
  validation: 400,
  rejected: 400,
  unavailable_time: 422,
  full: 409,
  duplicate: 409,
  rate_limited: 429,
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError("Invalid request.", 400);
  }

  try {
    const result = await createBooking(body, { ip: clientIp(request.headers) });
    if (!result.ok) {
      const { ok, code, ...rest } = result;
      return json({ ok, code, ...rest }, STATUS_BY_CODE[code]);
    }
    if (result.created) {
      const booking = result.booking;
      const staffUrl = new URL(`/staff/bookings/${booking.ref}`, request.url).toString();
      after(() => notifyStaffOfBooking(booking, staffUrl));
    }
    return json(
      {
        ok: true,
        ref: result.booking.ref,
        status: result.booking.status,
        kind: result.booking.kind,
        managePath: result.managePath,
      },
      result.created ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof BookingStoreUnavailableError || error instanceof BookingConfigError) {
      console.error(error.message);
      return jsonError("Online booking is temporarily unavailable. Please book on WhatsApp.", 503);
    }
    console.error("Booking failed", error);
    return jsonError("Something went wrong on our side. Your booking was not made. Please try again.", 500);
  }
}
