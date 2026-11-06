-- LOCAL TESTING ONLY: fake accounts for the RLS tests.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'karmel@test.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'heather@test.invalid'),
  ('33333333-3333-4333-8333-333333333333', 'rich@test.invalid'),
  ('44444444-4444-4444-8444-444444444444', 'diana@test.invalid'),
  ('55555555-5555-4555-8555-555555555555', 'david@test.invalid'),
  ('66666666-6666-4666-8666-666666666666', 'grandkid@test.invalid'),
  ('77777777-7777-4777-8777-777777777777', 'attorney@test.invalid'),
  ('88888888-8888-4888-8888-888888888888', 'expired-cpa@test.invalid');
insert into public.profiles (id, display_name, app_role, is_subject, access_expires_at) values
  ('11111111-1111-4111-8111-111111111111', 'Karmel', 'super_admin', null, null),
  ('22222222-2222-4222-8222-222222222222', 'Heather', 'super_admin', null, null),
  ('33333333-3333-4333-8333-333333333333', 'Rich', 'parent', 'rich', null),
  ('44444444-4444-4444-8444-444444444444', 'Diana', 'parent', 'diana', null),
  ('55555555-5555-4555-8555-555555555555', 'David', 'family', null, null),
  ('66666666-6666-4666-8666-666666666666', 'Grandchild', 'posterity', null, null),
  ('77777777-7777-4777-8777-777777777777', 'Estate attorney', 'professional', null, now() + interval '60 days'),
  ('88888888-8888-4888-8888-888888888888', 'Old CPA', 'professional', null, now() - interval '1 day');
-- Each parent sees (and can update) their own health section.
insert into public.user_section_access (user_id, section, level, reason) values
  ('33333333-3333-4333-8333-333333333333', 'health_rich', 'write', 'own records'),
  ('44444444-4444-4444-8444-444444444444', 'health_diana', 'write', 'own records'),
  ('77777777-7777-4777-8777-777777777777', 'legal', 'read', 'estate planning engagement'),
  ('88888888-8888-4888-8888-888888888888', 'taxes', 'read', '2025 return');
-- The mfa_switch migration ships with 2-step verification OFF so a fresh
-- project is usable before anyone has an authenticator. The suite tests the
-- gate, so turn it on here. Production: update app.settings set value='true' where key='mfa_required';
update app.settings set value = 'true'::jsonb where key = 'mfa_required';
