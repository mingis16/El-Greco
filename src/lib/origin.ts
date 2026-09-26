import { headers } from "next/headers";

/**
 * The public origin for absolute links (QR codes, calendar files). Prefers
 * NEXT_PUBLIC_SITE_URL so QR codes always point at the canonical domain.
 */
export async function requestOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
