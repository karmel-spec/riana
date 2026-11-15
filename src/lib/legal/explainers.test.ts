import { test } from "node:test";
import assert from "node:assert/strict";
import { explainerFor, gapsFor, type LearnDoc } from "./explainers.ts";

const doc = (over: Partial<LearnDoc>): LearnDoc => ({ title: "Last Will & Testament: Sample", doc_type: "will", status: "signed", needs_recording: false, prepared_by: null, drafted_on: null, signed_on: "2024-01-10", recorded_on: null, original_location: "Home safe", open_issue: null, notes: null, ...over });

test("the explainer follows the title first, then the document type", () => {
  const kind = (title: string, doc_type: string) => explainerFor({ title, doc_type }).kind;
  assert.match(kind("Last Will & Testament: Sample", "will"), /^Last will/);
  assert.match(kind("Addendum to the Last Will and Testament (Jul 29, 2026)", "other"), /^Codicil/);
  assert.match(kind("Healthcare Directive: Sample", "directive"), /living will/);
  assert.match(kind("Directive to Personal Representative (SENSITIVE)", "directive"), /personal representative/);
  assert.match(kind("Healthcare Power of Attorney (Arizona form)", "healthcare_poa"), /^Healthcare power/);
  assert.match(kind("Limited POA: Sample Rentals", "financial_poa"), /^Financial/);
  assert.match(kind("Arizona beneficiary deed: 1 Sample Dr", "tod_deed"), /^Transfer-on-death/);
  assert.match(kind("Promissory Note + Deed of Trust: sample loan", "promissory_note"), /^Promissory/);
  assert.match(kind("Arizona prehospital (DNR) form", "other"), /DNR/);
  assert.match(kind("Something nobody planned for", "other"), /^Estate document/);
});

test("gaps come only from what the record shows", () => {
  const today = "2026-11-15";
  assert.deepEqual(gapsFor(doc({}), true, today), []);
  assert.match(gapsFor(doc({ status: "drafted" }), true, today)[0], /only a draft/);
  assert.match(gapsFor(doc({ status: "not_started", signed_on: null }), false, today)[0], /not been started/);
  assert.equal(gapsFor(doc({ status: "not_started", signed_on: null }), false, today).length, 1);
  const old = gapsFor(doc({ signed_on: "2021-06-13", original_location: null }), false, today);
  assert.equal(old.length, 3);
  assert.match(old[2], /signed 5 years ago/);
  assert.match(gapsFor(doc({ doc_type: "tod_deed", title: "TOD Deed: 1 Sample St" }), true, today)[0], /not recorded/);
});
