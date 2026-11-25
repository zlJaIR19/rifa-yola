-- 0003: Transactional RPC functions.
-- Every write goes through these functions, called only from the Next.js server with the
-- service role key. Each one writes to activity_log in the same transaction.
-- Expected failures return {"ok": false, "error": "<code>"} instead of raising, so the
-- server can map them to Spanish messages.

-- Trim and collapse internal whitespace. Returns null for empty input.
create or replace function public.normalize_spaces(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(regexp_replace(btrim(coalesce(p_value, '')), '\s+', ' ', 'g'), '');
$$;

-- Normalize a seller name and reuse the existing spelling when it matches case-insensitively
-- (so "ana " becomes "Ana" if "Ana" already exists). Takes a transaction-level advisory lock
-- on the lowercased name so two concurrent first sales by "Ana" and "ana" agree on one spelling.
create or replace function public.canonical_seller_name(p_value text)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_name text := public.normalize_spaces(p_value);
  v_existing text;
begin
  if v_name is null then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext('seller:' || lower(v_name)));

  select r.seller_name into v_existing
  from public.raffle_numbers r
  where lower(r.seller_name) = lower(v_name)
  order by r.sold_at asc
  limit 1;

  if v_existing is null then
    select a.seller_name into v_existing
    from public.activity_log a
    where a.seller_name is not null
      and a.action <> 'draw_link'
      and lower(a.seller_name) = lower(v_name)
    order by a.created_at asc
    limit 1;
  end if;

  return coalesce(v_existing, v_name);
end;
$$;

