import { z } from "zod";
import { normalizePhone } from "@/lib/booking/phone";
import { normalizeRef } from "@/lib/booking/security";
import { FULFILMENT_OPTIONS, ORDER_RULES, PAYMENT_METHODS, type Fulfilment, type PaymentMethodId } from "@/lib/ordering/config";

const FULFILMENT_IDS = FULFILMENT_OPTIONS.map((f) => f.id) as [Fulfilment, ...Fulfilment[]];
const PAYMENT_IDS = PAYMENT_METHODS.map((m) => m.id) as [PaymentMethodId, ...PaymentMethodId[]];

const cleanText = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const optional = (max: number, label: string) =>
  z
    .string()
    .max(max * 2)
    .transform(cleanText)
    .refine((v) => v.length <= max, { error: `${label} must be ${max} characters or fewer.` })
    .optional()
    .transform((v) => (v ? v : null));

export const cartLineSchema = z.object({
  itemId: z.string().min(1).max(64),
  variantId: z.string().max(64).nullish(),
  addonOptionIds: z.array(z.string().max(64)).max(20).default([]),
  quantity: z.coerce.number().int().min(1).max(ORDER_RULES.maxQuantityPerLine),
  note: z.string().max(280).transform(cleanText).pipe(z.string().max(140, { error: "Item notes must be 140 characters or fewer." })).optional(),
});

/** Mobile money transaction IDs: letters, digits, dots and dashes. */
export const transactionIdSchema = z
  .string({ error: "Enter the transaction ID from your confirmation SMS." })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9.\-]{5,39}$/, { error: "Enter the transaction ID exactly as it appears in the SMS." });

export const orderRequestSchema = z
  .object({
    lines: z
      .array(cartLineSchema)
      .min(1, { error: "Your order is empty." })
      .max(ORDER_RULES.maxLines, { error: `Orders can have up to ${ORDER_RULES.maxLines} different items.` }),
    fulfilment: z.enum(FULFILMENT_IDS, { error: "Choose dine in or pickup." }),
    tableLabel: optional(20, "Table number"),
    bookingRef: z
      .string()
      .max(20)
      .optional()
      .transform((v, ctx) => {
        if (!v?.trim()) return null;
        const ref = normalizeRef(v);
        if (!ref) {
          ctx.addIssue({ code: "custom", message: "That booking reference doesn't look right (e.g. EG-7KQ4-M2XP)." });
          return z.NEVER;
        }
        return ref;
      }),
    pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
    name: z
      .string({ error: "Enter your name." })
      .max(160)
      .transform(cleanText)
      .pipe(
        z
          .string()
          .min(2, { error: "Enter your name." })
          .max(80, { error: "Name must be 80 characters or fewer." })
          .regex(/^[\p{L}\p{M}' .-]+$/u, { error: "Use letters only in your name." }),
      ),
    phone: z
      .string({ error: "Enter your phone number." })
      .max(40)
      .transform((value, ctx) => {
        const phone = normalizePhone(value);
        if (!phone) {
          ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 099 423 234 or +232 99 423 234." });
          return z.NEVER;
        }
        return phone;
      }),
    email: z
      .union([z.literal(""), z.email({ error: "Enter a valid email address, or leave it empty." })])
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null)),
    notes: optional(300, "Order notes"),
    paymentMethod: z.enum(PAYMENT_IDS, { error: "Choose how you'll pay." }),
    transactionId: z.string().max(80).optional(),
    /** Total the guest saw; if prices changed since, we ask them to review. */
    expectedTotal: z.coerce.number().nonnegative(),
    website: z.string().max(200).optional(),
    startedAt: z.coerce.number().int().positive(),
    idempotencyKey: z.uuid({ error: "Please reload the page and try again." }),
  })
  .superRefine((v, ctx) => {
    if (v.fulfilment === "dine_in" && !v.tableLabel && !v.bookingRef) {
      ctx.addIssue({ code: "custom", path: ["tableLabel"], message: "Enter your table number (it's on the table stand)." });
    }
    if (v.fulfilment === "pickup" && !v.pickupTime) {
      ctx.addIssue({ code: "custom", path: ["pickupTime"], message: "Choose a pickup time." });
    }
    const method = PAYMENT_METHODS.find((m) => m.id === v.paymentMethod);
    if (method?.mobileMoney && v.transactionId) {
      const parsed = transactionIdSchema.safeParse(v.transactionId);
      if (!parsed.success) ctx.addIssue({ code: "custom", path: ["transactionId"], message: parsed.error.issues[0].message });
    }
  });

export type OrderRequest = z.output<typeof orderRequestSchema>;
