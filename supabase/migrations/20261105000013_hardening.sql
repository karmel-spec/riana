-- =============================================================================
-- Hardening from the Supabase security advisor (no behavior change).
--  * Pin search_path on helper functions that lacked it.
--  * The key-management RPCs refuse non-admins internally; anon should not
--    even be able to call them.
-- =============================================================================
alter function app.uid() set search_path = '';
alter function app.can_read(public.section) set search_path = '';
alter function app.can_write(public.section) set search_path = '';
alter function app.touch() set search_path = '';
alter function app.protect(regclass) set search_path = '';
alter function app.health_section(public.subject) set search_path = '';
alter function app.guard_tax_record() set search_path = '';

revoke execute on function public.riana_inbound_key_create(text, text) from anon;
revoke execute on function public.riana_inbound_key_revoke(uuid) from anon;
do $$
begin
  if to_regprocedure('public.riana_key_set_read_sections(uuid, public.section[])') is not null then
    execute 'revoke execute on function public.riana_key_set_read_sections(uuid, public.section[]) from anon';
  end if;
end $$;
