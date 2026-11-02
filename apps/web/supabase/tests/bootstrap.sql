-- Minimal auth shim for the isolated CI PostgreSQL service only. Never apply to Supabase.
create schema auth;
create table auth.users(id uuid primary key);
create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth to authenticated;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant execute on function auth.uid() to authenticated;
