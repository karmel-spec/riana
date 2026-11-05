-- =============================================================================
-- Greene Family Legacy · Binder records
-- Every table carries a `section` (fixed, or derived from whose record it is)
-- and is wrapped by app.protect(), which turns on RLS + change history.
--
-- Hard rules encoded here:
--   * No SSNs, birthdates, passwords or full account numbers: there are no
--     columns for them. Account / policy numbers are last-4 only (CHECKed).
--   * Logins are referenced by the NAME of a password-vault item only.
-- =============================================================================

-- Shared column block (written out per table so each stays readable):
--   id, section, source, created_at, updated_at, updated_by

-- Map a person (Rich / Diana) to their health section.
create or replace function app.health_section(p public.subject) returns public.section
language sql immutable as $$
  select case p when 'rich' then 'health_rich'::public.section else 'health_diana'::public.section end
$$;

-- ---------------------------------------------------------------------------
-- 1. Urgent questions
-- ---------------------------------------------------------------------------
create type public.question_status as enum ('open', 'asked', 'partly_answered', 'answered', 'closed');

create table public.urgent_questions (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'urgent_questions' check (section = 'urgent_questions'),
  question    text not null,
  topic       public.section,                -- what it's about (legal, health_rich…)
  asked_of    public.subject not null default 'both',
  owner_id    uuid references public.profiles (id),
  owner_name  text,                          -- fallback before accounts exist
  priority    text not null default 'normal' check (priority in ('high', 'normal')),
  status      public.question_status not null default 'open',
  answer      text,
  answered_by public.subject,
  answered_at timestamptz,
  due_on      date,
  sort_order  int not null default 0,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- ---------------------------------------------------------------------------
-- 2. Calendar (an appointment's section follows its topic, so a cardiology
--    visit is only visible to people who can see Diana's health)
-- ---------------------------------------------------------------------------
create table public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'calendar',
  title       text not null,
  kind        text not null default 'appointment' check (kind in ('appointment', 'deadline', 'renewal', 'family', 'other')),
  about       public.subject not null default 'household',
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text,
  driver      text,
  remind_days int[] not null default '{7,1}',
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index calendar_events_starts_idx on public.calendar_events (starts_at);

-- ---------------------------------------------------------------------------
-- 3 & 16. People, groups, who-to-notify
-- ---------------------------------------------------------------------------
create type public.contact_method as enum ('phone', 'text', 'email', 'mail', 'in_person');

create table public.contact_groups (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'contacts' check (section = 'contacts'),
  name        text not null unique,
  kind        text not null check (kind in ('family', 'friends', 'church', 'club', 'neighbors', 'military', 'professional', 'other')),
  description text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.people (
  id               uuid primary key default gen_random_uuid(),
  section          public.section not null default 'contacts' check (section = 'contacts'),
  full_name        text not null,
  relationship     text,
  connected_to     public.subject not null default 'both',
  email            text,
  phone            text,
  city             text,
  region           text,
  closeness        smallint check (closeness between 1 and 5),  -- 1 = closest
  last_contact_on  date,
  preferred_method public.contact_method,
  notify_first     boolean not null default false,
  confirmed        boolean not null default false,
  confirmed_by     public.subject,
  confirmed_at     timestamptz,
  is_professional  boolean not null default false,
  notes            text,
  source           public.record_source not null default 'app',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid
);
create index people_name_idx on public.people (lower(full_name));

create table public.person_groups (
  id         uuid primary key default gen_random_uuid(),
  section    public.section not null default 'contacts' check (section = 'contacts'),
  person_id  uuid not null references public.people (id) on delete cascade,
  group_id   uuid not null references public.contact_groups (id) on delete cascade,
  source     public.record_source not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (person_id, group_id)
);

create table public.notification_lists (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'notify' check (section = 'notify'),
  name        text not null,
  purpose     text not null check (purpose in ('funeral', 'hospitalization', 'news', 'other')),
  description text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.notification_list_members (
  id         uuid primary key default gen_random_uuid(),
  section    public.section not null default 'notify' check (section = 'notify'),
  list_id    uuid not null references public.notification_lists (id) on delete cascade,
  person_id  uuid not null references public.people (id) on delete cascade,
  wave       smallint not null default 2 check (wave between 1 and 3),  -- 1 = tell first
  source     public.record_source not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (list_id, person_id)
);

-- A "send" against a list. Bulk sends need a SECOND super admin's approval.
create table public.notification_campaigns (
  id           uuid primary key default gen_random_uuid(),
  section      public.section not null default 'notify' check (section = 'notify'),
  list_id      uuid not null references public.notification_lists (id),
  title        text not null,
  message      text not null default '',
  status       text not null default 'draft' check (status in ('draft', 'awaiting_approval', 'approved', 'sending', 'sent', 'cancelled')),
  requested_by uuid references public.profiles (id),
  approved_by  uuid references public.profiles (id),
  approved_at  timestamptz,
  sent_at      timestamptz,
  source       public.record_source not null default 'app',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  constraint approver_differs check (approved_by is null or approved_by is distinct from requested_by)
);

create type public.recipient_status as enum ('not_sent', 'sent', 'replied', 'attending', 'not_attending');

create table public.notification_recipients (
  id           uuid primary key default gen_random_uuid(),
  section      public.section not null default 'notify' check (section = 'notify'),
  campaign_id  uuid not null references public.notification_campaigns (id) on delete cascade,
  person_id    uuid not null references public.people (id),
  status       public.recipient_status not null default 'not_sent',
  contacted_by text,
  contacted_at timestamptz,
  note         text,
  source       public.record_source not null default 'app',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  unique (campaign_id, person_id)
);

-- Status changes to 'approved' / 'sending' may only be made by a super admin
-- who did not request the send.
create or replace function app.guard_campaign() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('approved', 'sending', 'sent') and old.status is distinct from new.status then
    if not app.is_super_admin() then
      raise exception 'only a super admin can approve or send a notification';
    end if;
    if new.status = 'approved' then
      if new.requested_by = auth.uid() then
        raise exception 'a different super admin must approve this send';
      end if;
      new.approved_by := auth.uid();
      new.approved_at := now();
    end if;
    if new.status in ('sending', 'sent') and old.status not in ('approved', 'sending') then
      raise exception 'this send has not been approved';
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 4 & 5. Health (Diana / Rich)
-- ---------------------------------------------------------------------------
create table public.providers (
  id          uuid primary key default gen_random_uuid(),
  patient     public.subject not null check (patient in ('rich', 'diana')),
  section     public.section generated always as (app.health_section(patient)) stored,
  name        text not null,
  specialty   text,
  practice    text,
  phone       text,
  portal_name text,
  is_va       boolean not null default false,
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.medications (
  id          uuid primary key default gen_random_uuid(),
  patient     public.subject not null check (patient in ('rich', 'diana')),
  section     public.section generated always as (app.health_section(patient)) stored,
  name        text not null,
  dose        text,
  schedule    text,
  purpose     text,
  prescriber_id uuid references public.providers (id),
  started_on  date,
  stopped_on  date,
  active      boolean not null default true,
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.health_conditions (
  id          uuid primary key default gen_random_uuid(),
  patient     public.subject not null check (patient in ('rich', 'diana')),
  section     public.section generated always as (app.health_section(patient)) stored,
  kind        text not null check (kind in ('condition', 'allergy', 'coverage')),
  name        text not null,
  detail      text,
  since       date,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.lab_results (
  id          uuid primary key default gen_random_uuid(),
  patient     public.subject not null check (patient in ('rich', 'diana')),
  section     public.section generated always as (app.health_section(patient)) stored,
  test_name   text not null,
  value       numeric not null,
  unit        text,
  ref_low     numeric,
  ref_high    numeric,
  flag        text generated always as (
                case when ref_high is not null and value > ref_high then 'high'
                     when ref_low  is not null and value < ref_low  then 'low'
                     else 'normal' end) stored,
  taken_on    date not null,
  provider_id uuid references public.providers (id),
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index lab_results_test_idx on public.lab_results (patient, test_name, taken_on);

create table public.visit_notes (
  id          uuid primary key default gen_random_uuid(),
  patient     public.subject not null check (patient in ('rich', 'diana')),
  section     public.section generated always as (app.health_section(patient)) stored,
  visit_on    date not null,
  provider_id uuid references public.providers (id),
  summary     text not null,
  follow_up   text,
  author_name text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- Rich's VA disability claims, appeals and C&P exams.
create table public.va_claims (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'health_rich' check (section = 'health_rich'),
  kind        text not null check (kind in ('claim', 'appeal', 'cp_exam', 'rating_decision')),
  title       text not null,
  status      text not null,
  filed_on    date,
  decided_on  date,
  rating_pct  smallint check (rating_pct between 0 and 100),
  next_step   text,
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- ---------------------------------------------------------------------------
-- 6–10. Properties, accounts, loans, bills, insurance, taxes
-- ---------------------------------------------------------------------------
create table public.properties (
  id               uuid primary key default gen_random_uuid(),
  section          public.section not null default 'properties' check (section = 'properties'),
  name             text not null,
  kind             text not null check (kind in ('residence', 'rental', 'land', 'other')),
  address          text,
  held_by          text,                -- e.g. "Rich & Diana", "StarLar LLC"
  succession_plan  text,                -- e.g. "50/50 Mike Starkey & Karmel Larson, outside the will"
  manager_person_id uuid references public.people (id),
  hoa_name         text,
  notes            text,
  source           public.record_source not null default 'app',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid
);

create table public.accounts (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'accounts' check (section = 'accounts'),
  institution text not null,
  kind        text not null check (kind in ('checking', 'savings', 'brokerage', 'retirement', 'credit_card', 'loan', 'other')),
  purpose     text,
  last4       char(4) check (last4 ~ '^[0-9]{4}$'),
  held_by     public.subject not null default 'both',
  beneficiary_notes text,
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- Mortgages (owed BY the estate) and loans to children (owed TO the estate).
create table public.loans (
  id            uuid primary key default gen_random_uuid(),
  direction     text not null check (direction in ('owed_to_estate', 'owed_by_estate')),
  section       public.section generated always as (
                  case direction when 'owed_by_estate' then 'properties'::public.section
                                 else 'accounts'::public.section end) stored,
  counterparty  text not null,          -- borrower or lender
  property_id   uuid references public.properties (id),
  principal     numeric(12, 2),
  rate_pct      numeric(5, 3),
  started_on    date,
  status        text not null check (status in ('proposed', 'active', 'paid_off', 'forgiven')),
  note_signed   boolean not null default false,
  balance_note  text,
  notes         text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

create table public.bills (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'bills' check (section = 'bills'),
  payee         text not null,
  category      text,
  property_id   uuid references public.properties (id),
  amount        numeric(10, 2),
  frequency     text not null default 'monthly' check (frequency in ('monthly', 'quarterly', 'semiannual', 'annual', 'one_time')),
  next_due_on   date,
  autopay       boolean not null default false,
  paid_from_account_id uuid references public.accounts (id),
  status        text not null default 'upcoming' check (status in ('upcoming', 'paid', 'failed', 'overdue')),
  last_paid_on  date,
  notes         text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

create table public.insurance_policies (
  id           uuid primary key default gen_random_uuid(),
  section      public.section not null default 'insurance' check (section = 'insurance'),
  kind         text not null check (kind in ('auto', 'home', 'classic_car', 'umbrella', 'medicare', 'supplemental', 'champva', 'life', 'landlord', 'other')),
  carrier      text not null,
  insured      public.subject not null default 'both',
  policy_last4 char(4) check (policy_last4 ~ '^[0-9A-Za-z]{4}$'),
  premium      numeric(10, 2),
  renews_on    date,
  agent_person_id uuid references public.people (id),
  notes        text,
  source       public.record_source not null default 'app',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid
);

create table public.tax_records (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'taxes' check (section = 'taxes'),
  tax_year    smallint not null,
  kind        text not null check (kind in ('federal', 'state', 'property', 'exemption', 'other')),
  preparer    text,
  status      text not null,
  filed_on    date,
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- ---------------------------------------------------------------------------
-- 11. Legal & estate documents (status board)
-- ---------------------------------------------------------------------------
create type public.legal_status as enum ('not_started', 'drafted', 'signed', 'recorded', 'superseded');

create table public.legal_documents (
  id                uuid primary key default gen_random_uuid(),
  section           public.section not null default 'legal' check (section = 'legal'),
  doc_type          text not null check (doc_type in ('will', 'trust', 'financial_poa', 'healthcare_poa', 'directive', 'tod_deed', 'easement', 'promissory_note', 'operating_agreement', 'court_filing', 'other')),
  title             text not null,
  principal         public.subject not null default 'both',
  status            public.legal_status not null default 'not_started',
  needs_recording   boolean not null default false,
  prepared_by       text,
  drafted_on        date,
  signed_on         date,
  recorded_on       date,
  original_location text,
  open_issue        text,
  notes             text,
  sort_order        int not null default 0,
  source            public.record_source not null default 'app',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);

-- ---------------------------------------------------------------------------
-- 12. Final wishes
-- ---------------------------------------------------------------------------
create table public.final_wishes (
  id           uuid primary key default gen_random_uuid(),
  section      public.section not null default 'final_wishes' check (section = 'final_wishes'),
  person       public.subject not null check (person in ('rich', 'diana', 'both')),
  topic        text not null check (topic in ('disposition', 'burial_place', 'service', 'music', 'speakers', 'obituary', 'organ_donation', 'military_honors', 'va_benefits', 'other')),
  wish         text not null,
  confirmed    boolean not null default false,
  confirmed_on date,
  source       public.record_source not null default 'app',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid
);

-- ---------------------------------------------------------------------------
-- 13–15. Digital accounts, household, next steps
-- ---------------------------------------------------------------------------
create table public.digital_accounts (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'digital_accounts' check (section = 'digital_accounts'),
  service     text not null,
  owner       public.subject not null default 'both',
  purpose     text,
  vault_item  text,              -- the NAME of the 1Password item, never a credential
  after_death text,              -- memorialize / close / transfer
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  constraint no_secrets check (
    coalesce(notes, '') !~* '(password|passcode|pin)\s*[:=]'
    and coalesce(vault_item, '') !~* '(password|passcode|pin)\s*[:=]')
);

create table public.household_items (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'household' check (section = 'household'),
  kind        text not null check (kind in ('pet', 'vehicle', 'heirloom', 'service', 'other')),
  name        text not null,
  details     text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.next_steps (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'next_steps' check (section = 'next_steps'),
  title       text not null,
  owner_name  text,
  due_on      date,
  done        boolean not null default false,
  sort_order  int not null default 0,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- ---------------------------------------------------------------------------
-- Files, family history archive
-- ---------------------------------------------------------------------------
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null,
  title         text not null,
  storage_path  text not null,           -- key inside the PRIVATE storage bucket
  mime_type     text,
  size_bytes    bigint,
  legal_document_id uuid references public.legal_documents (id),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by   uuid references public.profiles (id),
  uploaded_by   uuid references public.profiles (id) default auth.uid(),
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

-- Per-document grants (e.g. the estate attorney sees two files, nothing else).
create table public.document_grants (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  expires_at  timestamptz not null,
  granted_by  uuid references public.profiles (id) default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (document_id, user_id)
);

create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'family_history' check (section = 'family_history'),
  author      public.subject not null,
  title       text,
  written_on  date,
  written_on_approx text,
  ocr_text    text,
  document_id uuid references public.documents (id),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.media_items (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'family_history' check (section = 'family_history'),
  kind        text not null check (kind in ('photo', 'video', 'audio_story', 'video_story')),
  caption     text,
  story       text,
  taken_on    date,
  decade      smallint,
  event_name  text,
  people_tags text[] not null default '{}',
  document_id uuid references public.documents (id),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'family_history' check (section = 'family_history'),
  happened_on date,
  year        smallint not null,
  title       text not null,
  description text,
  media_item_id uuid references public.media_items (id),
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

-- ---------------------------------------------------------------------------
-- Riana inbound updates (Phase 2). Nothing here touches real records until a
-- super admin approves it; the applied record is then stamped source='riana'.
-- ---------------------------------------------------------------------------
create table public.riana_updates (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'admin' check (section = 'admin'),
  kind          text not null check (kind in ('appointment', 'lab_result', 'bill', 'urgent_question', 'document', 'note')),
  summary       text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by   uuid references public.profiles (id),
  reviewed_at   timestamptz,
  applied_table text,
  applied_id    uuid,
  source        public.record_source not null default 'riana',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

-- ---------------------------------------------------------------------------
-- Protect every records table.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'urgent_questions', 'calendar_events', 'contact_groups', 'people', 'person_groups',
    'notification_lists', 'notification_list_members', 'notification_campaigns',
    'notification_recipients', 'providers', 'medications', 'health_conditions',
    'lab_results', 'visit_notes', 'va_claims', 'properties', 'accounts', 'loans',
    'bills', 'insurance_policies', 'tax_records', 'legal_documents', 'final_wishes',
    'digital_accounts', 'household_items', 'next_steps', 'documents',
    'journal_entries', 'media_items', 'timeline_events', 'riana_updates'
  ] loop
    perform app.protect(('public.' || t)::regclass);
  end loop;
end $$;

create trigger guard_campaign before update on public.notification_campaigns
  for each row execute function app.guard_campaign();

-- Documents: also readable by an explicit, unexpired per-document grant.
create policy read_by_document_grant on public.documents for select to authenticated
  using (exists (select 1 from public.document_grants g
                 where g.document_id = documents.id and g.user_id = auth.uid()
                   and g.expires_at > now())
         and app.my_role() is not null);

-- Pending uploads / journal pages / media are visible only to super admins
-- and the person who uploaded them, until approved.
create policy hide_pending_documents on public.documents as restrictive for select to authenticated
  using (review_status = 'approved' or app.is_super_admin() or uploaded_by = auth.uid());
create policy hide_pending_journals on public.journal_entries as restrictive for select to authenticated
  using (review_status = 'approved' or app.is_super_admin() or updated_by = auth.uid());
create policy hide_pending_media on public.media_items as restrictive for select to authenticated
  using (review_status = 'approved' or app.is_super_admin() or updated_by = auth.uid());
-- Only super admins may approve.
create or replace function app.guard_review() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.review_status is distinct from coalesce(old.review_status, 'pending')
     and new.review_status <> 'pending' and not app.is_super_admin() then
    raise exception 'only a super admin can approve or reject';
  end if;
  return new;
end $$;
create trigger guard_review_documents before insert or update on public.documents
  for each row execute function app.guard_review();
create trigger guard_review_journals before insert or update on public.journal_entries
  for each row execute function app.guard_review();
create trigger guard_review_media before insert or update on public.media_items
  for each row execute function app.guard_review();

alter table public.document_grants enable row level security;
create policy dg_admin on public.document_grants for all to authenticated
  using (app.is_super_admin()) with check (app.is_super_admin());
create policy dg_self on public.document_grants for select to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.document_grants to authenticated;
create trigger track_dg after insert or update or delete on public.document_grants
  for each row execute function app.track_permission_change();

-- Riana's inbox is super-admin only (section 'admin' is sensitive and only
-- super admins have it), which app.protect already enforces.
