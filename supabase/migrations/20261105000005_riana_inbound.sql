-- =============================================================================
-- Riana inbound endpoint (Phase 2 of the Riana integration).
--
-- An outside agent (Riana, a Grok/Claude assistant, or a person pasting
-- their output) POSTs structured updates to /api/riana/inbound with a
-- bearer key. The web app forwards the key and the update to
-- public.riana_inbound(), below, using only the publishable Supabase key.
--
--   * Keys are stored as SHA-256 hashes in riana_inbound_keys. The plaintext
--     is shown once, when a super admin mints it, and lives in 1Password.
--   * riana_inbound() runs as the function owner (security definer) so the
--     anonymous caller never gets insert rights on riana_updates. It verifies
--     the key, validates the update, and inserts ONE pending row.
--   * Nothing an agent sends touches a real binder record. It waits in the
--     inbox until a super admin approves it on Admin → Updates from Riana.
--   * Every accepted update is tracked by the normal change-history trigger
--     (via = 'riana', actor = none) and stamps the key's last_used_at.
--     Rejected attempts (bad key) are counted on the key, never logged with
--     the submitted body.
-- =============================================================================

create table public.riana_inbound_keys (
  id            uuid primary key default gen_random_uuid(),
  label         text not null check (length(label) between 1 and 80),
  key_hash      text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  use_count     integer not null default 0,
  revoked_at    timestamptz
);

alter table public.riana_inbound_keys enable row level security;
alter table public.riana_inbound_keys force row level security;
-- Super admins see labels, usage and revocation; nobody reads hashes through
-- the API (the column grant below leaves key_hash out).
create policy rik_admin on public.riana_inbound_keys for all to authenticated
  using (app.is_super_admin()) with check (app.is_super_admin());
grant select (id, label, created_by, created_at, last_used_at, use_count, revoked_at)
  on public.riana_inbound_keys to authenticated;
grant update (label, revoked_at) on public.riana_inbound_keys to authenticated;
-- Audit key changes without ever copying the hash into the audit log.
create or replace function app.track_inbound_key_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.riana_inbound_keys := coalesce(new, old);
begin
  insert into public.audit_log (actor, action, section, entity, entity_id, details)
  values (auth.uid(), 'permission_change', 'admin', tg_table_name, r.id,
          jsonb_build_object('op', tg_op, 'label', r.label, 'revoked', r.revoked_at is not null));
  return coalesce(new, old);
end $$;
create trigger track_riana_keys after insert or update or delete on public.riana_inbound_keys
  for each row execute function app.track_inbound_key_change();

-- Lets an agent retry safely: the same external_ref is accepted once.
alter table public.riana_updates add column external_ref text
  check (external_ref is null or length(external_ref) between 1 and 200);
create unique index riana_updates_external_ref_idx on public.riana_updates (external_ref)
  where external_ref is not null;

create or replace function app.hash_inbound_key(p_key text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
$$;

-- Mint a key. Returns the plaintext ONCE; only the hash is stored.
-- Call from the SQL editor as a 2-step-verified super admin:
--   select public.riana_inbound_key_create('Grok assistant');
create or replace function public.riana_inbound_key_create(p_label text, p_key text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_key text;
begin
  if not app.is_super_admin() then
    raise exception 'only a super admin can create an inbound key';
  end if;
  -- Two random UUIDs = 64 hex characters of randomness, with no extension needed.
  v_key := coalesce(p_key, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
  if length(v_key) < 32 then
    raise exception 'inbound key must be at least 32 characters';
  end if;
  insert into public.riana_inbound_keys (label, key_hash, created_by)
  values (p_label, app.hash_inbound_key(v_key), auth.uid());
  return v_key;
end $$;

create or replace function public.riana_inbound_key_revoke(p_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.riana_inbound_keys set revoked_at = now()
  where id = p_id and revoked_at is null and app.is_super_admin();
$$;

-- The endpoint. Called by the web app as `anon` with the bearer key.
create or replace function public.riana_inbound(
  p_key text, p_kind text, p_summary text, p_payload jsonb default '{}'::jsonb, p_external_ref text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_key_id uuid;
  v_id     uuid;
begin
  select id into v_key_id from public.riana_inbound_keys
  where key_hash = app.hash_inbound_key(coalesce(p_key, '')) and revoked_at is null;
  if v_key_id is null then
    raise exception 'invalid inbound key' using errcode = '28000';   -- invalid_authorization_specification
  end if;

  if p_kind is null or p_kind not in ('appointment', 'lab_result', 'bill', 'urgent_question', 'document', 'note') then
    raise exception 'unknown kind' using errcode = '22023';         -- invalid_parameter_value
  end if;
  if p_summary is null or length(trim(p_summary)) not between 1 and 500 then
    raise exception 'summary must be 1–500 characters' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be a JSON object' using errcode = '22023';
  end if;
  if length(p_payload::text) > 20000 then
    raise exception 'payload too large' using errcode = '22023';
  end if;

  -- Every authenticated call counts, retries included.
  update public.riana_inbound_keys set last_used_at = now(), use_count = use_count + 1 where id = v_key_id;

  if p_external_ref is not null then
    select id into v_id from public.riana_updates where external_ref = p_external_ref;
    if v_id is not null then
      return v_id;   -- already received; idempotent retry.
    end if;
  end if;

  insert into public.riana_updates (kind, summary, payload, external_ref)
  values (p_kind, trim(p_summary), p_payload, p_external_ref)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.riana_inbound(text, text, text, jsonb, text),
  public.riana_inbound_key_create(text, text), public.riana_inbound_key_revoke(uuid) from public;
grant execute on function public.riana_inbound(text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.riana_inbound_key_create(text, text), public.riana_inbound_key_revoke(uuid) to authenticated;
