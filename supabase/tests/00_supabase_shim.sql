-- LOCAL TESTING ONLY. A minimal stand-in for the parts of Supabase that the
-- migrations depend on (auth.users, auth.uid(), auth.jwt(), and the
-- anon/authenticated/service_role roles). Never run this against Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;
grant usage on schema public to anon, authenticated, service_role;
