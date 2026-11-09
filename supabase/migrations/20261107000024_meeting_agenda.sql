-- Meeting agenda: questions and documents to review with Rich and Diana at the next estate-planning meeting.
create table public.meeting_agenda (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'legal' check (section = 'legal'),
  kind        text not null check (kind in ('question', 'document', 'note')),
  text        text not null,
  detail      text,
  file_id     uuid references public.imported_files (id) on delete set null,
  question_id uuid references public.urgent_questions (id) on delete set null,
  status      text not null default 'open' check (status in ('open', 'discussed', 'resolved')),
  outcome     text,
  sort_order  int not null default 100,
  added_by_name text,
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
select app.protect('public.meeting_agenda');
create index meeting_agenda_status_idx on public.meeting_agenda (status, sort_order, created_at);
