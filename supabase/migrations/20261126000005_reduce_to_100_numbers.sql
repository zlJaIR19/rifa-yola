-- 0005: Reduce the raffle from 250 to 100 numbers.
--
-- Deploy the app code that uses totalNumbers = 100 BEFORE applying this migration.
-- That code already ignores rows above 100 and rejects numbers above 100.
--
-- Run the whole file at once (Supabase SQL Editor or `supabase db push`). Both run it as a
-- single transaction, and the data changes are in one DO block, so it is all or nothing.
-- If any number above 100 is sold, it raises an exception listing those numbers and
-- changes nothing.
--
-- activity_log is intentionally left untouched (history of numbers 101 to 250 is kept).

do $$
declare
  v_sold int[];
  v_con record;
begin
  -- Block concurrent sales while checking and deleting (reads and Realtime still work).
  lock table public.raffle_numbers, public.buyers in exclusive mode;

  -- 1. Safety check: abort if any number above 100 is sold or still has buyer data.
  select array_agg(n order by n) into v_sold
  from (
    select r.number as n
    from public.raffle_numbers r
    where r.number > 100
      and (r.seller_name is not null or r.sold_at is not null)
    union
    select b.number
    from public.buyers b
    where b.number > 100
  ) sold_above;

  if v_sold is not null then
    raise exception
      'Cannot reduce the raffle to 100 numbers: these numbers above 100 are sold: %',
      array_to_string(v_sold, ', ')
      using hint = 'Release those numbers in the app (or move the sales to numbers 1 to 100) and run this migration again.';
  end if;

  -- 2. Delete numbers 101 to 250 (buyers rows would cascade; the check above ensures there are none).
  delete from public.raffle_numbers where number > 100;

  -- 3. Replace the range check. Find it by catalog instead of assuming its name: every CHECK
  --    constraint on raffle_numbers that references only the "number" column
  --    (created as raffle_numbers_number_check by migration 0001).
  for v_con in
    select c.conname
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attname = 'number'
    where c.conrelid = 'public.raffle_numbers'::regclass
      and c.contype = 'c'
      and c.conkey = array[a.attnum]
  loop
    execute format('alter table public.raffle_numbers drop constraint %I', v_con.conname);
    raise notice 'Dropped constraint %', v_con.conname;
  end loop;

  alter table public.raffle_numbers
    add constraint raffle_numbers_number_check check (number between 1 and 100);
end;
$$;

-- 4. RPC functions that validate the number range: same bodies as migration 0003,
--    only the upper bound changes from 250 to 100. CREATE OR REPLACE keeps the existing
--    grants (service_role only).

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
  if p_number is null or p_number < 1 or p_number > 100 then
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
  if p_number is null or p_number < 1 or p_number > 100 then
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
  if p_number is null or p_number < 1 or p_number > 100 then
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
