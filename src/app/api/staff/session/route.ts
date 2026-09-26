import { cookies } from "next/headers";
import {
  STAFF_COOKIE,
  checkStaffAccessCode,
  createStaffSession,
  hashIdentifier,
  staffAccessCode,
} from "@/lib/booking/security";
import { isSameOrigin, json, jsonError, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);
  if (!staffAccessCode()) return jsonError("Staff access isn't configured (STAFF_ACCESS_CODE).", 503);

  const limit = await rateLimit(`staff-login:${hashIdentifier(clientIp(request.headers))}`, 5, 900);
  if (!limit.ok) {
    return jsonError(`Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`, 429);
  }

  let code: unknown;
  try {
    code = ((await readJson(request, 500)) as { code?: unknown }).code;
  } catch {
    return jsonError("Invalid request.", 400);
  }
  if (typeof code !== "string" || !checkStaffAccessCode(code.trim())) {
    return jsonError("That access code isn't right.", 401);
  }

  const session = createStaffSession();
  (await cookies()).set(STAFF_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expires,
  });
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site requests are not allowed.", 403);
  (await cookies()).delete(STAFF_COOKIE);
  return json({ ok: true });
}
