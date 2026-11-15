-- Birthdays on contacts. Month and day drive the "upcoming birthdays" lists;
-- the year is optional because many are remembered without one.
alter table public.people add column if not exists birth_month smallint check (birth_month between 1 and 12);
alter table public.people add column if not exists birth_day   smallint check (birth_day between 1 and 31);
alter table public.people add column if not exists birth_year  smallint check (birth_year between 1850 and 2100);
-- A day needs its month and a month needs its day; a year alone is not a birthday.
alter table public.people drop constraint if exists people_birthday_complete;
alter table public.people add constraint people_birthday_complete
  check ((birth_month is null) = (birth_day is null) and (birth_year is null or birth_month is not null));
