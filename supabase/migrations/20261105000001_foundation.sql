-- =============================================================================
-- Greene Family Legacy · Foundation
-- Roles, section permissions, per-user / per-document grants, audit log,
-- change history, and the helper functions every RLS policy relies on.
--
-- Security model in one paragraph:
--   * Every table has row-level security ON. Nothing is readable by `anon`.
--   * Access is decided per SECTION (urgent_questions, health_diana, legal, …).
--     A user's effective level for a section = the higher of their role's
--     default and any unexpired personal grant. Super admins always write.
--   * Sensitive sections (health, money, legal, logins) and every super-admin
--     action additionally require a 2-step-verified session (JWT aal = aal2).
--   * Every insert/update/delete is captured in change_history (old + new row,
--     who, and whether it came "via Riana") and summarized in audit_log.
--   * audit_log and change_history are append-only: no role may update or
--     delete them, including super admins.
-- =============================================================================

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('super_admin', 'parent', 'family', 'posterity', 'professional');

create type public.section as enum (
  'urgent_questions', 'calendar', 'contacts', 'health_diana', 'health_rich',
  'properties', 'accounts', 'bills', 'insurance', 'taxes', 'legal',
  'final_wishes', 'digital_accounts', 'household', 'next_steps',
  'family_history', 'notify', 'admin'
);

create type public.access_level as enum ('none', 'read', 'write');
create type public.subject as enum ('rich', 'diana', 'both', 'household');
create type public.record_source as enum ('app', 'riana', 'import');

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text not null check (length(display_name) between 1 and 120),
  app_role          public.app_role not null default 'posterity',
  -- For parents: which of Rich / Diana this login is. Drives "my own records".
  is_subject        public.subject,
  large_text        boolean not null default false,
  -- Professionals (attorney, CPA) must have an end date.
  access_expires_at timestamptz,
  created_at        timestamptz not null default now(),
  constraint professional_must_expire check (app_role <> 'professional' or access_expires_at is not null),
  constraint parent_must_be_subject check (app_role <> 'parent' or is_subject in ('rich', 'diana'))
);

-- Role defaults: one row per (role, section). Editable by super admins.
create table public.role_section_access (
  app_role public.app_role not null,
  section  public.section not null,
  level    public.access_level not null,
  primary key (app_role, section)
);

-- Personal grants: raise one user's access to one section, optionally until a date.
create table public.user_section_access (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  section    public.section not null,
  level      public.access_level not null,
  expires_at timestamptz,
  reason     text,
  granted_by uuid references public.profiles (id),
  break_glass boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, section, break_glass)
);

-- Sections that require a 2-step-verified session to read at all.
create table public.sensitive_sections (
  section public.section primary key
);
insert into public.sensitive_sections (section) values
  ('health_diana'), ('health_rich'), ('properties'), ('accounts'), ('bills'),
  ('insurance'), ('taxes'), ('legal'), ('digital_accounts'), ('admin');

-- ---------------------------------------------------------------------------
-- Session helpers (SECURITY DEFINER so policies can read profiles/grants
-- without granting users direct access to those tables).
-- ---------------------------------------------------------------------------
create or replace function app.uid() returns uuid
language sql stable as $$ select auth.uid() $$;

create or replace function app.mfa_verified() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false)
$$;

create or replace function app.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.app_role
  from public.profiles p
  where p.id = auth.uid()
    and (p.access_expires_at is null or p.access_expires_at > now())
$$;

create or replace function app.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(app.my_role() = 'super_admin', false) and app.mfa_verified()
$$;

-- Effective level for the current user on a section, BEFORE the MFA rule.
create or replace function app.raw_level(s public.section) returns public.access_level
language sql stable security definer set search_path = '' as $$
  with me as (select app.my_role() as r)
  select case
    when (select r from me) is null then 'none'::public.access_level
    when (select r from me) = 'super_admin' then 'write'::public.access_level
    else greatest(
      coalesce((select rsa.level from public.role_section_access rsa
                 where rsa.app_role = (select r from me) and rsa.section = s
                   and (select r from me) <> 'professional'), 'none'),
      coalesce((select max(usa.level) from public.user_section_access usa
                 where usa.user_id = auth.uid() and usa.section = s
                   and (usa.expires_at is null or usa.expires_at > now())), 'none')
    )
  end
$$;

-- Effective level AFTER the MFA rule: super admins and sensitive sections need aal2.
create or replace function app.level(s public.section) returns public.access_level
language sql stable security definer set search_path = '' as $$
  select case
    when not app.mfa_verified()
         and (app.my_role() = 'super_admin'
              or exists (select 1 from public.sensitive_sections ss where ss.section = s))
      then 'none'::public.access_level
    else app.raw_level(s)
  end
$$;

create or replace function app.can_read(s public.section) returns boolean
language sql stable as $$ select app.level(s) in ('read', 'write') $$;

create or replace function app.can_write(s public.section) returns boolean
language sql stable as $$ select app.level(s) = 'write' $$;

