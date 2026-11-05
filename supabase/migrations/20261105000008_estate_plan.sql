-- =============================================================================
-- Estate Plan tracker (Update Brief #2, item 3 / §3d) and note terms on loans.
--
-- A plan VERSION is a dated snapshot of what the family intends (from the
-- attorney's strategic summary and the family agreement notes). Each
-- PROVISION in it says what is planned for one asset/role/term and may point
-- at the signed document that implements it (legal_documents). A CONFLICT is
-- an open question with an owner and a status. All in section 'legal'.
-- =============================================================================

create table public.estate_plan_versions (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'legal' check (section = 'legal'),
  version_no  int not null,
  title       text not null,
  plan_date   date not null,
  status      text not null default 'current' check (status in ('draft', 'current', 'superseded')),
  source_docs text[] not null default '{}',     -- names of the documents the version came from
  summary     text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (version_no)
);

create table public.estate_provisions (
  id                uuid primary key default gen_random_uuid(),
  section           public.section not null default 'legal' check (section = 'legal'),
  plan_version_id   uuid not null references public.estate_plan_versions (id) on delete cascade,
  category          text not null check (category in ('asset', 'role', 'term')),
  subject           text not null,              -- 'WA rentals (StarLar)', 'Successor trustee'
  planned           text not null,              -- what the plan says
  legal_document_id uuid references public.legal_documents (id),   -- the signed doc that implements it, if any
  sort_order        int not null default 0,
  notes             text,
  source            public.record_source not null default 'app',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);
create index estate_provisions_version_idx on public.estate_provisions (plan_version_id, sort_order);
create index estate_provisions_doc_idx on public.estate_provisions (legal_document_id);

create table public.plan_conflicts (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'legal' check (section = 'legal'),
  plan_version_id uuid references public.estate_plan_versions (id) on delete set null,
  provision_id  uuid references public.estate_provisions (id) on delete set null,
  title         text not null,
  detail        text,
  owner_name    text,
  status        text not null default 'open' check (status in ('open', 'with_attorney', 'decided', 'resolved')),
  resolution    text,
  due_on        date,
  sort_order    int not null default 0,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index plan_conflicts_status_idx on public.plan_conflicts (status);

select app.protect('public.estate_plan_versions');
select app.protect('public.estate_provisions');
select app.protect('public.plan_conflicts');

-- Loans gain the fields needed for amortization and document links.
alter table public.loans
  add column term_months       int check (term_months is null or term_months between 1 and 600),
  add column monthly_payment   numeric(10, 2) check (monthly_payment is null or monthly_payment > 0),
  add column first_payment_on  date,
  add column legal_document_id uuid references public.legal_documents (id),
  add column imported_file_id  uuid references public.imported_files (id),
  add column advance_on_inheritance text check (advance_on_inheritance in ('yes', 'no', 'undecided'));
create index loans_legal_doc_idx on public.loans (legal_document_id);
create index loans_imported_file_idx on public.loans (imported_file_id);
