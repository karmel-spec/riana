// Birthday maths for contacts. A birthday is a month and a day, with the year optional.
// "Today" is a plain calendar day (the family's zone), so nothing here depends on the clock.

export type Birthday = { birth_month?: number | null; birth_day?: number | null; birth_year?: number | null };
export type Ymd = { y: number; m: number; d: number };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTH_NAMES: readonly string[] = MONTHS;

/** The calendar day it is right now in the family's time zone. */
export function todayIn(tz = "America/Phoenix", now = new Date()): Ymd {
  const [y, m, d] = now.toLocaleDateString("en-CA", { timeZone: tz }).split("-").map(Number);
  return { y, m, d };
}

const utc = (t: Ymd) => Date.UTC(t.y, t.m - 1, t.d);
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function hasBirthday(p: Birthday): p is Birthday & { birth_month: number; birth_day: number } {
  return !!p.birth_month && !!p.birth_day;
}

/** The next time this birthday comes round (today counts), how many days away, and the age they turn if the year is known. */
export function nextBirthday(p: Birthday, today: Ymd): { on: Ymd; days: number; turns: number | null } | null {
  if (!hasBirthday(p)) return null;
  const on = (y: number): Ymd => ({ y, m: p.birth_month, d: p.birth_month === 2 && p.birth_day === 29 && !leap(y) ? 28 : p.birth_day });
  let next = on(today.y);
  if (utc(next) < utc(today)) next = on(today.y + 1);
  const turns = p.birth_year && next.y > p.birth_year ? next.y - p.birth_year : null;
  return { on: next, days: Math.round((utc(next) - utc(today)) / 86_400_000), turns };
}

/** "June 3", or "June 3, 1950 · turns 77" when the year is known. Empty when there is no birthday. */
export function birthdayLabel(p: Birthday, today: Ymd): string {
  if (!hasBirthday(p)) return "";
  const base = `${MONTHS[p.birth_month - 1]} ${p.birth_day}`;
  if (!p.birth_year) return base;
  const n = nextBirthday(p, today);
  return `${base}, ${p.birth_year}${n?.turns ? ` · turns ${n.turns}${n.days === 0 ? " today" : ""}` : ""}`;
}

/** "today", "tomorrow" or "in 9 days". */
export function inDays(days: number): string {
  return days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

/** People whose birthday falls within the next `within` days, soonest first. */
export function upcomingBirthdays<T extends Birthday>(people: T[], today: Ymd, within: number): { person: T; on: Ymd; days: number; turns: number | null }[] {
  return people.flatMap((person) => { const n = nextBirthday(person, today); return n && n.days <= within ? [{ person, ...n }] : []; })
    .sort((a, b) => a.days - b.days);
}

/** Sort order for "by birthday": next upcoming first, wrapping the year; people without one go last. */
export function byNextBirthday(a: Birthday, b: Birthday, today: Ymd): number {
  return (nextBirthday(a, today)?.days ?? 999) - (nextBirthday(b, today)?.days ?? 999);
}

/** Checks a month/day/year typed into a form. Returns an error message, or null when it is fine (or blank). */
export function birthdayError(month: number | null, day: number | null, year: number | null): string | null {
  if (!month && !day && !year) return null;
  if (!month || !day) return "A birthday needs both a month and a day.";
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day < 1 || day > max) return `${MONTHS[month - 1]} doesn't have a day ${day}.`;
  if (year && month === 2 && day === 29 && !leap(year)) return `${year} was not a leap year, so there was no February 29.`;
  return null;
}
