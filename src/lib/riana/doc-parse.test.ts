// Run with: node --test src/lib/riana/doc-parse.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { driveIdFromLink, findDate, isHeading, kindFor, parseDoc } from "./doc-parse.ts";

const DOC = { id: "1abcDEFghiJKLmnoPQRstuVWXyz0123456789", name: "Greene Family Binder", modified_at: "2026-11-03T15:00:00Z", link: null };

const SAMPLE = `Greene Family Binder - Riana's notes

APPOINTMENTS
- Dad cardiology follow-up Nov 12 at 10:30, Dr. Sample. Karmel driving.
• Mom eye exam 11/20
ok

Lab results:
1. Diana A1C 6.1 % on 2026-11-03 (was 6.4)

Bills
Electric bill autopay failed again, $142.18 due 11/15

Questions for Mom and Dad
Where is the signed healthcare POA kept?

Notes
Rich wants the hymn recording added to the history page.
Rich wants the hymn recording added to the history page.
`;

test("headings are recognised in the common shapes", () => {
  for (const h of ["APPOINTMENTS", "Lab results:", "Bills", "# Notes", "Questions for Mom and Dad:"]) assert.ok(isHeading(h), h);
  for (const l of ["- Dad cardiology follow-up", "Where is the signed healthcare POA kept?", "Electric bill autopay failed again, $142.18 due 11/15"]) assert.ok(!isHeading(l), l);
});

test("every item is proposed once, under its heading, with the right kind", () => {
  const p = parseDoc(SAMPLE, DOC);
  assert.deepEqual(p.headings, ["APPOINTMENTS", "Lab results", "Bills", "Questions for Mom and Dad", "Notes"]);
  const kinds = p.proposals.map((x) => x.kind);
  assert.deepEqual(kinds, ["appointment", "appointment", "lab_result", "bill", "urgent_question", "note"]);
  assert.equal(p.skipped, 3, "the title, the stray 'ok' line and the duplicated note are skipped");
  const appt = p.proposals[0];
  assert.equal(appt.summary, "APPOINTMENTS: Dad cardiology follow-up Nov 12 at 10:30, Dr. Sample. Karmel driving.");
  assert.equal(appt.payload.date, "2026-11-12");
  assert.equal(appt.payload.line_no, 4);
  assert.equal(p.proposals[1].payload.date, "2026-11-20");
  assert.equal(p.proposals[2].payload.date, "2026-11-03");
  assert.match(appt.external_ref, /^gdoc:1abcDEF[A-Za-z0-9_-]+:[0-9a-f]{13}$/);
});

test("refs are stable across runs and change when the line changes", () => {
  const a = parseDoc(SAMPLE, DOC).proposals.map((x) => x.external_ref);
  const b = parseDoc(SAMPLE, DOC).proposals.map((x) => x.external_ref);
  assert.deepEqual(a, b);
  const c = parseDoc(SAMPLE.replace("6.1 %", "6.0 %"), DOC).proposals.map((x) => x.external_ref);
  assert.equal(c.filter((r) => !a.includes(r)).length, 1, "only the edited line gets a new ref");
  const d = parseDoc(SAMPLE, { ...DOC, id: "other-doc-id-0001" }).proposals.map((x) => x.external_ref);
  assert.equal(d.filter((r) => a.includes(r)).length, 0, "a different doc never collides");
});

test("kind falls back to the line, then note", () => {
  assert.equal(kindFor(null, "Pay the water bill by Friday"), "bill");
  assert.equal(kindFor("Random", "Dentist visit went fine"), "appointment");
  assert.equal(kindFor(null, "Grandkids coming for Thanksgiving"), "note");
});

test("dates in the usual shapes", () => {
  assert.equal(findDate("on 2026-01-05", null), "2026-01-05");
  assert.equal(findDate("due 3/9/26", null), "2026-03-09");
  assert.equal(findDate("Sept 3rd, 2027 at noon", null), "2027-09-03");
  assert.equal(findDate("Dec 25", "2026-06-01T00:00:00Z"), "2026-12-25");
  assert.equal(findDate("nothing here", null), undefined);
});

test("doc ids come out of links", () => {
  assert.equal(driveIdFromLink("https://docs.google.com/document/d/1abcDEFghiJKLmnoPQRstuVWXyz0123456789/edit?usp=sharing"), "1abcDEFghiJKLmnoPQRstuVWXyz0123456789");
  assert.equal(driveIdFromLink("https://drive.google.com/open?id=1abcDEFghiJKLmnoPQRstuVWXyz0123456789"), "1abcDEFghiJKLmnoPQRstuVWXyz0123456789");
  assert.equal(driveIdFromLink("  1abcDEFghiJKLmnoPQRstuVWXyz0123456789 "), "1abcDEFghiJKLmnoPQRstuVWXyz0123456789");
  assert.equal(driveIdFromLink("not a link"), null);
});
