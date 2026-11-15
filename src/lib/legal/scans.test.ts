import { test } from "node:test";
import assert from "node:assert/strict";
import { LEGAL_COPY_TAG, scanFor, scanMap, type ScanDoc, type ScanFile } from "./scans.ts";

// Sample names only: shaped like real filings, about nobody.
const f = (id: string, name: string, target_note: string | null = null): ScanFile => ({ id, name, target_note });
const d = (title: string, principal = "both", doc_type = "other", status = "signed"): ScanDoc => ({ id: title, title, principal, doc_type, status });

const files = [
  f("will-a", "2021-06-13 Will - Alex Sample Last Will and Testament (signed, witnessed).pdf", "[Binder · Legal] Alex's will, signed."),
  f("will-b", "2021-06-13 Will - Blair Sample Last Will and Testament (signed, witnessed).pdf", "[Binder · Legal] Blair's will, signed."),
  f("will-draft", "2021-06-08 Draft Will - Alex Sample.pdf"),
  f("dir-a", "2021-06-13 Healthcare Directive - Alex Sample (signed, witnessed).pdf"),
  f("dir-b", "2021-06-13 Healthcare Directive - Blair Sample (signed, witnessed).pdf"),
  f("loose", "2021 Copies - Loose Will and Healthcare Directive copies.pdf"),
  f("deed-10", "2021-06-09 TOD Deed - 10 Oak Cir (recorded 4000001).pdf", "TOD deed 1010 Oak, recorded 4000001."),
  f("deed-20", "2021-06-09 TOD Deed - 2020 Elm St Lot 4.pdf", "TOD deed 2020 Elm, recorded 4000002."),
  f("poa", "2021-06 Power of Attorney - Alex and Blair Sample (page 1 only photographed).pdf"),
  f("wishes", "Blair - My Comfort and End-of-Life Wishes 2026-05-24.jpg"),
  f("summary-nov", "2026-11-01 - Blair handout - Emergency Medical Summary.jpg"),
  f("quest", "2026-07-02 gettrusts Estate Planning Questionnaire (blank).pdf"),
];
// "rich" / "diana" are the app's two principals; the sample files use Alex / Blair, so add the words the matcher keys on.
const named = files.map((x) => ({ ...x, target_note: `${x.target_note ?? ""} ${/Alex/.test(x.name) && !/Blair/.test(x.name) ? "Rich" : /Blair/.test(x.name) && !/Alex/.test(x.name) ? "Diana" : ""}` }));
const pick = (doc: ScanDoc) => scanFor(doc, named)?.id ?? null;

test("each person's will and directive finds its own signed copy", () => {
  assert.equal(pick(d("Last Will & Testament: Alex Sample", "rich", "will")), "will-a");
  assert.equal(pick(d("Last Will & Testament: Blair Sample", "diana", "will")), "will-b");
  assert.equal(pick(d("Healthcare Directive: Alex Sample", "rich", "directive")), "dir-a");
  assert.equal(pick(d("Healthcare Directive: Blair Sample", "diana", "directive")), "dir-b");
});

test("a document that only shares some words is left unlinked", () => {
  assert.equal(pick(d("Addendum to the Last Will and Testament (Jul 29, 2026)")), null);
  assert.equal(pick(d("Last Will of Casey Sample (Feb 6, 1971; ancestral)", "rich", "will")), null);
  assert.equal(pick(d("Limited POA: Sample Rentals, naming Jo", "diana", "financial_poa")), null);
  assert.equal(pick(d("Revocable Living Trust (2026 estate plan, in progress)")), null);
});

test("deeds are told apart by their numbers", () => {
  assert.equal(pick(d("TOD Deed: 1010 Oak Cir (No. 4000001)", "both", "tod_deed", "recorded")), "deed-10");
  assert.equal(pick(d("TOD Deed: 2020 Elm St (No. 4000002)", "both", "tod_deed", "recorded")), "deed-20");
  assert.equal(pick(d("TOD Deed: 3030 Oak Cir", "both", "tod_deed", "not_started")), null);
});

test("a title that leads with the person, and dated titles, match on the document and its date", () => {
  assert.equal(pick(d("Diana: My Comfort and End-of-Life Wishes (May 24, 2026)", "diana", "directive")), "wishes");
  assert.equal(pick(d("Diana: Signed Emergency Medical Summary (March 9, 2026)", "diana", "directive")), null);
  assert.equal(pick(d("gettrusts.com estate planning questionnaire", "both", "other", "not_started")), "quest");
});

test("a month-only file name must be the right month, and page-by-page photos open at page 1", () => {
  const summary = d("Diana: Signed Emergency Medical Summary (March 9, 2026)", "diana", "directive");
  assert.equal(scanFor(summary, [f("nov", "Blair Emergency Medical Summary 2026-11.jpg")]), null);
  assert.equal(scanFor(summary, [f("mar", "Blair Emergency Medical Summary 2026-03.jpg")])?.id, "mar");
  const memo = d("Family Estate Memorandum (Aug 3, 2026)");
  const pages = [3, 1, 2].map((n) => f(`p${n}`, `IMG_00${n}.JPG`, `[Binder] Family Estate Memorandum, Aug 3, 2026 (p.${n} of 3)`));
  assert.equal(scanFor(memo, pages)?.id, "p1");
});

test("a copy uploaded from the board wins, and the map lists only documents that have one", () => {
  const poa = d("Durable Financial Power of Attorney: Rich and Diana (2021)", "both", "financial_poa", "drafted");
  assert.equal(pick(poa), null);
  const uploaded = f("up", "IMG_0001.jpg", `${LEGAL_COPY_TAG} ${poa.title}`);
  assert.equal(scanFor(poa, [...named, uploaded])?.id, "up");
  assert.deepEqual(scanMap([poa, d("Healthcare Directive: Alex Sample", "rich", "directive")], named), { "Healthcare Directive: Alex Sample": "dir-a" });
});