-- ---------------------------------------------------------------------------
-- Audit log (append-only)
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  action      text not null check (action in (
                'view', 'create', 'update', 'delete', 'download', 'export',
                'permission_change', 'break_glass', 'approve', 'reject',
                'revert', 'sign_in', 'notify_send')),
  section     public.section,
  entity      text,
  entity_id   uuid,
  via         public.record_source not null default 'app',
  details     jsonb not null default '{}'::jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);

-- The ONLY way to write to audit_log from the app. Actor is always the caller.
create or replace function app.log_event(
  p_action text, p_section public.section default null, p_entity text default null,
  p_entity_id uuid default null, p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if p_action not in ('view', 'download', 'export', 'sign_in') then
    raise exception 'only view/download/export/sign_in may be logged directly';
  end if;
  insert into public.audit_log (actor, action, section, entity, entity_id, details)
  values (auth.uid(), p_action, p_section, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- ---------------------------------------------------------------------------
-- Change history ("what changed and when, and by whom")
-- ---------------------------------------------------------------------------
create table public.change_history (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  table_name text not null,
  row_id     uuid not null,
  op         text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  section    public.section,
  changed_by uuid,
  via        public.record_source not null default 'app',
  old_row    jsonb,
  new_row    jsonb
);
create index change_history_row_idx on public.change_history (table_name, row_id, at desc);

create or replace function app.track_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row     jsonb;
  v_old     jsonb;
  v_new     jsonb;
  v_section public.section;
  v_via     public.record_source;
  v_id      uuid;
begin
  if tg_op = 'DELETE' then v_row := to_jsonb(old); else v_row := to_jsonb(new); end if;
  v_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_id := (v_row ->> 'id')::uuid;
  v_section := (v_row ->> 'section')::public.section;
  v_via := coalesce((v_row ->> 'source')::public.record_source, 'app');

  -- Skip no-op updates (only timestamps changed).
  if tg_op = 'UPDATE' and (v_old - 'updated_at' - 'updated_by') = (v_new - 'updated_at' - 'updated_by') then
    return new;
  end if;

  insert into public.change_history (table_name, row_id, op, section, changed_by, via, old_row, new_row)
  values (tg_table_name, v_id, tg_op, v_section, auth.uid(), v_via, v_old, v_new);

  insert into public.audit_log (actor, action, section, entity, entity_id, via)
  values (auth.uid(), lower(case tg_op when 'INSERT' then 'create' else tg_op end), v_section, tg_table_name, v_id, v_via);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create or replace function app.touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

-- Permission changes are audited too.
create or replace function app.track_permission_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor, action, section, entity, details)
  values (
    auth.uid(),
    case when tg_table_name = 'user_section_access'
              and coalesce((to_jsonb(coalesce(new, old)) ->> 'break_glass')::boolean, false)
         then 'break_glass' else 'permission_change' end,
    (to_jsonb(coalesce(new, old)) ->> 'section')::public.section,
    tg_table_name,
    jsonb_build_object('op', tg_op, 'old', to_jsonb(old), 'new', to_jsonb(new))
  );
  return coalesce(new, old);
end $$;

-- ---------------------------------------------------------------------------
-- app.protect(table, section_sql): one call turns on RLS, read/write
-- policies, updated_at stamping and change tracking for a records table.
-- The table must have: id uuid, section public.section, updated_at, updated_by.
-- ---------------------------------------------------------------------------
create or replace function app.protect(p_table regclass) returns void
language plpgsql as $$
begin
  execute format('alter table %s enable row level security', p_table);
  execute format('alter table %s force row level security', p_table);
  execute format($p$create policy read_by_section on %s for select to authenticated
                    using (app.can_read(section))$p$, p_table);
  execute format($p$create policy insert_by_section on %s for insert to authenticated
                    with check (app.can_write(section))$p$, p_table);
  execute format($p$create policy update_by_section on %s for update to authenticated
                    using (app.can_write(section)) with check (app.can_write(section))$p$, p_table);
  execute format($p$create policy delete_by_section on %s for delete to authenticated
                    using (app.can_write(section))$p$, p_table);
  execute format('create trigger touch before update on %s for each row execute function app.touch()', p_table);
  execute format('create trigger track after insert or update or delete on %s for each row execute function app.track_change()', p_table);
  execute format('grant select, insert, update, delete on %s to authenticated', p_table);
end $$;

-- ---------------------------------------------------------------------------
-- RLS on the foundation tables
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.role_section_access enable row level security;
alter table public.user_section_access enable row level security;
alter table public.sensitive_sections enable row level security;
alter table public.audit_log enable row level security;
alter table public.change_history enable row level security;

-- Profiles: everyone signed in may see names/roles of family members (needed
-- for "owner" pickers); only super admins may change them.
create policy profiles_read on public.profiles for select to authenticated
  using (auth.uid() = id or app.my_role() is not null);
create policy profiles_admin_write on public.profiles for all to authenticated
  using (app.is_super_admin()) with check (app.is_super_admin());
-- Anyone may toggle their own large-text preference (column-limited below).
create policy profiles_self_prefs on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

grant select on public.profiles to authenticated;
grant insert, delete on public.profiles to authenticated;
grant update (large_text) on public.profiles to authenticated;
grant update (display_name, app_role, is_subject, access_expires_at) on public.profiles to authenticated;
-- Non-admins can only reach the large_text column: the admin policy is the
-- only one whose USING clause lets them touch other users, and a trigger
-- blocks non-admins from changing their own role.
create or replace function app.guard_profile_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_super_admin() and (
       new.app_role is distinct from old.app_role
    or new.display_name is distinct from old.display_name
    or new.is_subject is distinct from old.is_subject
    or new.access_expires_at is distinct from old.access_expires_at) then
    raise exception 'only a super admin can change roles or names';
  end if;
  return new;
end $$;
create trigger guard_profile_update before update on public.profiles
  for each row execute function app.guard_profile_update();
create trigger track_profiles after insert or update or delete on public.profiles
  for each row execute function app.track_permission_change();

create policy rsa_read on public.role_section_access for select to authenticated using (true);
create policy rsa_admin on public.role_section_access for all to authenticated
  using (app.is_super_admin()) with check (app.is_super_admin());
grant select, insert, update, delete on public.role_section_access to authenticated;
create trigger track_rsa after insert or update or delete on public.role_section_access
  for each row execute function app.track_permission_change();

create policy usa_read on public.user_section_access for select to authenticated
  using (user_id = auth.uid() or app.is_super_admin());
create policy usa_admin on public.user_section_access for all to authenticated
  using (app.is_super_admin()) with check (app.is_super_admin());
grant select, insert, update, delete on public.user_section_access to authenticated;
create trigger track_usa after insert or update or delete on public.user_section_access
  for each row execute function app.track_permission_change();

create policy sensitive_read on public.sensitive_sections for select to authenticated using (true);
grant select on public.sensitive_sections to authenticated;

-- Audit + history: super admins read; nobody updates or deletes.
create policy audit_admin_read on public.audit_log for select to authenticated using (app.is_super_admin());
create policy history_read on public.change_history for select to authenticated
  using (app.is_super_admin() or (section is not null and app.can_read(section)));
grant select on public.audit_log, public.change_history to authenticated;
revoke insert, update, delete, truncate on public.audit_log, public.change_history from authenticated, anon;

grant execute on function app.log_event(text, public.section, text, uuid, jsonb) to authenticated;
grant execute on function app.can_read(public.section), app.can_write(public.section),
  app.level(public.section), app.my_role(), app.is_super_admin(), app.mfa_verified()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Break-glass: a family member with 2-step verification can open one
-- section (e.g. Mom's health during an ER visit) read-only for 24 hours.
-- It is loudly logged and shows on the admins' dashboard.
-- ---------------------------------------------------------------------------
create or replace function app.break_glass(p_section public.section, p_reason text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_until timestamptz := now() + interval '24 hours';
begin
  if app.my_role() not in ('family', 'parent') then
    raise exception 'break-glass is for family members';
  end if;
  if not app.mfa_verified() then
    raise exception '2-step verification is required for break-glass access';
  end if;
  if p_section not in ('health_diana', 'health_rich', 'insurance', 'legal', 'contacts') then
    raise exception 'break-glass is not available for this section';
  end if;
  if length(coalesce(trim(p_reason), '')) < 10 then
    raise exception 'please describe the emergency';
  end if;
  insert into public.user_section_access (user_id, section, level, expires_at, reason, break_glass)
  values (auth.uid(), p_section, 'read', v_until, p_reason, true)
  on conflict (user_id, section, break_glass)
    do update set expires_at = excluded.expires_at, reason = excluded.reason, created_at = now();
  return v_until;
end $$;
grant execute on function app.break_glass(public.section, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Default role matrix (super_admin is implicit "write everywhere").
-- ---------------------------------------------------------------------------
insert into public.role_section_access (app_role, section, level) values
  -- Parents see their whole binder; they edit wishes, stories and answers.
  -- Their own health section is granted per-person (see seed / admin UI).
  ('parent', 'urgent_questions', 'write'), ('parent', 'calendar', 'read'),
  ('parent', 'contacts', 'write'), ('parent', 'properties', 'read'),
  ('parent', 'accounts', 'read'), ('parent', 'bills', 'read'),
  ('parent', 'insurance', 'read'), ('parent', 'taxes', 'read'),
  ('parent', 'legal', 'read'), ('parent', 'final_wishes', 'write'),
  ('parent', 'digital_accounts', 'read'), ('parent', 'household', 'write'),
  ('parent', 'next_steps', 'read'), ('parent', 'family_history', 'write'),
  -- Children & spouses: health updates, calendar, wishes, history.
  ('family', 'urgent_questions', 'read'), ('family', 'calendar', 'read'),
  ('family', 'contacts', 'read'), ('family', 'health_diana', 'read'),
  ('family', 'health_rich', 'read'), ('family', 'final_wishes', 'read'),
  ('family', 'household', 'read'), ('family', 'next_steps', 'read'),
  ('family', 'family_history', 'write'),
  -- Grandchildren / posterity.
  ('posterity', 'final_wishes', 'read'), ('posterity', 'family_history', 'read');
-- professional: nothing by default — grants only, and they always expire.
