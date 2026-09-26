import { ORDER_RULES } from "@/lib/ordering/config";
import { fromMinutes, toMinutes, venueNow } from "@/lib/booking/time";

/** Is the kitchen taking online orders right now (venue time)? */
export function isOrderingOpen(now = new Date()) {
  const { minutes } = venueNow(now);
  return minutes >= toMinutes(ORDER_RULES.firstOrder) && minutes <= toMinutes(ORDER_RULES.lastOrder);
}

/** Today's pickup times, from the lead time until last orders, on a 15-minute grid. */
export function pickupTimes(now = new Date()) {
  const { minutes } = venueNow(now);
  const step = ORDER_RULES.pickupSlotMinutes;
  const earliest = Math.max(minutes + ORDER_RULES.pickupLeadMinutes, toMinutes(ORDER_RULES.firstOrder));
  const times: string[] = [];
  for (let t = Math.ceil(earliest / step) * step; t <= toMinutes(ORDER_RULES.lastOrder); t += step) {
    times.push(fromMinutes(t));
  }
  return times;
}
