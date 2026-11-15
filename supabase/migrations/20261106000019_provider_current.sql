-- Providers can be marked former (no longer seen) instead of deleted, so the
-- history of who treated whom is kept. Address lives in `practice`.
alter table public.providers add column if not exists is_current boolean not null default true;
