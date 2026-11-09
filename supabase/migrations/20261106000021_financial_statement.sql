-- Personal financial statement: the few figures the binder never had a column
-- for. Balances and values are last-known, with an as-of date, so the statement
-- can say how stale it is. Income sources feed the monthly cash-flow view.
alter table public.accounts
  add column if not exists balance numeric(14, 2),
  add column if not exists balance_as_of date;
alter table public.properties
  add column if not exists estimated_value numeric(14, 2),
  add column if not exists valuation_on date,
  add column if not exists valuation_source text;
create table if not exists public.income_sources (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'accounts' check (section = 'accounts'),
  name          text not null,
  owner         public.subject not null default 'both',
  amount_monthly numeric(12, 2) check (amount_monthly is null or amount_monthly >= 0),
  kind          text not null default 'other' check (kind in ('pension', 'social_security', 'va', 'rental', 'annuity', 'loan_repayment', 'other')),
  taxable       boolean,
  survivor_note text,                       -- what happens to it at the first death
  note          text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
select app.protect('public.income_sources');
