-- Apply to a Supabase project. Browser clients use only the public publishable key.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null
);
create function public.validate_profile_timezone() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone';
  end if;
  return new;
end $$;
create trigger profile_timezone before insert or update on public.profiles
for each row execute function public.validate_profile_timezone();

create table public.habits (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  icon text not null default '✦' check (length(icon) <= 32),
  start_date date not null,
  display_order integer not null default 0,
  archived_at timestamptz,
  updated_at timestamptz not null,
  mutation_id uuid not null,
  unique (id, user_id)
);
create table public.daily_checks (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  habit_id uuid not null,
  local_date date not null,
  completed_at timestamptz, -- null is a retained undo tombstone, not a completed day.
  updated_at timestamptz not null,
  mutation_id uuid not null,
  unique (habit_id, local_date),
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade,
  check (id = habit_id::text || ':' || local_date::text)
);
create index habits_user_order on public.habits(user_id, display_order);
create index checks_user_date on public.daily_checks(user_id, local_date);

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.daily_checks enable row level security;
create policy own_profile_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy own_profile_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
-- No client update policy: the account's calendar stays consistent across devices.
create policy own_habits_read on public.habits for select to authenticated using ((select auth.uid()) = user_id);
create policy own_habits_insert on public.habits for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_habits_update on public.habits for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_checks_read on public.daily_checks for select to authenticated using ((select auth.uid()) = user_id);
create policy own_checks_insert on public.daily_checks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_checks_update on public.daily_checks for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.profiles, public.habits, public.daily_checks from anon;
grant select, insert on public.profiles to authenticated;
grant select, insert, update on public.habits, public.daily_checks to authenticated;

create function public.validate_check_day() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare first_day date; account_zone text;
begin
  select start_date into first_day from public.habits where id = new.habit_id and user_id = new.user_id;
  select timezone into account_zone from public.profiles where id = new.user_id;
  if first_day is null or account_zone is null
    or new.local_date < first_day
    or new.local_date > (now() at time zone account_zone)::date then
    raise exception 'Check must be a tracked local date, never a future date';
  end if;
  return new;
end $$;
create trigger check_day before insert or update on public.daily_checks
for each row execute function public.validate_check_day();

-- Idempotent and order-independent retries. Independent days never overwrite each other.
-- The latest (client updated_at, mutation_id) wins if two devices edit the SAME row.
create function public.apply_habit(payload jsonb) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  insert into public.habits(id,user_id,name,icon,start_date,display_order,archived_at,updated_at,mutation_id)
  values ((payload->>'id')::uuid,(payload->>'user_id')::uuid,payload->>'name',payload->>'icon',
    (payload->>'start_date')::date,(payload->>'display_order')::integer,
    (payload->>'archived_at')::timestamptz,(payload->>'updated_at')::timestamptz,(payload->>'mutation_id')::uuid)
  on conflict(id) do update set
    name=excluded.name,icon=excluded.icon,display_order=excluded.display_order,
    archived_at=excluded.archived_at,updated_at=excluded.updated_at,mutation_id=excluded.mutation_id
  where (excluded.updated_at,excluded.mutation_id) > (habits.updated_at,habits.mutation_id);
end $$;
create function public.apply_daily_check(payload jsonb) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  insert into public.daily_checks(id,user_id,habit_id,local_date,completed_at,updated_at,mutation_id)
  values (payload->>'id',(payload->>'user_id')::uuid,(payload->>'habit_id')::uuid,
    (payload->>'local_date')::date,(payload->>'completed_at')::timestamptz,
    (payload->>'updated_at')::timestamptz,(payload->>'mutation_id')::uuid)
  on conflict(habit_id,local_date) do update set
    completed_at=excluded.completed_at,updated_at=excluded.updated_at,mutation_id=excluded.mutation_id
  where (excluded.updated_at,excluded.mutation_id) > (daily_checks.updated_at,daily_checks.mutation_id);
end $$;
revoke all on function public.apply_habit(jsonb), public.apply_daily_check(jsonb) from public, anon;
grant execute on function public.apply_habit(jsonb), public.apply_daily_check(jsonb) to authenticated;
