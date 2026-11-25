-- 0002: Seed the 250 raffle numbers as free.

insert into public.raffle_numbers (number)
select n from generate_series(1, 250) as n
on conflict (number) do nothing;
