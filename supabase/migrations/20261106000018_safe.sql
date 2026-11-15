-- The Safe: what is kept in the home safe (and any other safe or deposit box),
-- where it is, and who can open it. The combination itself is NEVER stored
-- here; it lives in the password vault and is referenced by item name only.
create table public.safe_items (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'accounts' check (section = 'accounts'),
  safe_name     text not null default 'Home safe',          -- "Home safe", "Fireproof box", "Bank deposit box"
  category      text not null default 'other' check (category in ('document', 'cash', 'keys', 'jewelry', 'media', 'other')),
  name          text not null,
  detail        text,
  confirmed_on  date,                                        -- last time someone checked it was there
  added_by_name text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index safe_items_safe_idx on public.safe_items (safe_name, category);
select app.protect('public.safe_items');
-- No combinations, codes or full account numbers: same rule as the accounts directory.
alter table public.safe_items add constraint safe_no_secrets check (
  (coalesce(name, '') || ' ' || coalesce(detail, '')) !~ '[0-9]{5,}'
);
