-- Collections: Mom's books, photo collections, iMemories transfers and the
-- digital family history. Each item is either a link (where it lives online)
-- or a note of where the physical thing is kept, or both.
create table public.collections (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'family_history' check (section = 'family_history'),
  category      text not null check (category in ('book', 'photos', 'imemories', 'digital_history', 'other')),
  title         text not null,
  owner         public.subject not null default 'diana',
  url           text check (url is null or url ~* '^https://'),
  location      text,                               -- "Hall closet, top shelf", "External drive in the safe"
  period        text,                               -- "1970s", "2001–2009"
  note          text,
  added_by_name text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index collections_category_idx on public.collections (category, created_at);
select app.protect('public.collections');
