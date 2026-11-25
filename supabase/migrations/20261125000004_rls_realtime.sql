-- 0004: Row Level Security and Realtime.
-- anon may only read raffle_numbers (number, seller_name, sold_at), which Realtime needs.
-- buyers, activity_log, app_settings and login_failures have RLS enabled and no policies,
-- so only the service role (which bypasses RLS) can touch them.

alter table public.raffle_numbers enable row level security;
alter table public.buyers enable row level security;
alter table public.activity_log enable row level security;
alter table public.app_settings enable row level security;
alter table public.login_failures enable row level security;

drop policy if exists "raffle_numbers are readable by everyone" on public.raffle_numbers;
create policy "raffle_numbers are readable by everyone"
  on public.raffle_numbers
  for select
  to anon, authenticated
  using (true);

-- Belt and braces: remove table privileges that are not needed.
revoke all on public.raffle_numbers from anon, authenticated;
grant select on public.raffle_numbers to anon, authenticated;

revoke all on public.buyers from anon, authenticated;
revoke all on public.activity_log from anon, authenticated;
revoke all on public.app_settings from anon, authenticated;
revoke all on public.login_failures from anon, authenticated;

grant all on public.raffle_numbers, public.buyers, public.activity_log,
  public.app_settings, public.login_failures to service_role;

-- Realtime: only raffle_numbers is published. Buyer data never travels over Realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'raffle_numbers'
  ) then
    alter publication supabase_realtime add table public.raffle_numbers;
  end if;
end;
$$;
