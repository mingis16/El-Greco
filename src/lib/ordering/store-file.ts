import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OrderStatus, PaymentStatus } from "@/lib/ordering/config";
import type { OrderInsertResult, OrderStore, PaymentUpdate } from "@/lib/ordering/store";
import type { NewOrder, Order, OrderEvent } from "@/lib/ordering/types";

// Local-development store: one JSON file, writes serialized in-process.

const FILE = path.join(process.cwd(), ".data", "orders.json");

export class FileOrderStore implements OrderStore {
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<Order[]> {
    try {
      return JSON.parse(await readFile(FILE, "utf8")) as Order[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(orders: Order[]) {
    await mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(orders, null, 2), "utf8");
    await rename(tmp, FILE);
  }

  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async listForDate(date: string) {
    return (await this.read()).filter((o) => o.orderDate === date).sort((a, b) => a.orderNumber - b.orderNumber);
  }

  async findByRef(ref: string) {
    return (await this.read()).find((o) => o.ref === ref) ?? null;
  }

  async findByIdempotencyKey(key: string) {
    return (await this.read()).find((o) => o.idempotencyKey === key) ?? null;
  }

  insert(order: NewOrder): Promise<OrderInsertResult> {
    return this.exclusive(async () => {
      const all = await this.read();
      if (all.some((o) => o.ref === order.ref)) return { ok: false, reason: "duplicate_ref" };
      if (all.some((o) => o.idempotencyKey === order.idempotencyKey)) return { ok: false, reason: "duplicate_request" };
      const orderNumber = Math.max(0, ...all.filter((o) => o.orderDate === order.orderDate).map((o) => o.orderNumber)) + 1;
      const saved: Order = { ...order, id: randomUUID(), orderNumber, updatedAt: order.createdAt };
      all.push(saved);
      await this.write(all);
      return { ok: true, order: saved };
    });
  }

  transition(ref: string, from: readonly OrderStatus[], to: OrderStatus, event: OrderEvent) {
    return this.exclusive(async () => {
      const all = await this.read();
      const order = all.find((o) => o.ref === ref);
      if (!order || !from.includes(order.status)) return null;
      order.status = to;
      order.updatedAt = event.at;
      order.history = [...order.history, event];
      await this.write(all);
      return order;
    });
  }

  updatePayment(ref: string, from: readonly PaymentStatus[], update: PaymentUpdate, event: OrderEvent) {
    return this.exclusive(async () => {
      const all = await this.read();
      const order = all.find((o) => o.ref === ref);
      if (!order || !from.includes(order.paymentStatus)) return null;
      Object.assign(order, {
        paymentStatus: update.paymentStatus,
        ...(update.paymentReference !== undefined && { paymentReference: update.paymentReference }),
        ...(update.settledWith !== undefined && { settledWith: update.settledWith }),
        ...(update.amountPaid !== undefined && { amountPaid: update.amountPaid }),
        ...(update.paidAt !== undefined && { paidAt: update.paidAt }),
      });
      order.updatedAt = event.at;
      order.history = [...order.history, event];
      await this.write(all);
      return order;
    });
  }
}
