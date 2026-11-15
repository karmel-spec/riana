-- Ancestors page under Memories: keepsakes and papers of earlier generations
-- (a grandparent's will, a discharge, a letter), grouped by the person they belong to.
alter table public.collections add column if not exists person text check (person is null or length(person) between 2 and 120);
alter table public.collections drop constraint if exists collections_category_check;
alter table public.collections add constraint collections_category_check
  check (category in ('book', 'photos', 'imemories', 'digital_history', 'love_letter', 'interview', 'ancestor', 'other'));
create index if not exists collections_person_idx on public.collections (person) where person is not null;
