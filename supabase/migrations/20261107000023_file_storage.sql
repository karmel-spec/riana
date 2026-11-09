-- Private file storage: the app serves binder files itself (signed links after the binder login),
-- so nobody needs a Google account or a Drive share to open a page. Drive stays the source; this is the copy.
-- Object keys are "<section>/<imported_file id>/<file name>", and the section segment is what the
-- storage policies check with the same app.can_read / app.can_write rules the tables use.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('binder', 'binder', false, 26214400,
  array['image/jpeg','image/png','image/heic','image/heif','image/webp','application/pdf','audio/mpeg','audio/mp4','video/mp4','video/quicktime',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'])
on conflict (id) do nothing;

-- The first path segment names the section (or 'admin' for admin-only files). A bad segment reads as no access.
create or replace function app.object_section(p_name text) returns public.section
language sql immutable set search_path = '' as $$
  select case when (storage.foldername(p_name))[1] = any (enum_range(null::public.section)::text[])
              then (storage.foldername(p_name))[1]::public.section end
$$;
revoke all on function app.object_section(text) from public, anon;
grant execute on function app.object_section(text) to authenticated;

drop policy if exists binder_read on storage.objects;
create policy binder_read on storage.objects for select to authenticated
  using (bucket_id = 'binder' and app.can_read(app.object_section(name)));
drop policy if exists binder_insert on storage.objects;
create policy binder_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'binder' and app.can_write(app.object_section(name)));
drop policy if exists binder_update on storage.objects;
create policy binder_update on storage.objects for update to authenticated
  using (bucket_id = 'binder' and app.can_write(app.object_section(name)));
drop policy if exists binder_delete on storage.objects;
create policy binder_delete on storage.objects for delete to authenticated
  using (bucket_id = 'binder' and app.is_super_admin());

-- Uploads from the app: a super admin or section writer files a document directly (no Drive step).
create or replace function public.file_upload_row(
  p_name text, p_mime text, p_size bigint, p_target public.section, p_media public.media_kind,
  p_sensitivity public.file_sensitivity, p_note text, p_taken_at timestamptz
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare new_id uuid := gen_random_uuid();
begin
  if not app.can_write(p_target) then raise exception 'no write access to this section'; end if;
  insert into public.imported_files (id, drive_file_id, drive_folder_key, name, mime_type, size_bytes, web_view_link, target_section, target_note,
    media_kind, sensitivity, review_status, manifest_rule, taken_at, source, first_imported_at, last_synced_at)
  values (new_id, 'upload:' || new_id, 'web_app_import', p_name, p_mime, p_size, null, p_target, p_note,
    p_media, p_sensitivity, 'approved', 'upload', p_taken_at, 'app', now(), now());
  return new_id;
end $$;
revoke all on function public.file_upload_row(text, text, bigint, public.section, public.media_kind, public.file_sensitivity, text, timestamptz) from public, anon;
grant execute on function public.file_upload_row(text, text, bigint, public.section, public.media_kind, public.file_sensitivity, text, timestamptz) to authenticated;
