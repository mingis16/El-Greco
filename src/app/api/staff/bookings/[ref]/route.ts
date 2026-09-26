import { z } from "zod";
import { normalizeRef } from "@/lib/booking/security";
import { STAFF_ACTIONS, applyStaffAction, type StaffAction } from "@/lib/booking/service";
import { isStaffRequest } from "@/lib/booking/staff-session";
import { getBookingStore } from "@/lib/booking/store";
import { isSameOrigin, json, jsonError, readJson } from "@/lib/http";

const body = z.object({
  action: z.enum(Object.keys(STAFF_ACTIONS) as [StaffAction, ...StaffAction[]]),
  note: z.string().trim().max(300).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);
  if (!(await isStaffRequest())) return jsonError("Please sign in to the staff area again.", 401);

  const ref = normalizeRef((await params).ref);
  if (!ref) return jsonError("Invalid booking reference.", 400);

  let parsed;
  try {
    parsed = body.safeParse(await readJson(request, 2000));
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (!parsed.success) return jsonError("Unknown action.", 400);

  const updated = await applyStaffAction(ref, parsed.data.action, parsed.data.note || undefined);
  if (!updated) {
    const current = await (await getBookingStore()).findByRef(ref);
    if (!current) return jsonError("Booking not found.", 404);
    return jsonError(
      `Can't ${STAFF_ACTIONS[parsed.data.action].label.toLowerCase()}: this booking is now "${current.status.replace("_", " ")}". Refresh to see the latest.`,
      409,
    );
  }
  return json({ ok: true, status: updated.status });
}
