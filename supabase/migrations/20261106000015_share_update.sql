-- "Add an update" on the dashboard: any signed-in family member can share a
-- short note that lands in the Riana inbox for a super admin to review.
-- riana_updates itself is admin-only, so the insert goes through this
-- security-definer function, which only accepts a plain 'note'.
create or replace function public.share_update(p_section text, p_text text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_role public.app_role; v_name text; v_id uuid; v_text text;
begin
  v_role := app.my_role();
  if v_role is null then raise exception 'not signed in'; end if;
  v_text := trim(coalesce(p_text, ''));
  if length(v_text) < 3 or length(v_text) > 2000 then raise exception 'the update must be between 3 and 2000 characters'; end if;
  select display_name into v_name from public.profiles where id = auth.uid();
  insert into public.riana_updates (kind, summary, payload, source)
  values ('note',
          left(v_text, 100) || case when length(v_text) > 100 then '…' else '' end,
          jsonb_build_object('section', nullif(p_section, ''), 'text', v_text, 'from', v_name, 'from_id', auth.uid()),
          'app')
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.share_update(text, text) from public, anon;
grant execute on function public.share_update(text, text) to authenticated;
