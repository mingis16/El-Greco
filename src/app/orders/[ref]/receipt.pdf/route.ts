import type { NextRequest } from "next/server";
import { checkBookingToken, hashIdentifier, normalizeRef } from "@/lib/booking/security";
import { renderReceiptPdf } from "@/lib/ordering/receipt-pdf";
import { orderVerifyPath } from "@/lib/ordering/service";
import { getOrderStore } from "@/lib/ordering/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const limit = await rateLimit(`receipt:${hashIdentifier(clientIp(request.headers))}`, 30, 600);
  if (!limit.ok) return new Response("Too many requests", { status: 429 });

  const ref = normalizeRef((await params).ref, "OR");
  const token = request.nextUrl.searchParams.get("t");
  if (!ref || !checkBookingToken("manage", ref, token)) {
    return new Response("This receipt link isn't valid.", { status: 403 });
  }
  const order = await (await getOrderStore()).findByRef(ref);
  if (!order) return new Response("Order not found.", { status: 404 });

  const origin = request.nextUrl.origin;
  const logoPng = await fetch(new URL("/brand/logo-white.png", origin))
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((b) => (b ? new Uint8Array(b) : null))
    .catch(() => null);

  const pdf = await renderReceiptPdf(order, { verifyUrl: new URL(orderVerifyPath(ref), origin).toString(), logoPng });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="el-greco-receipt-${ref}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
