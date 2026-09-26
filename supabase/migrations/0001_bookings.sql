-- Table bookings and event requests for El Greco Kafe - Resto.
-- Apply in the Supabase SQL editor or with `supabase db push`.
-- The app connects with the service-role key only; RLS blocks everyone else.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (ref ~ '^EG-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$'),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'checked_in', 'no_show')),
  kind text not null check (kind in ('table', 'event')),
  occasion text not null,
  space text not null default 'any',
  booking_date date not null,
  booking_time time not null,
  party_size int not null check (party_size between 1 and 500),
  guest_name text not null check (char_length(guest_name) between 2 and 80),
  guest_phone text not null check (guest_phone ~ '^\+[1-9][0-9]{7,14}$'),
  guest_email text,
  celebrant text,
  extras jsonb not null default '[]'::jsonb,
  notes text check (char_length(notes) <= 500),
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  checked_in_at timestamptz,
  history jsonb not null default '[]'::jsonb
);

-- Availability and the staff day view read active bookings by date and time.
create index if not exists bookings_active_date_time_idx
  on public.bookings (booking_date, booking_time)
  where status in ('pending', 'confirmed', 'checked_in');
-- Duplicate-booking check (same phone, same day).
create index if not exists bookings_phone_date_idx on public.bookings (guest_phone, booking_date);
-- Staff "requests needing action" list.
create index if not exists bookings_pending_idx on public.bookings (booking_date, booking_time)
  where status = 'pending';

alter table public.bookings enable row level security;
-- No policies on purpose: only the service role (server side) can read or write.

-- Inserts a booking, but only if the overlapping table bookings plus this
-- party still fit. An advisory lock per date makes check-and-insert atomic,
-- so two guests can't both take the last seats.
create or replace function public.create_booking(
  p_booking jsonb,
  p_seat_capacity int default null,
  p_dining_minutes int default null
) returns public.bookings
language plpgsql
set search_path = public
as $$
declare
  v_date date := (p_booking ->> 'booking_date')::date;
  v_time time := (p_booking ->> 'booking_time')::time;
  v_party int := (p_booking ->> 'party_size')::int;
  v_taken int;
  v_row public.bookings;
begin
  perform pg_advisory_xact_lock(hashtext('bookings:' || v_date::text));

  if p_seat_capacity is not null then
    select coalesce(sum(party_size), 0) into v_taken
    from public.bookings
    where booking_date = v_date
      and kind = 'table'
      and status in ('pending', 'confirmed', 'checked_in')
      and abs(extract(epoch from (booking_time - v_time)) / 60) < p_dining_minutes;

    if v_taken + v_party > p_seat_capacity then
      raise exception 'CAPACITY_FULL';
    end if;
  end if;

  insert into public.bookings (
    ref, status, kind, occasion, space, booking_date, booking_time, party_size,
    guest_name, guest_phone, guest_email, celebrant, extras, notes,
    idempotency_key, created_at, updated_at, history
  ) values (
    p_booking ->> 'ref',
    p_booking ->> 'status',
    p_booking ->> 'kind',
    p_booking ->> 'occasion',
    p_booking ->> 'space',
    v_date,
    v_time,
    v_party,
    p_booking ->> 'guest_name',
    p_booking ->> 'guest_phone',
    p_booking ->> 'guest_email',
    p_booking ->> 'celebrant',
    coalesce(p_booking -> 'extras', '[]'::jsonb),
    p_booking ->> 'notes',
    (p_booking ->> 'idempotency_key')::uuid,
    coalesce((p_booking ->> 'created_at')::timestamptz, now()),
    now(),
    coalesce(p_booking -> 'history', '[]'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Moves a booking between statuses only if it is still in an expected one,
-- and appends the event to its audit history. Returns null when the booking
-- is missing or was already changed by someone else.
create or replace function public.transition_booking(
  p_ref text,
  p_from text[],
  p_to text,
  p_event jsonb
) returns public.bookings
language plpgsql
set search_path = public
as $$
declare
  v_row public.bookings;
begin
  update public.bookings
  set status = p_to,
      updated_at = now(),
      checked_in_at = case
        when p_to = 'checked_in' then now()
        when status = 'checked_in' then null
        else checked_in_at
      end,
      history = history || jsonb_build_array(p_event)
  where ref = p_ref and status = any (p_from)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_booking(jsonb, int, int) from public, anon, authenticated;
revoke all on function public.transition_booking(text, text[], text, jsonb) from public, anon, authenticated;
grant execute on function public.create_booking(jsonb, int, int) to service_role;
grant execute on function public.transition_booking(text, text[], text, jsonb) to service_role;
