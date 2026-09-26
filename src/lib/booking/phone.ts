/**
 * Normalizes a phone number to E.164. Accepts Sierra Leone numbers in local
 * form ("099 423 234", "99423234") and any international "+…"/"00…" number.
 * Returns null when it can't be a real number.
 */
export function normalizePhone(input: string): string | null {
  let n = input.replace(/[\s().-]/g, "");
  if (n.startsWith("00")) n = `+${n.slice(2)}`;
  if (/^0\d{8}$/.test(n)) n = `+232${n.slice(1)}`;
  else if (/^\d{8}$/.test(n)) n = `+232${n}`;
  if (!/^\+[1-9]\d{7,14}$/.test(n)) return null;
  // Sierra Leone numbers are +232 followed by exactly 8 digits.
  if (n.startsWith("+232") && n.length !== 12) return null;
  return n;
}

/** "+23299423234" -> "+232 •• ••• 234": enough for staff to confirm, not to copy. */
export function maskPhone(e164: string) {
  const last = e164.slice(-3);
  const country = e164.startsWith("+232") ? "+232" : e164.slice(0, 3);
  return `${country} •• ••• ${last}`;
}

/** "+23299423234" -> "+232 99 423 234" */
export function formatPhone(e164: string) {
  if (e164.startsWith("+232") && e164.length === 12) {
    return `+232 ${e164.slice(4, 6)} ${e164.slice(6, 9)} ${e164.slice(9)}`;
  }
  return e164;
}
