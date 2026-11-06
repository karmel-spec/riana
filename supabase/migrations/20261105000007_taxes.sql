-- =============================================================================
-- Taxes section (Update Brief #2, item 2 / §3i).
--
-- * Super Admin only: tax_records moves from section 'taxes' to 'admin'.
--   (The 'taxes' section stays in the enum for future, less sensitive use.)
-- * Identifiers are stored masked at the source: last 4 only, CHECKed.
-- * Each year links to its imported return (a pointer; the PDF stays in
--   Drive / private storage). 2024 is flagged amended (1040-X).
-- * "Where to find it" items for the rental 1099/1098s that live in portals.
-- =============================================================================

alter table public.tax_records
  alter column section set default 'admin',
  drop constraint if exists tax_records_section_check;
update public.tax_records set section = 'admin';
alter table public.tax_records add constraint tax_records_section_check check (section = 'admin');

alter table public.tax_records
  add column amended         boolean not null default false,
  add column amended_form    text,                                   -- e.g. '1040-X'
  add column ssn_last4_rich  char(4) check (ssn_last4_rich  ~ '^[0-9]{4}$'),
  add column ssn_last4_diana char(4) check (ssn_last4_diana ~ '^[0-9]{4}$'),
  add column refund_bank_last4 char(4) check (refund_bank_last4 ~ '^[0-9]{4}$'),
  add column cpa_person_id   uuid references public.people (id),
  add column imported_file_id uuid references public.imported_files (id),
  add column drive_link      text;

-- Belt and braces: no column on this table may ever hold a full SSN or account number.
create or replace function app.guard_tax_record() returns trigger
language plpgsql as $$
declare blob text;
begin
  blob := coalesce(new.notes, '') || ' ' || coalesce(new.status, '') || ' ' || coalesce(new.preparer, '');
  if blob ~ '\d{3}-\d{2}-\d{4}' or blob ~ '\d{9,}' then
    raise exception 'tax records may not contain a full SSN or account number (last 4 only)';
  end if;
  return new;
end $$;
create trigger guard_tax_record before insert or update on public.tax_records
  for each row execute function app.guard_tax_record();

-- Checklist of documents that are NOT stored, only pointed to (portal, mail…).
create table public.tax_source_items (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'admin' check (section = 'admin'),
  tax_year    smallint not null,
  label       text not null,                 -- '1099 · Rental A rents'
  provider    text,                          -- 'Welcome Home', 'MVP', 'Truist', 'Mr. Cooper'
  where_to_find text,                        -- 'Owner portal → Documents → Tax'
  portal_url  text,
  vault_item  text,                          -- name of the 1Password item for the portal login
  received    boolean not null default false,
  received_on date,
  notes       text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  constraint no_secrets check (coalesce(notes, '') !~* '(password|passcode|pin)\s*[:=]')
);
create index tax_source_items_year_idx on public.tax_source_items (tax_year);
select app.protect('public.tax_source_items');

-- Views/downloads of a return are logged by the app through app.log_event('view'/'download').
