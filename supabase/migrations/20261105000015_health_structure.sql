-- =============================================================================
-- Health structuring (Update Brief #2, item 8 / §3f).
--  * Medications: daily vs. as-needed (PRN), with a source document and date.
--  * Conditions / allergies / sensitivities: onset date, reaction, source.
--  * VA claim history: letters and decisions as dated timeline entries,
--    each optionally pointing at the imported letter.
-- =============================================================================

alter table public.medications
  add column frequency_kind  text not null default 'daily' check (frequency_kind in ('daily', 'prn', 'weekly', 'other')),
  add column prn_for         text,                                   -- 'migraine', 'nerve pain flare'
  add column max_per_day     text,                                   -- '2 tablets'
  add column source_document text,
  add column source_file_id  uuid references public.imported_files (id),
  add column source_date     date;

alter table public.health_conditions
  drop constraint if exists health_conditions_kind_check,
  add constraint health_conditions_kind_check check (kind in ('condition', 'allergy', 'sensitivity', 'coverage')),
  add column reaction        text,                                   -- for allergies / sensitivities
  add column severity        text check (severity is null or severity in ('mild', 'moderate', 'severe', 'life_threatening')),
  add column status          text not null default 'active' check (status in ('active', 'resolved', 'monitoring')),
  add column source_document text,
  add column source_file_id  uuid references public.imported_files (id),
  add column source_date     date;

alter table public.va_claims
  drop constraint if exists va_claims_kind_check,
  add constraint va_claims_kind_check check (kind in ('claim', 'appeal', 'cp_exam', 'rating_decision', 'letter', 'evidence', 'note')),
  add column event_on        date,                                   -- the date this entry represents on the timeline
  add column imported_file_id uuid references public.imported_files (id),
  add column summary         text;
create index va_claims_event_idx on public.va_claims (event_on);

-- Timeline date: explicit event_on, else decided_on, else filed_on, else created.
create or replace view public.va_claim_timeline with (security_invoker = true) as
  select c.*, coalesce(c.event_on, c.decided_on, c.filed_on, c.created_at::date) as timeline_on
  from public.va_claims c;
grant select on public.va_claim_timeline to authenticated;
