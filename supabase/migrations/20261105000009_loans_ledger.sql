-- =============================================================================
-- Loans ledger (Update Brief #2, item 4 / §3b, §3e).
-- Payments recorded per loan; appraisal fields for mortgages; a status for
-- "we haven't decided whether this is a gift or a loan".
-- =============================================================================

alter table public.loans drop constraint if exists loans_status_check;
alter table public.loans add constraint loans_status_check
  check (status in ('proposed', 'unclassified', 'active', 'paid_off', 'forgiven'));

alter table public.loans
  add column lender            text,                    -- for owed_by_estate: who we owe (Navy Federal…)
  add column purpose           text,                    -- 'casita', 'rental purchase'
  add column appraisal_on      date,
  add column appraisal_value   numeric(12, 2),
  add column appraisal_source  text,                    -- 'Navy Federal AVM'
  add column gift_or_loan      text check (gift_or_loan in ('gift', 'loan', 'undecided')),
  add column matured_on        date;

create table public.loan_payments (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'accounts' check (section = 'accounts'),
  loan_id     uuid not null references public.loans (id) on delete cascade,
  paid_on     date not null,
  amount      numeric(12, 2) not null check (amount > 0),
  kind        text not null default 'payment' check (kind in ('payment', 'interest_only', 'principal_only', 'forgiveness', 'adjustment')),
  note        text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index loan_payments_loan_idx on public.loan_payments (loan_id, paid_on);
select app.protect('public.loan_payments');

-- Balance helper used by the ledger view: principal minus recorded principal
-- (interest is not tracked here for simple family notes; the amortization
-- engine in the app handles the StarLar notes with real schedules).
create or replace view public.loan_balances with (security_invoker = true) as
  select l.id as loan_id,
         l.principal,
         coalesce(sum(case when p.kind in ('payment', 'principal_only', 'forgiveness', 'adjustment') then p.amount else 0 end), 0) as paid,
         l.principal - coalesce(sum(case when p.kind in ('payment', 'principal_only', 'forgiveness', 'adjustment') then p.amount else 0 end), 0) as simple_balance,
         count(p.id) as payment_count,
         max(p.paid_on) as last_paid_on
  from public.loans l left join public.loan_payments p on p.loan_id = l.id
  group by l.id;
grant select on public.loan_balances to authenticated;
