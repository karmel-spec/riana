-- Row-level security tests. Each check prints PASS or aborts the run.
create schema test;
grant usage on schema test to anon, authenticated;
create function test.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'PASS: %', msg;
end $$;
-- Row count visible to the current role; -1 if the query is refused outright.
create function test.rows(sql text) returns int language plpgsql as $$
declare n int;
begin
  execute 'select count(*) from (' || sql || ') x' into n; return n;
exception when insufficient_privilege then return -1;
end $$;
-- true if the statement raises any error.
create function test.fails(sql text) returns boolean language plpgsql as $$
begin
  execute sql; return false;
exception when others then return true;
end $$;
-- true if an UPDATE/DELETE touched zero rows or was refused.
create function test.touches(sql text) returns int language plpgsql as $$
declare n int;
begin
  execute sql; get diagnostics n = row_count; return n;
exception when others then return -1;
end $$;
grant execute on all functions in schema test to anon, authenticated;

create function test.act(who uuid, aal text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', who, 'aal', aal, 'role', 'authenticated')::text, false);
$$;
grant execute on function test.act(uuid, text) to anon, authenticated;
\set K   '''11111111-1111-4111-8111-111111111111'''
\set H   '''22222222-2222-4222-8222-222222222222'''
\set RICH '''33333333-3333-4333-8333-333333333333'''
\set DI  '''44444444-4444-4444-8444-444444444444'''
\set DAV '''55555555-5555-4555-8555-555555555555'''
\set GK  '''66666666-6666-4666-8666-666666666666'''
\set ATT '''77777777-7777-4777-8777-777777777777'''
\set OLD '''88888888-8888-4888-8888-888888888888'''

-- Anonymous visitors -------------------------------------------------------
set role anon;
select test.ok(test.rows('select * from public.urgent_questions') <= 0, 'anon cannot read urgent questions');
select test.ok(test.rows('select * from public.people') <= 0, 'anon cannot read contacts');
select test.ok(test.rows('select * from public.audit_log') <= 0, 'anon cannot read audit log');
reset role;

-- Super admin needs 2-step verification -------------------------------------
select test.act(:K, 'aal1'); set role authenticated;
select test.ok(test.rows('select * from public.urgent_questions') = 0, 'super admin WITHOUT 2FA sees nothing');
reset role; select test.act(:K, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.urgent_questions') = 5, 'super admin with 2FA sees all questions');
select test.ok(test.rows('select * from public.bills') = 7, 'super admin with 2FA sees bills');
select test.ok(test.rows('select * from public.riana_updates') = 2, 'super admin sees the Riana inbox');
select test.ok(test.rows('select * from public.audit_log') > 0, 'super admin can read the audit log');
select test.ok(test.fails('delete from public.audit_log'), 'even a super admin cannot delete audit entries');
select test.ok(test.fails('update public.change_history set op = ''INSERT'''), 'even a super admin cannot edit change history');
reset role;

-- Family member (child) -------------------------------------------------------
select test.act(:DAV, 'aal1'); set role authenticated;
select test.ok(test.rows('select * from public.urgent_questions') = 5, 'family can read urgent questions');
select test.ok(test.rows('select * from public.lab_results') = 0, 'family WITHOUT 2FA cannot see health');
select test.ok(test.rows('select * from public.calendar_events') = 1, 'family WITHOUT 2FA sees only non-sensitive calendar items');
reset role; select test.act(:DAV, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.lab_results') = 6, 'family with 2FA sees health');
select test.ok(test.rows('select * from public.calendar_events') = 4, 'family sees health + family appointments, not tax/insurance dates');
select test.ok(test.rows('select * from public.bills') = 0, 'family cannot see bills');
select test.ok(test.rows('select * from public.legal_documents') = 0, 'family cannot see legal by default');
select test.ok(test.rows('select * from public.loans') = 0, 'family cannot see loans');
select test.ok(test.rows('select * from public.riana_updates') = 0, 'family cannot see the Riana inbox');
select test.ok(test.rows('select * from public.audit_log') = 0, 'family cannot read the audit log');
select test.ok(test.fails($$insert into public.bills (payee) values ('x')$$), 'family cannot add a bill');
select test.ok(test.touches($$update public.urgent_questions set answer = 'x'$$) <= 0, 'family cannot edit urgent questions');
select test.ok(test.fails($$update public.profiles set app_role = 'super_admin' where id = auth.uid()$$), 'family cannot promote themselves');
select test.ok(test.fails($$insert into public.audit_log (action) values ('view')$$), 'nobody writes the audit log directly');
select app.log_event('view', 'final_wishes', 'final_wishes');
select test.ok(true, 'family can record a view event through app.log_event');
-- Break-glass: emergency read of Legal for 24h, loudly logged.
select app.break_glass('legal', 'Dad is in the ER and we need the healthcare POA');
select test.ok(test.rows('select * from public.legal_documents') = 10, 'break-glass opens Legal read-only');
select test.ok(test.fails($$update public.legal_documents set notes = 'x'$$) or test.touches($$update public.legal_documents set notes = 'x'$$) = 0, 'break-glass is read-only');
reset role;
select test.ok((select count(*) from public.audit_log where action = 'break_glass') = 1, 'break-glass is in the audit log');

-- Grandchild ---------------------------------------------------------------
select test.act(:GK, 'aal1'); set role authenticated;
select test.ok(test.rows('select * from public.final_wishes') = 5, 'grandchild sees final wishes');
select test.ok(test.rows('select * from public.urgent_questions') = 0, 'grandchild does not see urgent questions');
select test.ok(test.rows('select * from public.people') = 0, 'grandchild does not see contacts');
select test.ok(test.fails($$select app.break_glass('health_diana', 'trying to see grandma records')$$), 'grandchild cannot break glass');
reset role;

-- Professionals ---------------------------------------------------------------
select test.act(:ATT, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.legal_documents') = 10, 'attorney sees Legal (granted)');
select test.ok(test.rows('select * from public.bills') = 0, 'attorney does not see bills');
select test.ok(test.rows('select * from public.final_wishes') = 0, 'attorney does not see final wishes');
select test.ok(test.rows('select * from public.people') = 0, 'attorney does not see contacts');
reset role; select test.act(:ATT, 'aal1'); set role authenticated;
select test.ok(test.rows('select * from public.legal_documents') = 0, 'attorney WITHOUT 2FA sees nothing in Legal');
reset role; select test.act(:OLD, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.tax_records') = 0 and app.my_role() is null, 'expired professional has no access at all');
reset role;

-- Parents ----------------------------------------------------------------------
select test.act(:DI, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.lab_results') = 6, 'Diana sees her own labs');
select test.ok(test.touches($$update public.urgent_questions set answer = 'In the blue folder [sample]', status = 'answered', answered_by = 'diana' where sort_order = 1$$) = 1, 'Diana can answer a question');
select test.ok(test.fails($$insert into public.bills (payee) values ('x')$$), 'Diana cannot add bills');
reset role;
select test.ok((select changed_by from public.change_history where table_name = 'urgent_questions' and op = 'UPDATE' order by id desc limit 1) = :DI::uuid, 'change history records who answered');
select test.act(:RICH, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.lab_results') = 0, 'Rich does not see Diana''s labs unless granted');
select test.ok(test.rows('select * from public.calendar_events where about = ''diana''') = 0, 'Rich does not see Diana''s appointments unless granted');
select test.ok(test.rows('select * from public.calendar_events where about = ''rich''') = 1, 'Rich sees his own appointment');
reset role;

-- Data rules ---------------------------------------------------------------
select test.act(:K, 'aal2'); set role authenticated;
select test.ok(test.fails($$insert into public.accounts (institution, kind, last4) values ('Bank', 'checking', '123456789')$$), 'full account numbers are rejected');
select test.ok(not test.fails($$insert into public.accounts (institution, kind, last4) values ('Sample Bank', 'checking', '1234')$$), 'last-4 account numbers are accepted');
select test.ok(test.fails($$insert into public.digital_accounts (service, notes) values ('Email', 'password: hunter2')$$), 'passwords are rejected in digital accounts');
reset role;

-- Bulk sends need a second super admin -------------------------------------
update public.notification_campaigns set requested_by = :H, status = 'awaiting_approval';
select test.act(:DAV, 'aal2'); set role authenticated;
select test.ok(test.touches($$update public.notification_campaigns set status = 'approved'$$) <= 0, 'family cannot approve a send');
reset role; select test.act(:H, 'aal2'); set role authenticated;
select test.ok(test.fails($$update public.notification_campaigns set status = 'approved'$$), 'the requesting admin cannot approve their own send');
select test.ok(test.fails($$update public.notification_campaigns set status = 'sent'$$), 'an unapproved send cannot go out');
reset role; select test.act(:K, 'aal2'); set role authenticated;
select test.ok(test.touches($$update public.notification_campaigns set status = 'approved'$$) = 1, 'a second super admin can approve');
select test.ok((select approved_by from public.notification_campaigns limit 1) = :K::uuid, 'approval records who approved');
reset role;
\echo 'All RLS tests passed.'

-- Public API ----------------------------------------------------------------
select test.act(:DAV, 'aal1'); set role authenticated;
select test.ok((select level from public.my_access() where section = 'health_diana') = 'none'
           and (select needs_mfa from public.my_access() where section = 'health_diana'), 'my_access says 2FA would unlock health');
select test.ok((select app_role from public.my_profile()) = 'family', 'my_profile returns my role');
select test.ok(test.rows('select * from public.audit_log_named') = 0, 'named audit view still hidden from family');
reset role;
set role anon;
select test.ok(test.fails('select * from public.my_access()'), 'anon cannot call my_access');
reset role;
\echo 'API tests passed.'
