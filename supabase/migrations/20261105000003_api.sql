-- =============================================================================
-- Public RPCs the web app calls (Supabase only exposes the `public` schema).
-- All are SECURITY INVOKER wrappers: they run as the signed-in user and the
-- real checks live in the app.* functions and RLS.
-- =============================================================================

-- What can I see? One row per section with my effective level (after the
-- 2-step-verification rule) and whether 2FA would unlock more.
create or replace function public.my_access()
returns table (section public.section, level public.access_level, needs_mfa boolean)
language sql stable set search_path = '' as $$
  select s, app.level(s), app.raw_level(s) <> 'none' and app.level(s) = 'none'
  from unnest(enum_range(null::public.section)) as s
$$;

create or replace function public.my_profile()
returns table (id uuid, display_name text, app_role public.app_role, is_subject public.subject, large_text boolean)
language sql stable set search_path = '' as $$
  select p.id, p.display_name, app.my_role(), p.is_subject, p.large_text
  from public.profiles p where p.id = auth.uid() and app.my_role() is not null
$$;

create or replace function public.log_view(p_section public.section, p_entity text default null, p_entity_id uuid default null)
returns void language sql set search_path = '' as $$
  select app.log_event('view', p_section, p_entity, p_entity_id, '{}'::jsonb)
$$;

create or replace function public.break_glass(p_section public.section, p_reason text)
returns timestamptz language sql set search_path = '' as $$
  select app.break_glass(p_section, p_reason)
$$;

-- Audit log with names, for the admin screen (RLS on audit_log still applies).
create or replace view public.audit_log_named with (security_invoker = true) as
  select a.*, coalesce(p.display_name, case a.via when 'riana' then 'Riana' else 'System' end) as actor_name
  from public.audit_log a left join public.profiles p on p.id = a.actor;

revoke all on function public.my_access(), public.my_profile(),
  public.log_view(public.section, text, uuid), public.break_glass(public.section, text) from public, anon;
grant execute on function public.my_access(), public.my_profile(),
  public.log_view(public.section, text, uuid), public.break_glass(public.section, text) to authenticated;
grant select on public.audit_log_named to authenticated;
