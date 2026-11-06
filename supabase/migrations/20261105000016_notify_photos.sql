-- =============================================================================
-- Who-to-Notify additions through the review queue, and Photos (Takeout)
-- ingestion (Update Brief #2, item 9 / §3h, §3j).
--  * Riana (or a super admin pasting the binder list) proposes contacts; nothing
--    lands in People until a super admin approves it. Approval stamps source='riana'.
--  * Shared album links are saved as references in Family History.
--  * Final wishes can point at a contact (e.g. the memorial park) and carry detail.
--  * Imported photos keep the EXIF / Takeout "taken at" date; photos dedupe by
--    content hash regardless of file name.
-- =============================================================================

-- --- Riana inbox: new kinds -------------------------------------------------------
alter table public.riana_updates drop constraint if exists riana_updates_kind_check;
alter table public.riana_updates add constraint riana_updates_kind_check
  check (kind in ('appointment', 'lab_result', 'bill', 'urgent_question', 'document', 'note', 'contact', 'album'));

create or replace function public.riana_inbound(
  p_key text, p_kind text, p_summary text, p_payload jsonb default '{}'::jsonb, p_external_ref text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_key_id uuid;
  v_id     uuid;
begin
  select id into v_key_id from public.riana_inbound_keys
  where key_hash = app.hash_inbound_key(coalesce(p_key, '')) and revoked_at is null;
  if v_key_id is null then
    raise exception 'invalid inbound key' using errcode = '28000';
  end if;
  if p_kind is null or p_kind not in ('appointment', 'lab_result', 'bill', 'urgent_question', 'document', 'note', 'contact', 'album') then
    raise exception 'unknown kind' using errcode = '22023';
  end if;
  if p_summary is null or length(trim(p_summary)) not between 1 and 500 then
    raise exception 'summary must be 1–500 characters' using errcode = '22023';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be a JSON object' using errcode = '22023';
  end if;
  if length(p_payload::text) > 20000 then
    raise exception 'payload too large' using errcode = '22023';
  end if;
  update public.riana_inbound_keys set last_used_at = now(), use_count = use_count + 1 where id = v_key_id;
  if p_external_ref is not null then
    select id into v_id from public.riana_updates where external_ref = p_external_ref;
    if v_id is not null then return v_id; end if;
  end if;
  insert into public.riana_updates (kind, summary, payload, external_ref)
  values (p_kind, trim(p_summary), p_payload, p_external_ref)
  returning id into v_id;
  return v_id;
end $$;

-- --- Shared album references (Family History) ------------------------------------------
create table public.shared_albums (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'family_history' check (section = 'family_history'),
  title         text not null,
  url           text not null check (url ~* '^https://'),
  provider      text not null default 'google_photos' check (provider in ('google_photos', 'icloud', 'other')),
  note          text,
  added_by_name text,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create unique index shared_albums_url_idx on public.shared_albums (url);
select app.protect('public.shared_albums');

-- --- Final wishes: link a contact (memorial park, funeral home) and keep detail ---------
alter table public.final_wishes
  add column contact_person_id uuid references public.people (id),
  add column detail text;

-- --- Approving a proposed contact / album creates the record -----------------------------
-- Payload (contact): full_name*, relationship, connected_to, phone, email, city, region,
--   preferred_method, notify_first, is_professional, notes.
-- Payload (album): title*, url*, provider, note.
create or replace function public.riana_apply(p_update_id uuid) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare u public.riana_updates; v_id uuid; p jsonb;
begin
  if not app.is_super_admin() then raise exception 'super admins only'; end if;
  select * into u from public.riana_updates where id = p_update_id for update;
  if u.id is null then raise exception 'update not found'; end if;
  if u.review_status <> 'pending' then raise exception 'already reviewed'; end if;
  p := u.payload;
  if u.kind = 'contact' then
    if coalesce(trim(p->>'full_name'), '') = '' then raise exception 'contact needs a full_name'; end if;
    insert into public.people (full_name, relationship, connected_to, phone, email, city, region, preferred_method, notify_first, is_professional, notes, confirmed, source)
    values (trim(p->>'full_name'), nullif(trim(p->>'relationship'), ''),
            coalesce(nullif(p->>'connected_to', ''), 'both')::public.subject,
            nullif(trim(p->>'phone'), ''), nullif(trim(p->>'email'), ''), nullif(trim(p->>'city'), ''), nullif(trim(p->>'region'), ''),
            nullif(p->>'preferred_method', '')::public.contact_method,
            coalesce((p->>'notify_first')::boolean, false), coalesce((p->>'is_professional')::boolean, false),
            nullif(trim(p->>'notes'), ''), false, 'riana')
    returning id into v_id;
    update public.riana_updates set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), applied_table = 'people', applied_id = v_id where id = u.id;
  elsif u.kind = 'album' then
    insert into public.shared_albums (title, url, provider, note, source)
    values (coalesce(nullif(trim(p->>'title'), ''), 'Shared album'), p->>'url', coalesce(nullif(p->>'provider', ''), 'google_photos'), nullif(trim(p->>'note'), ''), 'riana')
    on conflict (url) do update set note = coalesce(excluded.note, public.shared_albums.note)
    returning id into v_id;
    update public.riana_updates set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), applied_table = 'shared_albums', applied_id = v_id where id = u.id;
  else
    update public.riana_updates set review_status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = u.id;
  end if;
  return v_id;
end $$;
revoke all on function public.riana_apply(uuid) from public, anon;
grant execute on function public.riana_apply(uuid) to authenticated;

-- --- Photos: EXIF / Takeout dates and hash-only dedupe for images ------------------------
alter table public.imported_files add column taken_at timestamptz;
create index imported_files_taken_idx on public.imported_files (taken_at) where taken_at is not null;

drop function public.drive_upsert_file(text, text, text, text, bigint, text, timestamptz, text, public.section, public.media_kind, public.file_sensitivity, text, text);
create or replace function public.drive_upsert_file(
  p_drive_file_id text, p_folder_key text, p_name text, p_mime text, p_size bigint, p_md5 text,
  p_modified timestamptz, p_link text, p_target public.section, p_media public.media_kind,
  p_sensitivity public.file_sensitivity, p_rule text, p_note text, p_taken_at timestamptz default null
) returns text
language plpgsql security invoker set search_path = '' as $$
declare existing public.imported_files; dup uuid;
begin
  if not app.is_super_admin() then raise exception 'super admins only'; end if;
  select * into existing from public.imported_files where drive_file_id = p_drive_file_id;
  if existing.id is not null then
    if existing.drive_modified_at is not distinct from p_modified and existing.md5 is not distinct from p_md5 then
      update public.imported_files set last_synced_at = now(), taken_at = coalesce(taken_at, p_taken_at) where id = existing.id;
      return 'unchanged';
    end if;
    update public.imported_files
       set name = p_name, mime_type = p_mime, size_bytes = p_size, md5 = p_md5, drive_modified_at = p_modified,
           web_view_link = p_link, taken_at = coalesce(p_taken_at, taken_at), last_synced_at = now()
     where id = existing.id;
    return 'updated';
  end if;
  -- Same content already imported? Images match on hash alone (Takeout re-exports and
  -- copies rename files); everything else also needs the same name.
  select id into dup from public.imported_files
   where p_md5 is not null and md5 = p_md5 and size_bytes = p_size and duplicate_of is null
     and (p_media in ('image', 'video') or lower(name) = lower(p_name))
   limit 1;
  insert into public.imported_files (drive_file_id, drive_folder_key, name, mime_type, size_bytes, md5, drive_modified_at,
                                     web_view_link, target_section, media_kind, sensitivity, manifest_rule, target_note, duplicate_of, taken_at)
  values (p_drive_file_id, p_folder_key, p_name, p_mime, p_size, p_md5, p_modified, p_link, p_target, p_media, p_sensitivity, p_rule, p_note, dup, p_taken_at);
  return case when dup is not null then 'duplicate' else 'created' end;
end $$;
revoke all on function public.drive_upsert_file(text, text, text, text, bigint, text, timestamptz, text, public.section, public.media_kind, public.file_sensitivity, text, text, timestamptz) from public, anon;
grant execute on function public.drive_upsert_file(text, text, text, text, bigint, text, timestamptz, text, public.section, public.media_kind, public.file_sensitivity, text, text, timestamptz) to authenticated;
