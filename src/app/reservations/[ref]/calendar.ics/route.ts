import type { NextRequest } from "next/server";
import { renderIcs } from "@/lib/booking/documents";
import { checkBookingToken, normalizeRef } from "@/lib/booking/security";
import { managePath } from "@/lib/booking/service";
import { getBookingStore } from "@/lib/booking/store";

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const ref = normalizeRef((await params).ref);
  const token = request.nextUrl.searchParams.get("t");
  if (!ref || !checkBookingToken("manage", ref, token)) {
    return new Response("This booking link isn't valid.", { status: 403 });
  }
  const booking = await (await getBookingStore()).findByRef(ref);
  if (!booking) return new Response("Booking not found.", { status: 404 });

  const manageUrl = new URL(managePath(ref), request.nextUrl.origin).toString();
  return new Response(renderIcs(booking, manageUrl), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="el-greco-${ref}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
