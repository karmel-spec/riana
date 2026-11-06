-- Journals: links to journals, blogs and diaries that live elsewhere (a Google
-- Doc, a Blogger export, a Drive folder of scanned pages). The app keeps the
-- link and a description; the writing stays where it is.
create table public.journals (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'family_history' check (section = 'family_history'),
  title         text not null,
  url           text not null check (url ~* '^https://'),
  author        public.subject not null default 'both',
  kind          text not null default 'other' check (kind in ('blog', 'google_doc', 'drive_folder', 'scan', 'other')),
  period        text,                               -- "2008–2016", "Mission years"
  note          text,
  added_by_name text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create unique index journals_url_idx on public.journals (url);
select app.protect('public.journals');

-- The two links the family asked for on day one. Document and folder ids are
-- public identifiers for private files; they reveal nothing by themselves.
insert into public.journals (title, url, author, kind, period, note, added_by_name)
values
  ('Diana''s blog (Blogger) — full history', 'https://docs.google.com/document/d/1tuJPC_OF9Mr0u9Y3MR0ARMtT8CVHSPEVZAYBMKyjFUo/edit', 'diana', 'google_doc', null, 'Every post from Diana''s Blogger blog, gathered into one Google Doc.', 'Karmel'),
  ('Diana''s journals (Drive folder)', 'https://drive.google.com/drive/folders/1Ft3LC45lZ7nsxp7AUajBbGgPyqf0dnXF', 'diana', 'drive_folder', null, 'The "Diana Greene" Drive folder: her journals and scanned pages.', 'Karmel'),
  ('Rich''s journals (Drive folder)', 'https://drive.google.com/drive/folders/10PilPvLEtxZhM5upnvG2MQaIyNMCc8c_', 'rich', 'drive_folder', null, 'The "Rich Greene" Drive folder: his journals and scanned pages.', 'Karmel')
on conflict (url) do nothing;
