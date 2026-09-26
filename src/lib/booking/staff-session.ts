import { cookies } from "next/headers";
import { STAFF_COOKIE, isValidStaffSession } from "@/lib/booking/security";

/** True when the current request carries a valid staff session cookie. */
export async function isStaffRequest() {
  const jar = await cookies();
  return isValidStaffSession(jar.get(STAFF_COOKIE)?.value);
}
