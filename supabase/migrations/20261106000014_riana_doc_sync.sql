-- =============================================================================
-- Riana Drive sync (Phase 1 of the Riana integration).
--
-- Riana keeps the family's running notes in Google Docs (the "Greene Family
-- Binder" doc and any others a super admin registers here). The app reads
-- each doc through the same read-only service account the Drive import uses,
-- splits it into lines under headings, and proposes each new line as a
-- pending riana_updates row. Nothing touches a binder record until a super
-- admin approves it on Admin → Updates from Riana.
--
--   * riana_doc_sources: which docs to read, and when each was last read.
--     Super admins only (section 'admin'); normal change history and audit.
--   * Proposals carry external_ref = 'gdoc:<doc id>:<hash of heading + line>',
--     so a re-sync never proposes the same line twice, and a line that was
--     rejected stays rejected. riana_updates.external_ref already exists and
--     is unique (migration 0005).
--   * Runs are recorded in drive_sync_runs with mode 'riana_doc'.
-- =============================================================================

create table public.riana_doc_sources (
  id                uuid primary key default gen_random_uuid(),
  section           public.section not null default 'admin' check (section = 'admin'),
  name              text not null check (length(name) between 1 and 120),
  drive_file_id     text not null unique check (length(drive_file_id) between 10 and 200),
  enabled           boolean not null default true,
  last_synced_at    timestamptz,
  last_modified_at  timestamptz,            -- the doc's modifiedTime at the last sync
  last_proposed     integer not null default 0,
  last_error        text,
  source            public.record_source not null default 'app',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);

select app.protect('public.riana_doc_sources');

alter table public.drive_sync_runs drop constraint if exists drive_sync_runs_mode_check;
alter table public.drive_sync_runs add constraint drive_sync_runs_mode_check
  check (mode in ('dry_run', 'apply', 'access_check', 'riana_doc'));
