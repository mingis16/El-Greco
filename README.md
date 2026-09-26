# El Greco Kafe - Resto

Website for El Greco Kafe - Resto, 63 Sir Samuel Lewis Road, Aberdeen, Freetown:
menu, online ordering with itemized digital receipts, table reservations and event
requests with verified booking passes, and a staff area for bookings and the kitchen.

Built with Next.js 16 (App Router, Cache Components), Tailwind CSS v4, TypeScript,
Zod and Supabase (PostgreSQL).

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values you have
npm run dev                  # http://localhost:3000
```

In development everything works without any keys: bookings are saved to
`.data/bookings.json`, and the staff access code is `elgreco-staff`.

> **Low-memory machines:** if `npm run build` crashes with "memory allocation failed"
> or "out of memory", build with webpack and a capped heap (Git Bash):
> `NODE_OPTIONS=--max-old-space-size=900 npx next build --webpack`

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home: hero, quick booking, occasions, spaces, menu highlights, visit |
| `/menu` | Full menu with search, section filters and "Add" to order |
| `/order` | Checkout: dine in (table number) or pickup, contact, payment method |
| `/orders/[ref]?t=…` | The guest's live receipt: order number, progress, items, payment, QR |
| `/reservations` | Booking form with live availability |
| `/reservations/[ref]?t=…` | The guest's private booking pass (QR, PDF, calendar, cancel) |
| `/events` | Events & private hire: conference room, event hall, terrace |
| `/verify/[ref]?v=…` | Opened by scanning a pass or receipt QR code; shows the live status |
| `/staff` | Staff sign-in, daily bookings, requests needing confirmation |
| `/staff/bookings/[ref]` | Full booking, history, actions and printable slip |
| `/staff/orders` | Kitchen board: New, Preparing, Ready, Done; takings and outstanding |
| `/staff/orders/[ref]` | Printable kitchen ticket, payment actions and history |

## How bookings prevent confusion and fraud

- **Live availability.** Seats are counted per time window (`BOOKING_RULES` in
  `src/lib/booking/config.ts`). In Supabase the check and insert run in one locked
  transaction, so two guests can't take the last seats.
- **Clear status.** Tables up to 6 guests are confirmed instantly. Larger groups and
  events are "Awaiting confirmation" until staff confirm, and the pass says so.
- **Unforgeable passes.** Each booking has a reference like `EG-7KQ4-M2XP`. Its
  links carry HMAC signatures made with `BOOKING_SIGNING_SECRET`:
  - the **manage** link (guest only) views and cancels the booking;
  - the **verify** link in the QR code only proves the pass is genuine and shows its
    live status, so a shared screenshot can't cancel anything.
- **Door checks.** Staff scan the QR. Fake or edited passes show "Not a valid pass".
  Used passes show when they were checked in. Wrong-day, pending and cancelled
  bookings show warnings. A second check-in is refused.
- **Audit trail.** Every change (booked, confirmed, checked in, cancelled…) is saved
  in the booking's history with a timestamp and who did it.
- **Spam and bot protection.** Zod validation on the server, a honeypot field, a
  minimum fill time, same-origin checks on every write, rate limits per IP and per
  phone number, and duplicate-booking detection for the same phone and time.
- **Staff alerts.** New bookings are emailed to `BOOKING_ADMIN_EMAIL` when
  `RESEND_API_KEY` is set (otherwise they are logged).

Online bookings run 8:00 am to 9:30 pm with 80 seats; groups over 12 become event
requests. These live in `BOOKING_RULES` (`src/lib/booking/config.ts`).

## Online ordering and receipts

- **Server-side prices.** The browser only sends item IDs, options and quantities.
  The server prices every line from the live menu; if the total the guest saw differs
  (tampering or a menu update), the order is refused and the real total shown.
- **Daily order numbers.** Each order gets `#001`, `#002`… for the day, assigned
  atomically, plus a unique reference like `OR-7KQ4-M2XP`.
- **Itemized receipt.** Lines with options, add-ons, notes and unit prices; subtotal,
  any service charge or tax (`ORDER_RULES`, both 0 by default); payment method, status,
  amount paid, balance due and reference; a downloadable PDF; and a QR stamp.
- **Payments.** "Pay at the restaurant" always; Orange Money / Afrimoney when their
  numbers are set. Guests enter the transaction ID; staff confirm it (or send it back
  as not found). Only staff can mark an order Paid, and double payments are refused.
- **Kitchen flow.** Received, Preparing, Ready, Served/collected. Scanning a receipt
  that was already handed over warns staff, and a second hand-over is refused.
- Ordering runs 8:00 am to 9:30 pm venue time; pickup starts 20 minutes out.

## Connecting Supabase

1. Create a project at <https://supabase.com>.
2. In the SQL editor, run `supabase/migrations/0001_bookings.sql`, then
   `supabase/migrations/0002_orders.sql`.
3. From Settings > API, copy the project URL and the `service_role` key into
   `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (in `.env.local` and on your host).

Production refuses to take bookings or orders without Supabase and
`BOOKING_SIGNING_SECRET`, and shows guests a "WhatsApp us" message instead.

## Menu data

The menu is imported from <https://oddmenu.com/p/el-greco-seaview>:

```bash
npm run menu:import
```

This rewrites `src/data/menu.generated.ts`. Prices, spelling and availability are kept
as published on oddmenu; names are title-cased for display.

## Photos and logo

`node scripts/prepare-photos.mjs` turns the raw photos in `assets/raw-photos/` into
optimized, clearly named images in `src/assets/photos/`, trims Instagram overlay icons,
builds the transparent logo files in `public/brand/` from `assets/brand/logo-source.jpg`,
and generates the app icons and social preview image. `src/lib/photos.ts` lists every
photo with its alt text.

The raw folder is private: it is git-ignored and outside `public/`, so only the
optimized copies are ever published. Keep a backup of it somewhere safe.

## Design tokens

Defined in `src/app/globals.css` and sampled from the logo and the venue:

| Token | Value | Source |
| --- | --- | --- |
| `mint-400` | `#4DDBC3` | Logo background |
| `charcoal-900` | `#1D1915` | Beams, pendant lamps, chairs |
| `wood-400` | `#CBA56B` | Honey-oak ceiling slats |
| `cream` | `#F5F3EE` | Stone floors and walls |

White text on mint fails contrast (1.7:1). Put charcoal text on mint, and use
`mint-700` for mint-coloured text on light backgrounds.
