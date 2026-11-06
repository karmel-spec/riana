-- =============================================================================
-- Accounts directory (Update Brief #2, item 5 / §3g).
-- Records WHERE a login lives (the 1Password vault + item), never the login.
-- =============================================================================

alter table public.digital_accounts
  add column website     text,
  add column category    text,
  add column vault_name  text not null default 'Greene Family',
  add column status      text not null default 'to_find' check (status in ('found', 'to_find'));
create index digital_accounts_status_idx on public.digital_accounts (status);

-- Tighten the existing no-secrets rule to cover the new columns and more words.
alter table public.digital_accounts drop constraint if exists no_secrets;
alter table public.digital_accounts add constraint no_secrets check (
  (coalesce(notes, '') || ' ' || coalesce(vault_item, '') || ' ' || coalesce(purpose, '') || ' ' || coalesce(after_death, '') || ' ' || coalesce(website, ''))
    !~* '(password|passcode|passphrase|pin|security (answer|question)|secret|token)\s*[:=]'
);

-- Guard for the whole public schema: no table may ever gain a column that
-- looks like it stores a credential. Checked by the test suite and callable
-- from the app's health check.
create or replace function public.secret_like_columns()
returns table (table_name text, column_name text)
language sql stable security definer set search_path = '' as $$
  select c.table_name::text, c.column_name::text
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.column_name ~* '(^|_)(password|passwd|pwd|secret|token|api_key|apikey|pin|passcode|credential|private_key|ssn|social_security|dob|date_of_birth|birth_date|birthdate)(_|$)'
    -- allowed: hashed inbound keys (item: Riana endpoint) and last-4 masks
    and not (c.table_name = 'riana_inbound_keys' and c.column_name = 'key_hash')
    and c.column_name !~* 'last4'
$$;
revoke all on function public.secret_like_columns() from public, anon;
grant execute on function public.secret_like_columns() to authenticated;
