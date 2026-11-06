-- =============================================================================
-- Media library (Update Brief #2, item 7 / §3c).
--  * media_items link to the imported Drive file that holds the bytes (the
--    app streams them with Range support; nothing is copied into Postgres).
--  * Playlists ("Rich's Sing-Along") are ordered lists of audio media items.
--  * Tribute pages are assembled from media, stories and text; private until
--    published, then viewable by a share link (token) sent to chosen
--    notification lists. Room is left for transcripts and captions.
-- =============================================================================

alter table public.media_items
  add column title            text,
  add column imported_file_id uuid references public.imported_files (id),
  add column poster_file_id   uuid references public.imported_files (id),
  add column duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  add column mime_type        text,
  add column transcript       text,                 -- later: spoken words of audio/video
  add column captions_file_id uuid references public.imported_files (id),   -- later: .vtt
  add column recorded_by      text,                 -- 'Rich', 'Diana', 'family'
  add column category         text check (category is null or category in ('memory', 'church', 'music', 'event', 'document', 'other'));
create index media_items_file_idx on public.media_items (imported_file_id);
create index media_items_kind_idx on public.media_items (kind, review_status);

create table public.playlists (
  id          uuid primary key default gen_random_uuid(),
  section     public.section not null default 'family_history' check (section = 'family_history'),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title       text not null,
  description text,
  cover_file_id uuid references public.imported_files (id),
  source      public.record_source not null default 'app',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.playlist_tracks (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'family_history' check (section = 'family_history'),
  playlist_id   uuid not null references public.playlists (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  position      integer not null,
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  unique (playlist_id, media_item_id),
  unique (playlist_id, position) deferrable initially deferred
);

-- Tribute / memorial pages ----------------------------------------------------
create table public.tribute_pages (
  id            uuid primary key default gen_random_uuid(),
  -- Admin-only while drafting; the public view goes through a token, not RLS.
  section       public.section not null default 'admin' check (section = 'admin'),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  title         text not null,
  subtitle      text,                     -- 'Richard Greene · 1944–2026'
  intro         text,
  obituary      text,
  service       jsonb not null default '{}'::jsonb,   -- {when, where, address, notes, livestream_url}
  status        text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  share_token   text unique check (share_token is null or share_token ~ '^[0-9a-f]{48}$'),
  published_at  timestamptz,
  shared_list_ids uuid[] not null default '{}',       -- notification lists it was shared with
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);

create table public.tribute_blocks (
  id            uuid primary key default gen_random_uuid(),
  section       public.section not null default 'admin' check (section = 'admin'),
  page_id       uuid not null references public.tribute_pages (id) on delete cascade,
  position      integer not null,
  kind          text not null check (kind in ('heading', 'text', 'media', 'gallery', 'story', 'service')),
  text          text,
  media_item_id uuid references public.media_items (id) on delete set null,
  media_item_ids uuid[] not null default '{}',
  source        public.record_source not null default 'app',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index tribute_blocks_page_idx on public.tribute_blocks (page_id, position);

select app.protect('public.playlists');
select app.protect('public.playlist_tracks');
select app.protect('public.tribute_pages');
select app.protect('public.tribute_blocks');

-- Publishing mints a token; unpublishing clears it. Only super admins.
create or replace function public.tribute_set_status(p_id uuid, p_status text)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_token text;
begin
  if not app.is_super_admin() then raise exception 'super admins only'; end if;
  if p_status = 'published' then
    -- 48 hex chars of randomness without needing pgcrypto: two random UUIDs, dashes removed, trimmed.
    v_token := left(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 48);
    update public.tribute_pages set status = 'published', share_token = v_token, published_at = now() where id = p_id;
    return v_token;
  else
    update public.tribute_pages set status = p_status, share_token = null where id = p_id;
    return null;
  end if;
end $$;
revoke all on function public.tribute_set_status(uuid, text) from public, anon;
grant execute on function public.tribute_set_status(uuid, text) to authenticated;

-- The public view: anyone holding the link sees the published page and its
-- media pointers. Returns nothing for drafts or wrong tokens. Logged.
create or replace function public.tribute_public(p_slug text, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pg public.tribute_pages; blocks jsonb; media jsonb;
begin
  select * into pg from public.tribute_pages where slug = p_slug and status = 'published' and share_token = p_token;
  if pg.id is null then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'position', b.position, 'kind', b.kind, 'text', b.text, 'media_item_id', b.media_item_id, 'media_item_ids', b.media_item_ids) order by b.position), '[]'::jsonb)
    into blocks from public.tribute_blocks b where b.page_id = pg.id;
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'title', m.title, 'caption', m.caption, 'story', m.story, 'taken_on', m.taken_on,
                                               'imported_file_id', m.imported_file_id, 'poster_file_id', m.poster_file_id, 'mime_type', m.mime_type, 'duration_seconds', m.duration_seconds)), '[]'::jsonb)
    into media from public.media_items m
    where m.id in (select unnest(array_cat(array_remove(array_agg(b.media_item_id), null), coalesce(array_agg(x) filter (where x is not null), '{}')))
                   from public.tribute_blocks b left join lateral unnest(b.media_item_ids) x on true where b.page_id = pg.id);
  insert into public.audit_log (actor, action, section, entity, entity_id, details)
  values (null, 'view', 'family_history', 'tribute_pages', pg.id, jsonb_build_object('via_share_link', true));
  return jsonb_build_object('id', pg.id, 'title', pg.title, 'subtitle', pg.subtitle, 'intro', pg.intro, 'obituary', pg.obituary, 'service', pg.service,
                            'published_at', pg.published_at, 'blocks', blocks, 'media', media);
