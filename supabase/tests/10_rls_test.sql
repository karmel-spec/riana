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

-- Onboarding ----------------------------------------------------------------
select test.act(:K, 'aal2'); set role authenticated;
insert into public.invitations (email, display_name, app_role, invited_by) values ('newkid@test.invalid', 'New Kid', 'family', :K);
insert into public.invitations (email, display_name, app_role, is_subject) values ('mom2@test.invalid', 'Mom', 'parent', 'diana');
reset role;
select test.ok(public.is_invited('NewKid@test.invalid'), 'is_invited matches case-insensitively');
select test.ok(not public.is_invited('stranger@test.invalid'), 'strangers are not invited');
insert into auth.users (id, email) values ('99999999-9999-4999-8999-999999999999', 'newkid@test.invalid');
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'stranger@test.invalid');
insert into auth.users (id, email) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'mom2@test.invalid');
select test.ok((select app_role from public.profiles where id = '99999999-9999-4999-8999-999999999999') = 'family', 'first sign-in creates the profile from the invitation');
select test.ok(not exists (select 1 from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'a stranger who signs in gets no profile');
select test.ok((select accepted_at is not null from public.invitations where email = 'newkid@test.invalid'), 'invitation is marked accepted');
select test.ok(exists (select 1 from public.user_section_access where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' and section = 'health_diana' and level = 'write'), 'a new parent gets their own health section');
select test.act('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.final_wishes') = 0 and test.rows('select * from public.my_profile()') = 0, 'stranger sees nothing');
reset role; select test.act(:DAV, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.invitations') = 0, 'family cannot see invitations');
reset role;
\echo 'Onboarding tests passed.'

-- Riana inbound endpoint -------------------------------------------------------
select test.act(:DAV, 'aal2'); set role authenticated;
select test.ok(test.fails($$select public.riana_inbound_key_create('nope')$$), 'family cannot mint an inbound key');
select test.ok(test.rows('select id, label from public.riana_inbound_keys') = 0, 'family cannot see inbound keys');
reset role; select test.act(:K, 'aal1'); set role authenticated;
select test.ok(test.fails($$select public.riana_inbound_key_create('nope')$$), 'super admin WITHOUT 2FA cannot mint an inbound key');
reset role; select test.act(:K, 'aal2'); set role authenticated;
select test.ok(test.fails($$select public.riana_inbound_key_create('short', 'tooshort')$$), 'a short key is refused');
select set_config('test.key', public.riana_inbound_key_create('Grok assistant'), false);
select test.ok(length(current_setting('test.key')) = 64, 'minted key is 64 hex characters');
select test.ok(test.rows('select id, label, use_count from public.riana_inbound_keys') = 1, 'super admin sees the key');
select test.ok(test.fails('select key_hash from public.riana_inbound_keys'), 'nobody can read key hashes through the API');
select test.ok(test.fails($$insert into public.riana_inbound_keys (label, key_hash) values ('x', repeat('0', 64))$$), 'keys cannot be inserted directly');
select test.ok((select details ->> 'label' from public.audit_log where entity = 'riana_inbound_keys' order by at desc limit 1) = 'Grok assistant'
           and not exists (select 1 from public.audit_log where entity = 'riana_inbound_keys' and details::text like '%key_hash%'), 'minting is audited without the hash');
reset role;

-- The web app calls riana_inbound as anon (no session, no JWT) with the bearer key.
select set_config('request.jwt.claims', '', false);
set role anon;
select test.ok(test.fails($$select public.riana_inbound('wrong-key-wrong-key-wrong-key-wrong', 'note', 'hi')$$), 'wrong key is refused');
select test.ok(test.fails($$select public.riana_inbound(current_setting('test.key'), 'gossip', 'hi')$$), 'unknown kind is refused');
select test.ok(test.fails($$select public.riana_inbound(current_setting('test.key'), 'note', '   ')$$), 'empty summary is refused');
select test.ok(test.fails($$select public.riana_inbound(current_setting('test.key'), 'note', 'hi', '[1,2]'::jsonb)$$), 'payload must be an object');
select set_config('test.upd', public.riana_inbound(current_setting('test.key'), 'lab_result', 'A1C 6.0 for Diana', '{"test":"A1C","value":6.0}', 'grok-msg-1')::text, false);
select test.ok(current_setting('test.upd') <> '', 'a valid update is accepted');
select test.ok(public.riana_inbound(current_setting('test.key'), 'lab_result', 'A1C 6.0 for Diana (retry)', '{}', 'grok-msg-1')::text = current_setting('test.upd'), 'a retry with the same external_ref returns the same id');
select test.ok(test.rows('select * from public.riana_updates') <= 0, 'anon still cannot read the inbox');
select test.ok(test.fails($$insert into public.riana_updates (kind, summary, payload) values ('note', 'x', '{}')$$), 'anon cannot insert into the inbox directly');
reset role;

select test.act(:K, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.riana_updates') = 3, 'the update is in the inbox, once');
select test.ok((select review_status from public.riana_updates where id = current_setting('test.upd')::uuid) = 'pending', 'it waits as pending');
select test.ok((select source from public.riana_updates where id = current_setting('test.upd')::uuid) = 'riana', 'it is stamped via Riana');
select test.ok(exists (select 1 from public.audit_log where entity = 'riana_updates' and entity_id = current_setting('test.upd')::uuid and via = 'riana' and action = 'create'), 'receipt is in the audit log via Riana');
select test.ok((select actor_name from public.audit_log_named where entity_id = current_setting('test.upd')::uuid) = 'Riana', 'audit log names Riana as the actor');
select test.ok((select use_count from public.riana_inbound_keys) = 2 and (select last_used_at is not null from public.riana_inbound_keys), 'key usage is counted');
select public.riana_inbound_key_revoke((select id from public.riana_inbound_keys));
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;
select test.ok(test.fails($$select public.riana_inbound(current_setting('test.key'), 'note', 'after revoke')$$), 'a revoked key is refused');
reset role;
select test.act(:DAV, 'aal2'); set role authenticated;
select test.ok(test.rows('select * from public.riana_updates') = 0, 'family still cannot see the inbox');
reset role;
\echo 'Riana inbound tests passed.'

-- Riana outbound export ---------------------------------------------------------
select test.act(:K, 'aal2'); set role authenticated;
select set_config('test.key2', public.riana_inbound_key_create('Monday update bot'), false);
select set_config('test.key2id', (select id::text from public.riana_inbound_keys where label = 'Monday update bot'), false);
reset role;
select set_config('request.jwt.claims', '', false); set role anon;
select test.ok(test.fails($$select public.riana_export('wrong-key-wrong-key-wrong-key-wrong')$$), 'export: wrong key is refused');
select test.ok(test.fails($$select public.riana_export(current_setting('test.key'))$$), 'export: revoked key is refused');
select set_config('test.exp', public.riana_export(current_setting('test.key2'))::text, false);
select test.ok(current_setting('test.exp')::jsonb -> 'sections' = '{}'::jsonb, 'export: a key with no read sections gets nothing');
select set_config('test.exp', public.riana_export(current_setting('test.key2'), '{urgent_questions,legal}')::text, false);
select test.ok(current_setting('test.exp')::jsonb -> 'sections' = '{}'::jsonb
           and current_setting('test.exp')::jsonb -> 'not_permitted' = '["urgent_questions","legal"]'::jsonb, 'export: ungranted sections are listed as not permitted, not returned');
select test.ok(test.fails($$select public.riana_key_set_read_sections(current_setting('test.key2id')::uuid, '{calendar}')$$), 'anon cannot grant read sections');
reset role;
select test.act(:DAV, 'aal2'); set role authenticated;
select test.ok(test.fails($$select public.riana_key_set_read_sections(current_setting('test.key2id')::uuid, '{calendar}')$$), 'family cannot grant read sections');
reset role; select test.act(:K, 'aal2'); set role authenticated;
select test.ok(test.fails($$select public.riana_key_set_read_sections(current_setting('test.key2id')::uuid, '{digital_accounts}')$$), 'logins can never be exported');
select test.ok(test.fails($$select public.riana_key_set_read_sections(current_setting('test.key2id')::uuid, '{family_history}')$$), 'family history can never be exported');
select public.riana_key_set_read_sections(current_setting('test.key2id')::uuid, '{urgent_questions,calendar,final_wishes,health_diana}');
select test.ok((select read_sections from public.riana_inbound_keys where id = current_setting('test.key2id')::uuid) = '{urgent_questions,calendar,health_diana,final_wishes}'::public.section[], 'read sections are saved (in binder order)');
select test.ok((select details -> 'read_sections' from public.audit_log where entity = 'riana_inbound_keys' and entity_id = current_setting('test.key2id')::uuid order by at desc limit 1) ? 'health_diana', 'granting read sections is audited');
reset role;
select set_config('request.jwt.claims', '', false); set role anon;
select set_config('test.exp', public.riana_export(current_setting('test.key2'))::text, false);
select test.ok(jsonb_array_length(current_setting('test.exp')::jsonb -> 'sections' -> 'urgent_questions') = 5, 'export: granted urgent questions come through');
select test.ok(jsonb_array_length(current_setting('test.exp')::jsonb -> 'sections' -> 'final_wishes') > 0, 'export: granted final wishes come through');
select test.ok(current_setting('test.exp')::jsonb -> 'sections' -> 'health_diana' -> 'lab_results' is not null
           and current_setting('test.exp')::jsonb -> 'sections' -> 'health_diana' -> 'medications' is not null, 'export: Diana health includes labs and medications');
select test.ok(current_setting('test.exp')::jsonb -> 'sections' ? 'health_rich' = false
           and current_setting('test.exp')::jsonb -> 'sections' ? 'legal' = false, 'export: Rich health and legal stay out');
select test.ok(not exists (select 1 from jsonb_array_elements(current_setting('test.exp')::jsonb -> 'sections' -> 'calendar') e where e ->> 'section' in ('health_rich', 'taxes', 'insurance')), 'export: calendar hides appointments from ungranted sections');
select test.ok(current_setting('test.exp')::jsonb -> 'never_exported' ? 'digital_accounts', 'export: says what is never exported');
select test.ok(test.fails($$select public.riana_export(current_setting('test.key2'), '{nonsense}')$$), 'export: unknown section is refused');
select test.ok(test.rows('select * from public.final_wishes') <= 0, 'anon still cannot read tables directly');
reset role;
select test.act(:K, 'aal2'); set role authenticated;
select test.ok((select count(*) from public.audit_log where action = 'export' and entity = 'riana_export' and via = 'riana') = 3, 'every export call is audited via Riana');
select test.ok((select details -> 'sections' from public.audit_log where action = 'export' order by at desc limit 1) ? 'health_diana', 'the audit entry lists the exported sections');
select test.ok((select use_count from public.riana_inbound_keys where id = current_setting('test.key2id')::uuid) = 3, 'export calls count as key usage');
select public.riana_key_set_read_sections(current_setting('test.key2id')::uuid, '{}');
reset role;
select set_config('request.jwt.claims', '', false); set role anon;
select test.ok(public.riana_export(current_setting('test.key2'), '{final_wishes}') -> 'sections' = '{}'::jsonb, 'export: read access can be taken away');
reset role;
\echo 'Riana export tests passed.'
