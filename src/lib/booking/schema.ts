import { z } from "zod";
import {
  BOOKING_RULES,
  OCCASIONS,
  OCCASION_EXTRAS,
  SPACES,
  resolveKind,
  type OccasionId,
  type SpaceId,
} from "@/lib/booking/config";
import { normalizePhone } from "@/lib/booking/phone";

const OCCASION_IDS = OCCASIONS.map((o) => o.id) as [OccasionId, ...OccasionId[]];
const SPACE_IDS = SPACES.map((s) => s.id) as [SpaceId, ...SpaceId[]];

/** Collapses whitespace and drops characters we never want in stored text. */
const cleanText = (value: string) =>
  value
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max * 2)
    .transform(cleanText)
    .refine((v) => v.length <= max, { error: `${label} must be ${max} characters or fewer.` })
    .optional()
    .transform((v) => (v ? v : null));

export const bookingRequestSchema = z
  .object({
    occasion: z.enum(OCCASION_IDS, { error: "Choose an occasion." }),
    space: z.enum(SPACE_IDS, { error: "Choose where you'd like to sit." }),
    date: z.iso.date({ error: "Choose a valid date." }),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Choose a time." }),
    partySize: z.coerce
      .number({ error: "Enter the number of guests." })
      .int({ error: "Enter a whole number of guests." })
      .min(1, { error: "At least 1 guest." })
      .max(BOOKING_RULES.maxEventPartySize, {
        error: `For more than ${BOOKING_RULES.maxEventPartySize} guests, please call us.`,
      }),
    name: z
      .string({ error: "Enter your name." })
      .max(160)
      .transform(cleanText)
      .pipe(
        z
          .string()
          .min(2, { error: "Enter your full name." })
          .max(80, { error: "Name must be 80 characters or fewer." })
          .regex(/^[\p{L}\p{M}' .-]+$/u, { error: "Use letters only in your name." }),
      ),
    phone: z
      .string({ error: "Enter your phone number." })
      .max(40)
      .transform((value, ctx) => {
        const phone = normalizePhone(value);
        if (!phone) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a valid phone number, e.g. 099 423 234 or +232 99 423 234.",
          });
          return z.NEVER;
        }
        return phone;
      }),
    email: z
      .union([z.literal(""), z.email({ error: "Enter a valid email address, or leave it empty." })])
      .optional()
      .transform((v) => (v ? v.toLowerCase() : null)),
    celebrant: optionalText(60, "Name to celebrate"),
    extras: z.array(z.string().max(40)).max(10).default([]),
    notes: optionalText(500, "Special requests"),
    acceptPolicy: z.literal(true, { error: "Please accept the booking policy to continue." }),
    // Anti-automation fields. `website` is a hidden honeypot that people never fill.
    website: z.string().max(200).optional(),
    startedAt: z.coerce.number().int().positive(),
    idempotencyKey: z.uuid({ error: "Please reload the page and try again." }),
  })
  .superRefine((v, ctx) => {
    const space = SPACES.find((s) => s.id === v.space);
    // Event rooms are only for event occasions or parties too big for a table.
    if (space?.eventsOnly && resolveKind(v.occasion, "any", v.partySize) === "table") {
      ctx.addIssue({
        code: "custom",
        path: ["space"],
        message: `The ${space.label.toLowerCase()} is for events. Choose "Conference / corporate event" or "Private party" as the occasion.`,
      });
    }
    const allowed = new Set(OCCASION_EXTRAS[v.occasion].map((e) => e.id));
    if (v.extras.some((e) => !allowed.has(e))) {
      ctx.addIssue({ code: "custom", path: ["extras"], message: "One of the selected extras isn't available for this occasion." });
    }
  });

export type BookingRequest = z.output<typeof bookingRequestSchema>;