end $$;
revoke all on function public.tribute_public(text, text) from public;
grant execute on function public.tribute_public(text, text) to anon, authenticated;

-- Which imported file may a share-link holder stream? Only media on that page.
create or replace function public.tribute_file_allowed(p_token text, p_file_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tribute_pages pg
    join public.tribute_blocks b on b.page_id = pg.id
    join public.media_items m on m.id = b.media_item_id or m.id = any(b.media_item_ids)
    where pg.status = 'published' and pg.share_token = p_token
      and (m.imported_file_id = p_file_id or m.poster_file_id = p_file_id or m.captions_file_id = p_file_id)
  )
$$;
revoke all on function public.tribute_file_allowed(text, uuid) from public;
grant execute on function public.tribute_file_allowed(text, uuid) to anon, authenticated;

-- Pointer lookup for the public media route (anon holds only the token).
create or replace function public.tribute_file_pointer(p_token text, p_file_id uuid)
returns table (drive_file_id text, mime_type text, name text)
language sql stable security definer set search_path = '' as $$
  select f.drive_file_id, f.mime_type, f.name
  from public.imported_files f
  where f.id = p_file_id and public.tribute_file_allowed(p_token, p_file_id)
$$;
revoke all on function public.tribute_file_pointer(text, uuid) from public;
grant execute on function public.tribute_file_pointer(text, uuid) to anon, authenticated;

-- share_token is a revocable capability for a PUBLISHED page (a link), not a
-- credential; it must stay in plain text so the app can put it in the
-- notification message. Allow it explicitly in the no-secrets guard.
create or replace function public.secret_like_columns()
returns table (table_name text, column_name text)
language sql stable security definer set search_path = '' as $$
  select c.table_name::text, c.column_name::text
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.column_name ~* '(^|_)(password|passwd|pwd|secret|token|api_key|apikey|pin|passcode|credential|private_key|ssn|social_security|dob|date_of_birth|birth_date|birthdate)(_|$)'
    and not (c.table_name = 'riana_inbound_keys' and c.column_name = 'key_hash')
    and not (c.table_name = 'tribute_pages' and c.column_name = 'share_token')
    and c.column_name !~* 'last4'
$$;
