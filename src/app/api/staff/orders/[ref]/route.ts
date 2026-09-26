import { z } from "zod";
import { normalizeRef } from "@/lib/booking/security";
import { isStaffRequest } from "@/lib/booking/staff-session";
import { isSameOrigin, json, jsonError, readJson } from "@/lib/http";
import { ORDER_STATUS_COPY, SETTLEMENT_METHODS, type SettlementMethod } from "@/lib/ordering/config";
import {
  ORDER_ACTIONS,
  applyOrderAction,
  markOrderPaid,
  refundOrder,
  rejectReportedPayment,
  type OrderAction,
} from "@/lib/ordering/service";
import { getOrderStore } from "@/lib/ordering/store";

const note = z.string().trim().max(300).optional();
const body = z.discriminatedUnion("action", [
  z.object({ action: z.enum(Object.keys(ORDER_ACTIONS) as [OrderAction, ...OrderAction[]]), note }),
  z.object({
    action: z.literal("mark_paid"),
    settledWith: z.enum(SETTLEMENT_METHODS.map((m) => m.id) as [SettlementMethod, ...SettlementMethod[]]),
    reference: z.string().trim().max(60).optional(),
  }),
  z.object({ action: z.literal("reject_payment"), note }),
  z.object({ action: z.literal("refund"), note }),
]);

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);
  if (!(await isStaffRequest())) return jsonError("Please sign in to the staff area again.", 401);

  const ref = normalizeRef((await params).ref, "OR");
  if (!ref) return jsonError("Invalid order reference.", 400);

  let parsed;
  try {
    parsed = body.safeParse(await readJson(request, 2000));
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (!parsed.success) return jsonError("Unknown action.", 400);

  const store = await getOrderStore();
  const order = await store.findByRef(ref);
  if (!order) return jsonError("Order not found.", 404);

  const input = parsed.data;
  const updated =
    input.action === "mark_paid"
      ? await markOrderPaid(order, input.settledWith, input.reference || null)
      : input.action === "reject_payment"
        ? await rejectReportedPayment(order, input.note || undefined)
        : input.action === "refund"
          ? await refundOrder(order, input.note || undefined)
          : await applyOrderAction(ref, input.action, input.note || undefined);

  if (!updated) {
    const current = await store.findByRef(ref);
    return jsonError(
      `That can't be done now: the order is "${ORDER_STATUS_COPY[current?.status ?? order.status].label}" and payment is "${(current ?? order).paymentStatus.replace("_", " ")}". Refresh to see the latest.`,
      409,
    );
  }
  return json({ ok: true, status: updated.status, paymentStatus: updated.paymentStatus });
}
