import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { ACTIVE_STATUSES, type BookingStatus } from "@/lib/booking/config";
import { seatsTakenAt } from "@/lib/booking/availability";
import type { BookingStore, CapacityRule, InsertResult } from "@/lib/booking/store";
import { toMinutes } from "@/lib/booking/time";
import type { Booking, BookingEvent, NewBooking } from "@/lib/booking/types";

// Local-development store: one JSON file, with writes serialized in-process.
// Not safe for multiple server instances. Production uses Supabase.

const FILE = path.join(process.cwd(), ".data", "bookings.json");

export class FileBookingStore implements BookingStore {
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<Booking[]> {
    try {
      return JSON.parse(await readFile(FILE, "utf8")) as Booking[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(bookings: Booking[]) {
    await mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(bookings, null, 2), "utf8");
    await rename(tmp, FILE);
  }

  /** Runs read-modify-write operations one at a time. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async listForDate(date: string) {
    return (await this.read())
      .filter((b) => b.date === date)
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  }

  async listPending(fromDate: string) {
    return (await this.read())
      .filter((b) => b.status === "pending" && b.date >= fromDate)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }

  async findByRef(ref: string) {
    return (await this.read()).find((b) => b.ref === ref) ?? null;
  }

  async findByIdempotencyKey(key: string) {
    return (await this.read()).find((b) => b.idempotencyKey === key) ?? null;
  }

  async findActiveByPhone(phone: string, date: string) {
    return (await this.read()).filter(
      (b) => b.guestPhone === phone && b.date === date && ACTIVE_STATUSES.includes(b.status),
    );
  }

  insert(booking: NewBooking, capacity: CapacityRule | null): Promise<InsertResult> {
    return this.exclusive(async () => {
      const all = await this.read();
      if (all.some((b) => b.ref === booking.ref)) return { ok: false, reason: "duplicate_ref" };
      if (all.some((b) => b.idempotencyKey === booking.idempotencyKey)) {
        return { ok: false, reason: "duplicate_request" };
      }
      if (capacity) {
        const sameDay = all.filter((b) => b.date === booking.date);
        if (seatsTakenAt(booking.time, sameDay) + booking.partySize > capacity.seatCapacity) {
          return { ok: false, reason: "full" };
        }
      }
      const saved: Booking = { ...booking, id: randomUUID(), updatedAt: booking.createdAt, checkedInAt: null };
      all.push(saved);
      await this.write(all);
      return { ok: true, booking: saved };
    });
  }

  transition(ref: string, from: readonly BookingStatus[], to: BookingStatus, event: BookingEvent) {
    return this.exclusive(async () => {
      const all = await this.read();
      const booking = all.find((b) => b.ref === ref);
      if (!booking || !from.includes(booking.status)) return null;
      booking.status = to;
      booking.updatedAt = event.at;
      if (to === "checked_in") booking.checkedInAt = event.at;
      if (from.includes("checked_in") && to !== "checked_in") booking.checkedInAt = null;
      booking.history = [...booking.history, event];
      await this.write(all);
      return booking;
    });
  }
}
