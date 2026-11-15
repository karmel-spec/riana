import { test } from "node:test";
import assert from "node:assert/strict";
import { birthdayError, birthdayLabel, byNextBirthday, nextBirthday, todayIn, upcomingBirthdays } from "./birthdays.ts";

const today = { y: 2026, m: 11, d: 15 };
const b = (birth_month: number | null, birth_day: number | null, birth_year: number | null = null) => ({ birth_month, birth_day, birth_year });

test("label shows month and day, and the age they turn when the year is known", () => {
  assert.equal(birthdayLabel(b(6, 3), today), "June 3");
  assert.equal(birthdayLabel(b(6, 3, 1950), today), "June 3, 1950 · turns 77");
  assert.equal(birthdayLabel(b(11, 15, 1950), today), "November 15, 1950 · turns 76 today");
  assert.equal(birthdayLabel(b(null, null), today), "");
});

test("next birthday wraps the year and counts today as zero days away", () => {
  assert.deepEqual(nextBirthday(b(1, 20, 1940), today), { on: { y: 2027, m: 1, d: 20 }, days: 66, turns: 87 });
  assert.equal(nextBirthday(b(11, 15), today)?.days, 0);
  assert.equal(nextBirthday(b(11, 14), today)?.days, 364);
  assert.equal(nextBirthday(b(null, null), today), null);
});

test("a February 29 birthday is kept on the 28th in ordinary years", () => {
  assert.deepEqual(nextBirthday(b(2, 29), today)?.on, { y: 2027, m: 2, d: 28 });
  assert.deepEqual(nextBirthday(b(2, 29), { y: 2028, m: 1, d: 1 })?.on, { y: 2028, m: 2, d: 29 });
});

test("upcoming list keeps only the window, soonest first, across New Year", () => {
  const people = [{ n: "jan", ...b(1, 2) }, { n: "dec", ...b(12, 1) }, { n: "may", ...b(5, 9) }, { n: "none", ...b(null, null) }];
  assert.deepEqual(upcomingBirthdays(people, { y: 2026, m: 11, d: 20 }, 30).map((u) => [u.person.n, u.days]), [["dec", 11]]);
  assert.deepEqual(upcomingBirthdays(people, { y: 2026, m: 12, d: 20 }, 30).map((u) => u.person.n), ["jan"]);
});

test("sorting by birthday puts the next one first and people without one last", () => {
  const list = [b(5, 9), b(null, null), b(12, 1), b(1, 20)].sort((x, y) => byNextBirthday(x, y, today));
  assert.deepEqual(list.map((p) => p.birth_month), [12, 1, 5, null]);
});

test("form check wants month and day together and a real date", () => {
  assert.equal(birthdayError(null, null, null), null);
  assert.equal(birthdayError(6, 3, null), null);
  assert.match(birthdayError(5, null, null)!, /month and a day/);
  assert.match(birthdayError(null, null, 1950)!, /month and a day/);
  assert.match(birthdayError(4, 31, null)!, /April/);
  assert.match(birthdayError(2, 29, 1951)!, /leap/);
  assert.equal(birthdayError(2, 29, 1952), null);
});

test("today is read in the family's time zone", () => {
  assert.deepEqual(todayIn("America/Phoenix", new Date("2026-11-16T03:00:00Z")), { y: 2026, m: 11, d: 15 });
});
