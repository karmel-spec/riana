-- =============================================================================
-- Vehicles (Update Brief #2, item 6 / §3a): a subsection of Properties.
-- =============================================================================

create table public.vehicles (
  id                   uuid primary key default gen_random_uuid(),
  section              public.section not null default 'properties' check (section = 'properties'),
  year                 smallint check (year between 1900 and 2100),
  make                 text not null,
  model                text,
  nickname             text,
  engine               text,
  vin_last4            char(4) check (vin_last4 ~ '^[0-9A-Za-z]{4}$'),
  estimated_value      numeric(12, 2),
  valuation_on         date,
  valuation_source     text,
  title_location       text,
  owner                public.subject not null default 'both',
  insurance_policy_id  uuid references public.insurance_policies (id),
  estate_provision_id  uuid references public.estate_provisions (id),
  specs_file_id        uuid references public.imported_files (id),
  notes                text,
  source               public.record_source not null default 'app',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  updated_by           uuid
);
create index vehicles_policy_idx on public.vehicles (insurance_policy_id);
create index vehicles_provision_idx on public.vehicles (estate_provision_id);

create table public.vehicle_improvements (
  id               uuid primary key default gen_random_uuid(),
  section          public.section not null default 'properties' check (section = 'properties'),
  vehicle_id       uuid not null references public.vehicles (id) on delete cascade,
  done_on          date,
  done_on_approx   text,                          -- '2019', 'summer 2021' when the exact date is unknown
  description      text not null,
  cost             numeric(12, 2) check (cost is null or cost >= 0),
  vendor           text,
  imported_file_id uuid references public.imported_files (id),
  source           public.record_source not null default 'app',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid
);
create index vehicle_improvements_vehicle_idx on public.vehicle_improvements (vehicle_id, done_on);

select app.protect('public.vehicles');
select app.protect('public.vehicle_improvements');