-- Sell a free number. Atomic: the conditional UPDATE takes a row lock, so if two sales race
-- for the same number, the second one re-checks "sold_at is null", matches nothing, and gets
-- 'already_sold' with the winning seller's name.
create or replace function public.sell_number(
  p_number int,
  p_seller_name text,
  p_buyer_name text,
  p_phone text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_seller text;
  v_buyer text := public.normalize_spaces(p_buyer_name);
  v_phone text := btrim(coalesce(p_phone, ''));
  v_sold_at timestamptz;
  v_existing_seller text;
begin
  if p_number is null or p_number < 1 or p_number > 250 then
    return jsonb_build_object('ok', false, 'error', 'invalid_number');
  end if;

  v_seller := public.canonical_seller_name(p_seller_name);
  if v_seller is null or char_length(v_seller) not between 2 and 40 then
    return jsonb_build_object('ok', false, 'error', 'invalid_seller');
  end if;
  if v_buyer is null or char_length(v_buyer) not between 2 and 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_buyer');
  end if;
  if v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;

  update public.raffle_numbers
  set seller_name = v_seller,
      sold_at = now()
  where number = p_number
    and sold_at is null
  returning sold_at into v_sold_at;

  if not found then
    select seller_name into v_existing_seller
    from public.raffle_numbers
    where number = p_number;
    return jsonb_build_object('ok', false, 'error', 'already_sold', 'seller_name', v_existing_seller);
  end if;

  insert into public.buyers (number, name, phone, updated_at)
  values (p_number, v_buyer, v_phone, now())
  on conflict (number) do update
    set name = excluded.name,
        phone = excluded.phone,
        updated_at = excluded.updated_at;

  insert into public.activity_log (number, action, seller_name, old_values, new_values)
  values (
    p_number,
    'sell',
    v_seller,
    null,
    jsonb_build_object('seller_name', v_seller, 'buyer_name', v_buyer, 'phone', v_phone)
  );

  return jsonb_build_object(
    'ok', true,
    'number', p_number,
    'seller_name', v_seller,
    'buyer_name', v_buyer,
    'phone', v_phone,
    'sold_at', v_sold_at
  );
end;
$$;

-- Edit buyer name, phone and seller name of a sold number.
create or replace function public.update_sale(
  p_number int,
  p_seller_name text,
  p_buyer_name text,
  p_phone text
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_seller text;
  v_buyer text := public.normalize_spaces(p_buyer_name);
  v_phone text := btrim(coalesce(p_phone, ''));
  v_old_seller text;
  v_sold_at timestamptz;
  v_old_buyer text;
  v_old_phone text;
  v_old jsonb := '{}'::jsonb;
  v_new jsonb := '{}'::jsonb;
begin
  if p_number is null or p_number < 1 or p_number > 250 then
    return jsonb_build_object('ok', false, 'error', 'invalid_number');
  end if;

  v_seller := public.canonical_seller_name(p_seller_name);
  if v_seller is null or char_length(v_seller) not between 2 and 40 then
    return jsonb_build_object('ok', false, 'error', 'invalid_seller');
  end if;
  if v_buyer is null or char_length(v_buyer) not between 2 and 80 then
    return jsonb_build_object('ok', false, 'error', 'invalid_buyer');
  end if;
  if v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_phone');
  end if;

  select seller_name, sold_at into v_old_seller, v_sold_at
  from public.raffle_numbers
  where number = p_number
  for update;

  if v_sold_at is null then
    return jsonb_build_object('ok', false, 'error', 'not_sold');
  end if;

  select name, phone into v_old_buyer, v_old_phone
  from public.buyers
  where number = p_number
  for update;

  if v_old_seller is distinct from v_seller then
    v_old := v_old || jsonb_build_object('seller_name', v_old_seller);
    v_new := v_new || jsonb_build_object('seller_name', v_seller);
  end if;
  if v_old_buyer is distinct from v_buyer then
    v_old := v_old || jsonb_build_object('buyer_name', v_old_buyer);
    v_new := v_new || jsonb_build_object('buyer_name', v_buyer);
  end if;
  if v_old_phone is distinct from v_phone then
    v_old := v_old || jsonb_build_object('phone', v_old_phone);
    v_new := v_new || jsonb_build_object('phone', v_phone);
  end if;

  if v_new <> '{}'::jsonb then
    update public.raffle_numbers
    set seller_name = v_seller
    where number = p_number;

    insert into public.buyers (number, name, phone, updated_at)
    values (p_number, v_buyer, v_phone, now())
    on conflict (number) do update
      set name = excluded.name,
          phone = excluded.phone,
          updated_at = excluded.updated_at;

    insert into public.activity_log (number, action, seller_name, old_values, new_values)
    values (p_number, 'edit', v_seller, v_old, v_new);
  end if;

  return jsonb_build_object(
    'ok', true,
    'changed', v_new <> '{}'::jsonb,
    'number', p_number,
    'seller_name', v_seller,
    'buyer_name', v_buyer,
    'phone', v_phone,
    'sold_at', v_sold_at
  );
end;
$$;

-- Release a sold number and delete its buyer data.
-- p_expected_sold_at (optional) guards against releasing a number that was released and
-- sold again by someone else while the confirmation dialog was open.
create or replace function public.release_number(
  p_number int,
  p_expected_sold_at timestamptz default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_old_seller text;
  v_sold_at timestamptz;
  v_old_buyer text;
  v_old_phone text;
begin
  if p_number is null or p_number < 1 or p_number > 250 then
    return jsonb_build_object('ok', false, 'error', 'invalid_number');
  end if;

  select seller_name, sold_at into v_old_seller, v_sold_at
  from public.raffle_numbers
  where number = p_number
  for update;

  if v_sold_at is null then
    return jsonb_build_object('ok', false, 'error', 'not_sold');
  end if;

  if p_expected_sold_at is not null and v_sold_at <> p_expected_sold_at then
    return jsonb_build_object('ok', false, 'error', 'changed');
  end if;

  select name, phone into v_old_buyer, v_old_phone
  from public.buyers
  where number = p_number;

  delete from public.buyers where number = p_number;

  update public.raffle_numbers
  set seller_name = null,
      sold_at = null
  where number = p_number;

  insert into public.activity_log (number, action, seller_name, old_values, new_values)
  values (
    p_number,
    'release',
    v_old_seller,
    jsonb_build_object(
      'seller_name', v_old_seller,
      'buyer_name', v_old_buyer,
      'phone', v_old_phone,
      'sold_at', v_sold_at
    ),
    null
  );

  return jsonb_build_object('ok', true, 'number', p_number);
end;
$$;

-- Save the live stream link for the draw notice.
create or replace function public.set_draw_link(p_url text)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_url text := btrim(coalesce(p_url, ''));
  v_old text;
  v_updated_at timestamptz;
begin
  if v_url !~* '^https://[^\s/$.?#][^\s]*$' or char_length(v_url) > 500 then
    return jsonb_build_object('ok', false, 'error', 'invalid_url');
  end if;

  select value into v_old
  from public.app_settings
  where key = 'draw_link'
  for update;

  insert into public.app_settings (key, value, updated_at)
  values ('draw_link', v_url, now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at
  returning updated_at into v_updated_at;

  insert into public.activity_log (number, action, seller_name, old_values, new_values)
  values (
    null,
    'draw_link',
    null,
    case when v_old is null then null else jsonb_build_object('draw_link', v_old) end,
    jsonb_build_object('draw_link', v_url)
  );

  return jsonb_build_object('ok', true, 'draw_link', v_url, 'updated_at', v_updated_at);
end;
$$;

-- Login rate limiting (per hashed IP). Returns true when the IP must be blocked.
create or replace function public.login_rate_limited(
  p_ip_key text,
  p_max_failures int default 10,
  p_window_minutes int default 15
)
returns boolean
language sql
stable
set search_path = public
as $$
  select count(*) >= p_max_failures
  from public.login_failures
  where ip_key = p_ip_key
    and created_at > now() - make_interval(mins => p_window_minutes);
$$;

create or replace function public.record_login_failure(p_ip_key text)
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into public.login_failures (ip_key) values (p_ip_key);
  -- Housekeeping: keep the table small.
  delete from public.login_failures where created_at < now() - interval '1 day';
end;
$$;

create or replace function public.clear_login_failures(p_ip_key text)
returns void
language sql
set search_path = public
as $$
  delete from public.login_failures where ip_key = p_ip_key;
$$;

-- Only the service role may call these functions. Supabase grants EXECUTE on new functions
-- to anon and authenticated by default, so revoke explicitly.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.normalize_spaces(text)',
    'public.canonical_seller_name(text)',
    'public.sell_number(int, text, text, text)',
    'public.update_sale(int, text, text, text)',
    'public.release_number(int, timestamptz)',
    'public.set_draw_link(text)',
    'public.login_rate_limited(text, int, int)',
    'public.record_login_failure(text)',
    'public.clear_login_failures(text)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;
