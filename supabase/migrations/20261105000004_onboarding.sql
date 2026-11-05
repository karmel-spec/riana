-- =============================================================================
-- Onboarding: invitations → profiles.
--
-- Super admins add an email + role to `invitations`. When that person first
-- signs in with a magic link, Supabase creates their auth.users row and the
-- trigger below turns the invitation into a profile. Nobody without an
-- invitation can get a profile, and without a profile every policy denies.
-- =============================================================================

create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  display_name text not null check (length(display_name) between 1 and 120),
  app_role    public.app_role not null default 'family',
  is_subject  public.subject,
  access_expires_at timestamptz,
  invited_by  uuid references public.profiles (id),
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint inv_professional_must_expire check (app_role <> 'professional' or access_expires_at is not null),
  constraint inv_parent_must_be_subject check (app_role <> 'parent' or is_subject in ('rich', 'diana'))
);

alter table public.invitations enable row level security;
create policy inv_admin on public.invitations for all to authenticated
  using (app.is_super_admin()) with check (app.is_super_admin());
grant select, insert, update, delete on public.invitations to authenticated;
create trigger track_invitations after insert or update or delete on public.invitations
  for each row execute function app.track_permission_change();

-- Turn an invitation into a profile the moment the auth user exists.
create or replace function app.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare inv public.invitations;
begin
  select * into inv from public.invitations where email = lower(new.email) and accepted_at is null;
  if inv.id is null then
    return new;  -- no invitation: they can sign in but every policy denies.
  end if;
  insert into public.profiles (id, display_name, app_role, is_subject, access_expires_at, large_text)
  values (new.id, inv.display_name, inv.app_role, inv.is_subject, inv.access_expires_at, inv.app_role = 'parent')
  on conflict (id) do nothing;
  -- Parents own their health section.
  if inv.app_role = 'parent' then
    insert into public.user_section_access (user_id, section, level, reason, granted_by)
    values (new.id, app.health_section(inv.is_subject), 'write', 'own records', inv.invited_by)
    on conflict do nothing;
  end if;
  update public.invitations set accepted_at = now() where id = inv.id;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- Used by the login action (as anon) to decide whether a magic link may create
-- a new auth user. Returns only true/false; never lists emails.
create or replace function public.is_invited(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.invitations where email = lower(trim(p_email)) and accepted_at is null)
      or exists (select 1 from auth.users where lower(email) = lower(trim(p_email)))
$$;
revoke all on function public.is_invited(text) from public;
grant execute on function public.is_invited(text) to anon, authenticated;

-- Admin screen helpers ---------------------------------------------------------
create or replace view public.people_and_access with (security_invoker = true) as
  select p.id, p.display_name, p.app_role, p.is_subject, p.access_expires_at, p.created_at,
         (select count(*) from public.user_section_access u where u.user_id = p.id and (u.expires_at is null or u.expires_at > now())) as grant_count
  from public.profiles p;
grant select on public.people_and_access to authenticated;
