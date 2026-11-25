-- 0001: Core tables for the Christmas raffle.
-- Buyer data lives in its own table so Realtime payloads of raffle_numbers never expose it.

create table if not exists public.raffle_numbers (
  number int primary key check (number between 1 and 250),
  seller_name text check (seller_name is null or char_length(seller_name) between 2 and 40),
  sold_at timestamptz,
  -- A number is sold if and only if both columns are set.
  constraint raffle_numbers_sold_consistency
    check ((seller_name is null) = (sold_at is null))
);

create table if not exists public.buyers (
  number int primary key references public.raffle_numbers(number) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  phone text not null check (phone ~ '^\+[1-9][0-9]{6,14}$'),
  updated_at timestamptz not null default now()
);

create index if not exists buyers_phone_idx on public.buyers (phone);

-- number is nullable because set_draw_link is also logged (it is not tied to a number).
create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  number int,
  action text not null check (action in ('sell', 'edit', 'release', 'draw_link')),
  seller_name text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now(),
  constraint activity_log_number_required
    check (action = 'draw_link' or number is not null)
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_number_idx on public.activity_log (number);

create table if not exists public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- Failed login attempts, used for per-IP rate limiting (the account is shared, so it is never locked).
-- ip_key is a SHA-256 hash of the client IP, never the raw IP.
create table if not exists public.login_failures (
  id bigint generated always as identity primary key,
  ip_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists login_failures_ip_key_created_at_idx
  on public.login_failures (ip_key, created_at desc);
