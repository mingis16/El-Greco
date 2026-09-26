import type { NextRequest } from "next/server";
import { renderPassPdf } from "@/lib/booking/documents";
import { checkBookingToken, hashIdentifier, normalizeRef } from "@/lib/booking/security";
import { verifyPath } from "@/lib/booking/service";
import { getBookingStore } from "@/lib/booking/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const limit = await rateLimit(`pdf:${hashIdentifier(clientIp(request.headers))}`, 30, 600);
  if (!limit.ok) return new Response("Too many requests", { status: 429 });

  const ref = normalizeRef((await params).ref);
  const token = request.nextUrl.searchParams.get("t");
  if (!ref || !checkBookingToken("manage", ref, token)) {
    return new Response("This booking link isn't valid.", { status: 403 });
  }
  const booking = await (await getBookingStore()).findByRef(ref);
  if (!booking) return new Response("Booking not found.", { status: 404 });

  const origin = request.nextUrl.origin;
  // The logo is a public asset; fetching it keeps it out of the server bundle.
  const logoPng = await fetch(new URL("/brand/logo-white.png", origin))
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((b) => (b ? new Uint8Array(b) : null))
    .catch(() => null);

  const pdf = await renderPassPdf(booking, { verifyUrl: new URL(verifyPath(ref), origin).toString(), logoPng });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="el-greco-${ref}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
