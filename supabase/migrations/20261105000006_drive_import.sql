-- =============================================================================
-- Drive import (Update Brief #2, item 1).
--
-- The app reads Google Drive folders that Karmel has shared Viewer-only with
-- its service account. It never copies file bytes into the database or the
-- repo: each imported_files row is a POINTER (Drive file id, name, size,
-- md5, modifiedTime, target section) plus review state. Re-syncs are
-- idempotent on drive_file_id; a changed modifiedTime/md5 marks the row
-- "updated" instead of creating a second one.
--
-- Access: super admins only (section 'admin'), except that a row whose
-- review_status is 'approved' and whose sensitivity is 'normal' becomes
-- visible to anyone who can read its target section (so an approved journal
-- scan shows in Family History). Sensitive rows (taxes, the Widow Book) never
-- leave the admin view.
-- =============================================================================

create type public.file_sensitivity as enum ('normal', 'admin_only', 'excluded');
create type public.media_kind as enum ('document', 'pdf', 'spreadsheet', 'image', 'audio', 'video', 'form', 'other');

-- The folders the app expects to be able to read, and when it last could.
create table public.drive_folders (
  id               uuid primary key default gen_random_uuid(),
  section          public.section not null default 'admin' check (section = 'admin'),
  key              text not null unique,            -- stable key from the manifest
  drive_folder_id  text not null,
  name             text not null,
  sensitivity      public.file_sensitivity not null default 'normal',
  readable         boolean,                         -- null = never checked
  last_checked_at  timestamptz,
  last_error       text,
  source           public.record_source not null default 'app',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid
);

create table public.drive_sync_runs (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'admin' check (section = 'admin'),
  mode          text not null check (mode in ('dry_run', 'apply', 'access_check')),
  started_by    uuid references public.profiles (id),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  ok            boolean,
  summary       jsonb not null default '{}'::jsonb,   -- counts: created/updated/unchanged/excluded/unmatched
  report        jsonb not null default '[]'::jsonb,   -- one entry per file seen (names + targets, never bytes)
  error         text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index drive_sync_runs_started_idx on public.drive_sync_runs (started_at desc);

create table public.imported_files (
  id               uuid primary key default gen_random_uuid(),
  -- 'section' is what RLS keys on. Rows start in 'admin' and MOVE to their
  -- target section when approved (and only if sensitivity = 'normal').
  section          public.section not null default 'admin',
  target_section   public.section not null,
  media_kind       public.media_kind not null default 'other',
  sensitivity      public.file_sensitivity not null default 'normal',
  drive_file_id    text not null unique,
  drive_folder_key text not null references public.drive_folders (key),
  name             text not null,
  mime_type        text,
  size_bytes       bigint,
  md5              text,
  drive_modified_at timestamptz,
  web_view_link    text,                             -- the Drive link (source of record)
  storage_path     text,                             -- optional cached copy in PRIVATE storage
  manifest_rule    text,                             -- which manifest rule matched
  target_note      text,                             -- e.g. "Properties → Vehicles"
  duplicate_of     uuid references public.imported_files (id),
  review_status    text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by      uuid references public.profiles (id),
  reviewed_at      timestamptz,
  first_imported_at timestamptz not null default now(),
  last_synced_at   timestamptz not null default now(),
  source           public.record_source not null default 'import',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  constraint sensitive_stays_admin check (sensitivity = 'normal' or section = 'admin')
);
create index imported_files_target_idx on public.imported_files (target_section, review_status);
create index imported_files_md5_idx on public.imported_files (md5) where md5 is not null;
create index imported_files_folder_idx on public.imported_files (drive_folder_key);

-- Standard protection (RLS by section, change history, audit).
select app.protect('public.drive_folders');
select app.protect('public.drive_sync_runs');
select app.protect('public.imported_files');

-- Approving a file releases it to its target section; rejecting keeps it in admin.
-- Only super admins may change review_status; the section column is derived.
create or replace function app.guard_imported_file() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.review_status is distinct from old.review_status and not app.is_super_admin() then
    raise exception 'only a super admin can approve or reject an imported file';
  end if;
  if new.sensitivity = 'excluded' then
    new.review_status := 'rejected';
  end if;
  if new.review_status = 'approved' and new.sensitivity = 'normal' then
    new.section := new.target_section;
  else
    new.section := 'admin';
  end if;
  if tg_op = 'UPDATE' and new.review_status is distinct from old.review_status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end $$;
create trigger guard_imported_file before insert or update on public.imported_files
  for each row execute function app.guard_imported_file();

-- The sync job runs server-side as the signed-in super admin (never as anon).
-- Upsert helper so re-runs are idempotent and the "updated" case is explicit.
create or replace function public.drive_upsert_file(
  p_drive_file_id text, p_folder_key text, p_name text, p_mime text, p_size bigint, p_md5 text,
  p_modified timestamptz, p_link text, p_target public.section, p_media public.media_kind,
  p_sensitivity public.file_sensitivity, p_rule text, p_note text
) returns text
language plpgsql security invoker set search_path = '' as $$
declare existing public.imported_files; dup uuid;
begin
  if not app.is_super_admin() then raise exception 'super admins only'; end if;
  select * into existing from public.imported_files where drive_file_id = p_drive_file_id;
  if existing.id is not null then
    if existing.drive_modified_at is not distinct from p_modified and existing.md5 is not distinct from p_md5 then
      update public.imported_files set last_synced_at = now() where id = existing.id;
      return 'unchanged';
    end if;
    update public.imported_files
       set name = p_name, mime_type = p_mime, size_bytes = p_size, md5 = p_md5, drive_modified_at = p_modified,
           web_view_link = p_link, last_synced_at = now()
     where id = existing.id;
    return 'updated';
  end if;
  -- Same content already imported from another folder/file id (e.g. the song in both Drives)?
  select id into dup from public.imported_files
   where p_md5 is not null and md5 = p_md5 and size_bytes = p_size and lower(name) = lower(p_name)
   limit 1;
  insert into public.imported_files (drive_file_id, drive_folder_key, name, mime_type, size_bytes, md5, drive_modified_at,
                                     web_view_link, target_section, media_kind, sensitivity, manifest_rule, target_note, duplicate_of)
  values (p_drive_file_id, p_folder_key, p_name, p_mime, p_size, p_md5, p_modified, p_link, p_target, p_media, p_sensitivity, p_rule, p_note, dup);
  return case when dup is not null then 'duplicate' else 'created' end;
end $$;
revoke all on function public.drive_upsert_file(text, text, text, text, bigint, text, timestamptz, text, public.section, public.media_kind, public.file_sensitivity, text, text) from public, anon;
grant execute on function public.drive_upsert_file(text, text, text, text, bigint, text, timestamptz, text, public.section, public.media_kind, public.file_sensitivity, text, text) to authenticated;
