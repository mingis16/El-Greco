-- Online orders for El Greco Kafe - Resto.
-- Run after 0001_bookings.sql. The app uses the service-role key only; RLS blocks everyone else.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (ref ~ '^OR-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$'),
  order_number int not null check (order_number > 0),
  order_date date not null,
  status text not null default 'received'
    check (status in ('received', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending_verification', 'paid', 'refunded')),
  payment_method text not null check (payment_method in ('pay_at_restaurant', 'orange_money', 'afrimoney')),
  payment_reference text check (char_length(payment_reference) <= 60),
  settled_with text check (settled_with in ('cash', 'card', 'orange_money', 'afrimoney')),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  paid_at timestamptz,
  fulfilment text not null check (fulfilment in ('dine_in', 'pickup')),
  table_label text check (char_length(table_label) <= 20),
  booking_ref text,
  pickup_time time,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^\+[1-9][0-9]{7,14}$'),
  customer_email text,
  notes text check (char_length(notes) <= 300),
  lines jsonb not null check (jsonb_typeof(lines) = 'array' and jsonb_array_length(lines) between 1 and 30),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  service_charge numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null check (total >= 0),
  currency text not null default 'SLE',
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  history jsonb not null default '[]'::jsonb,
  unique (order_date, order_number)
);

-- Kitchen board: today's orders in number order.
create index if not exists orders_date_number_idx on public.orders (order_date, order_number);
-- Staff lookups of unpaid or unverified payments.
create index if not exists orders_payment_idx on public.orders (payment_status) where payment_status <> 'paid';

alter table public.orders enable row level security;

-- Inserts an order with the next daily order number (#001, #002…). The
-- advisory lock per date stops two orders getting the same number.
create or replace function public.create_order(p_order jsonb)
returns public.orders
language plpgsql
set search_path = public
as $$
declare
  v_date date := (p_order ->> 'order_date')::date;
  v_number int;
  v_row public.orders;
begin
  perform pg_advisory_xact_lock(hashtext('orders:' || v_date::text));
  select coalesce(max(order_number), 0) + 1 into v_number from public.orders where order_date = v_date;

  insert into public.orders (
    ref, order_number, order_date, status, payment_status, payment_method, payment_reference,
    settled_with, amount_paid, paid_at, fulfilment, table_label, booking_ref, pickup_time,
    customer_name, customer_phone, customer_email, notes, lines, subtotal, service_charge,
    tax, total, currency, idempotency_key, created_at, updated_at, history
  ) values (
    p_order ->> 'ref',
    v_number,
    v_date,
    p_order ->> 'status',
    p_order ->> 'payment_status',
    p_order ->> 'payment_method',
    p_order ->> 'payment_reference',
    p_order ->> 'settled_with',
    coalesce((p_order ->> 'amount_paid')::numeric, 0),
    (p_order ->> 'paid_at')::timestamptz,
    p_order ->> 'fulfilment',
    p_order ->> 'table_label',
    p_order ->> 'booking_ref',
    (p_order ->> 'pickup_time')::time,
    p_order ->> 'customer_name',
    p_order ->> 'customer_phone',
    p_order ->> 'customer_email',
    p_order ->> 'notes',
    p_order -> 'lines',
    (p_order ->> 'subtotal')::numeric,
    coalesce((p_order ->> 'service_charge')::numeric, 0),
    coalesce((p_order ->> 'tax')::numeric, 0),
    (p_order ->> 'total')::numeric,
    coalesce(p_order ->> 'currency', 'SLE'),
    (p_order ->> 'idempotency_key')::uuid,
    coalesce((p_order ->> 'created_at')::timestamptz, now()),
    now(),
    coalesce(p_order -> 'history', '[]'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Moves an order between kitchen statuses only from an expected status.
create or replace function public.transition_order(p_ref text, p_from text[], p_to text, p_event jsonb)
returns public.orders
language plpgsql
set search_path = public
as $$
declare
  v_row public.orders;
begin
  update public.orders
  set status = p_to, updated_at = now(), history = history || jsonb_build_array(p_event)
  where ref = p_ref and status = any (p_from)
  returning * into v_row;
  return v_row;
end;
$$;

-- Updates payment only from an expected payment status, with an audit event.
create or replace function public.update_order_payment(
  p_ref text,
  p_from text[],
  p_payment_status text,
  p_payment_reference text,
  p_set_reference boolean,
  p_settled_with text,
  p_amount_paid numeric,
  p_paid_at timestamptz,
  p_event jsonb
) returns public.orders
language plpgsql
set search_path = public
as $$
declare
  v_row public.orders;
begin
  update public.orders
  set payment_status = p_payment_status,
      payment_reference = case when p_set_reference then p_payment_reference else payment_reference end,
      settled_with = coalesce(p_settled_with, settled_with),
      amount_paid = coalesce(p_amount_paid, amount_paid),
      paid_at = case when p_payment_status = 'paid' then coalesce(p_paid_at, now()) else paid_at end,
      updated_at = now(),
      history = history || jsonb_build_array(p_event)
  where ref = p_ref and payment_status = any (p_from)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.create_order(jsonb) from public, anon, authenticated;
revoke all on function public.transition_order(text, text[], text, jsonb) from public, anon, authenticated;
revoke all on function public.update_order_payment(text, text[], text, text, boolean, text, numeric, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;
grant execute on function public.transition_order(text, text[], text, jsonb) to service_role;
grant execute on function public.update_order_payment(text, text[], text, text, boolean, text, numeric, timestamptz, jsonb) to service_role;
