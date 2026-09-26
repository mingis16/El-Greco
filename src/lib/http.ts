import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export function jsonError(message: string, status: number, extra: Record<string, unknown> = {}) {
  return json({ ok: false, message, ...extra }, status);
}

/**
 * Rejects cross-site requests to state-changing endpoints (CSRF): the
 * browser's Origin header must match the host that served the page.
 */
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads a JSON body, refusing anything unexpectedly large. */
export async function readJson(request: Request, maxBytes = 16_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Body too large");
  return JSON.parse(text);
}
