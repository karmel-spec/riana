-- Love Letters and Interviews pages under Memories: two more collection categories.
alter table public.collections drop constraint if exists collections_category_check;
alter table public.collections add constraint collections_category_check
  check (category in ('book', 'photos', 'imemories', 'digital_history', 'love_letter', 'interview', 'other'));
