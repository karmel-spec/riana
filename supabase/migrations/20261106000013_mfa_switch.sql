-- =============================================================================
-- 2-step verification switch.
--
-- The schema requires an aal2 (2-step verified) session for super admins and
-- for the sensitive sections. Until everyone has an authenticator set up, that
-- makes a plain password sign-in show an empty binder. This adds one setting,
-- app.settings 'mfa_required', read by app.mfa_verified(). While it is false,
-- a password sign-in counts as verified everywhere.
--
--   Turn 2-step verification back on:
--     update app.settings set value = 'true' where key = 'mfa_required';
-- =============================================================================

create table if not exists app.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
revoke all on app.settings from public, anon, authenticated;

insert into app.settings (key, value) values ('mfa_required', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function app.mfa_required() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select s.value = 'true'::jsonb from app.settings s where s.key = 'mfa_required'), true)
$$;
revoke all on function app.mfa_required() from public;
grant execute on function app.mfa_required() to authenticated;

create or replace function app.mfa_verified() returns boolean
language sql stable set search_path = '' as $$
  select (not app.mfa_required()) or coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;
