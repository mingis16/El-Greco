import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";

// Booking references avoid look-alike characters (0/O, 1/I/L) so they can be
// read over the phone. 31^8 ≈ 850 billion combinations.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
/** "EG" = table booking or event, "OR" = online order. */
export type RefPrefix = "EG" | "OR";
const refPattern = (prefix: RefPrefix) => new RegExp(`^${prefix}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$`);
export const REF_PATTERN = refPattern("EG");

export function generateRef(prefix: RefPrefix = "EG") {
  let code = "";
  for (let i = 0; i < 8; i++) code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `${prefix}-${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Accepts "eg7kq4m2xp", "EG 7KQ4 M2XP" etc. and returns the canonical ref, or null. */
export function normalizeRef(input: string, prefix: RefPrefix = "EG") {
  const compact = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const body = compact.startsWith(prefix) ? compact.slice(2) : compact;
  if (body.length !== 8) return null;
  const ref = `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
  return refPattern(prefix).test(ref) ? ref : null;
}

/** Which kind of reference this is, for pages that accept either. */
export function refKind(input: string): RefPrefix | null {
  const compact = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (compact.startsWith("OR") && normalizeRef(input, "OR")) return "OR";
  if (normalizeRef(input, "EG")) return "EG";
  return null;
}

export class BookingConfigError extends Error {}

const DEV_SECRET = "dev-only-booking-secret-do-not-use-in-production";

function signingSecret() {
  const secret = process.env.BOOKING_SIGNING_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  throw new BookingConfigError("BOOKING_SIGNING_SECRET must be set (32+ characters) in production.");
}

export function isSigningConfigured() {
  try {
    signingSecret();
    return true;
  } catch {
    return false;
  }
}

function hmac(message: string) {
  return createHmac("sha256", signingSecret()).update(message).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Two tokens per booking, derived from the server secret so nothing extra is
 * stored:
 *  - "manage": in the guest's private pass link; allows viewing and cancelling.
 *  - "verify": in the QR code; only proves the pass is genuine and shows its
 *    live status, so a shared screenshot can't be used to cancel.
 */
export type TokenPurpose = "manage" | "verify";

export function bookingToken(purpose: TokenPurpose, ref: string) {
  return hmac(`${purpose}:${ref}`).slice(0, 22);
}

export function checkBookingToken(purpose: TokenPurpose, ref: string, token: string | null | undefined) {
  if (!token) return false;
  try {
    return safeEqual(bookingToken(purpose, ref), token);
  } catch {
    return false;
  }
}

/** Salted hash used as a rate-limit key so raw IPs and phone numbers are never stored. */
export function hashIdentifier(value: string) {
  const salt = process.env.BOOKING_SIGNING_SECRET ?? "egk-rate-limit";
  return createHash("sha256").update(`${salt}|${value}`).digest("base64url").slice(0, 24);
}

// Staff sessions: "<expiresAtMs>.<hmac>" in an HttpOnly cookie.
export const STAFF_COOKIE = "egk_staff";
export const STAFF_SESSION_HOURS = 12;

export function createStaffSession(now = Date.now()) {
  const expires = now + STAFF_SESSION_HOURS * 3600_000;
  return { value: `${expires}.${hmac(`staff:${expires}`)}`, expires: new Date(expires) };
}

export function isValidStaffSession(value: string | undefined, now = Date.now()) {
  if (!value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < now) return false;
  try {
    return safeEqual(hmac(`staff:${expires}`), sig);
  } catch {
    return false;
  }
}

const DEV_STAFF_CODE = "elgreco-staff";

export function staffAccessCode() {
  const code = process.env.STAFF_ACCESS_CODE;
  if (code && code.length >= 8) return code;
  return process.env.NODE_ENV !== "production" ? DEV_STAFF_CODE : null;
}

export function checkStaffAccessCode(attempt: string) {
  const code = staffAccessCode();
  if (!code) return false;
  // Compare digests so the comparison is constant-time regardless of length.
  const a = createHash("sha256").update(attempt).digest();
  const b = createHash("sha256").update(code).digest();
  return timingSafeEqual(a, b);
}

export const usingDevStaffCode = () => !process.env.STAFF_ACCESS_CODE && process.env.NODE_ENV !== "production";
