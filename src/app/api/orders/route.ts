import { after } from "next/server";
import { notifyStaffOfOrder } from "@/lib/booking/notify";
import { BookingConfigError } from "@/lib/booking/security";
import { BookingStoreUnavailableError } from "@/lib/booking/store";
import { isSameOrigin, json, jsonError, readJson } from "@/lib/http";
import { createOrder, type OrderErrorCode } from "@/lib/ordering/service";
import { clientIp } from "@/lib/rate-limit";

const STATUS_BY_CODE: Record<OrderErrorCode, number> = {
  validation: 400,
  rejected: 400,
  closed: 409,
  price_changed: 409,
  unavailable_items: 409,
  rate_limited: 429,
};

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);

  let body: unknown;
  try {
    body = await readJson(request, 40_000);
  } catch {
    return jsonError("Invalid request.", 400);
  }

  try {
    const result = await createOrder(body, { ip: clientIp(request.headers) });
    if (!result.ok) {
      const { ok, code, ...rest } = result;
      return json({ ok, code, ...rest }, STATUS_BY_CODE[code]);
    }
    if (result.created) {
      const order = result.order;
      const staffUrl = new URL(`/staff/orders/${order.ref}`, request.url).toString();
      after(() => notifyStaffOfOrder(order, staffUrl));
    }
    return json(
      { ok: true, ref: result.order.ref, orderNumber: result.order.orderNumber, receiptPath: result.receiptPath },
      result.created ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof BookingStoreUnavailableError || error instanceof BookingConfigError) {
      console.error(error.message);
      return jsonError("Online ordering is temporarily unavailable. Please order on WhatsApp.", 503);
    }
    console.error("Order failed", error);
    return jsonError("Something went wrong on our side. Your order was not placed. Please try again.", 500);
  }
}
