-- Photos of properties and vehicles. The app keeps links only (Google Photos,
-- Drive, iMemories); nothing is uploaded or copied into the database.
create table public.asset_photos (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'properties' check (section = 'properties'),
  asset_kind  text not null check (asset_kind in ('property', 'vehicle')),
  asset_id    uuid not null,
  url         text not null check (url ~* '^https://'),
  caption     text,
  taken_on    date,
  added_by_name text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index asset_photos_asset_idx on public.asset_photos (asset_kind, asset_id, created_at);
select app.protect('public.asset_photos');
