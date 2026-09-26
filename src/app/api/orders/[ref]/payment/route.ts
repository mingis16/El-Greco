import { checkBookingToken, hashIdentifier, normalizeRef } from "@/lib/booking/security";
import { isSameOrigin, json, jsonError, readJson } from "@/lib/http";
import { transactionIdSchema } from "@/lib/ordering/schema";
import { reportMobileMoneyPayment } from "@/lib/ordering/service";
import { getOrderStore } from "@/lib/ordering/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** Guest submits the transaction ID of a mobile money payment for staff to verify. */
export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);
  const limit = await rateLimit(`order-pay:${hashIdentifier(clientIp(request.headers))}`, 10, 600);
  if (!limit.ok) return jsonError("Too many attempts. Please wait a few minutes.", 429);

  const ref = normalizeRef((await params).ref, "OR");
  let body: { token?: unknown; transactionId?: unknown };
  try {
    body = (await readJson(request, 1000)) as typeof body;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (!ref || typeof body.token !== "string" || !checkBookingToken("manage", ref, body.token)) {
    return jsonError("This receipt link isn't valid.", 403);
  }
  const tx = transactionIdSchema.safeParse(body.transactionId);
  if (!tx.success) return jsonError(tx.error.issues[0].message, 400);

  const order = await (await getOrderStore()).findByRef(ref);
  if (!order) return jsonError("Order not found.", 404);
  if (order.status === "cancelled") return jsonError("This order was cancelled.", 409);

  const updated = await reportMobileMoneyPayment(order, tx.data);
  if (!updated) return jsonError("This order's payment has already been updated. Refresh the page.", 409);
  return json({ ok: true, paymentStatus: updated.paymentStatus });
}
