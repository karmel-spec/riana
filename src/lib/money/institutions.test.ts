import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByInstitution, fileMatches } from "./institutions.ts";
import type { Account } from "../types.ts";

const acc = (institution: string, kind: Account["kind"] = "checking"): Account => ({ id: institution + kind, institution, kind, purpose: null, last4: null, held_by: "both", beneficiary_notes: null, notes: null, source: "app" });

test("accounts at the same institution share one card, including the Foothills / Glacier naming", () => {
  const groups = groupByInstitution([acc("Foothills Bank"), acc("Foothills Bank / Glacier Bank", "savings"), acc("Navy Federal Credit Union"), acc("Navy Federal Credit Union", "credit_card"), acc("Chase", "credit_card")]);
  assert.deepEqual(groups.map((g) => [g.key, g.accounts.length]), [["chase", 1], ["foothills", 2], ["navy federal", 2]]);
  assert.equal(groups[1].name, "Foothills Bank / Glacier Bank");
});

test("documents match their institution by name, note or an explicit tag, and not others", () => {
  const [foothills, navy] = groupByInstitution([acc("Foothills Bank"), acc("Navy Federal Credit Union")]);
  assert.ok(fileMatches(navy, { name: "2021-07 Bank - Navy Federal Visa Statement.pdf", target_note: null }));
  assert.ok(fileMatches(navy, { name: "x.pdf", target_note: "[Widow Book · Financial] NFCU POD confirmation" }));
  assert.ok(!fileMatches(navy, { name: "1965-1969 Navy Service Records.pdf", target_note: null }));
  assert.ok(fileMatches(foothills, { name: "Glacier Bank CD ladder.pdf", target_note: null }));
  assert.ok(fileMatches(foothills, { name: "scan.jpg", target_note: "[Accounts · foothills] statement" }));
  assert.ok(!fileMatches(foothills, { name: "2021-07 Bank - Navy Federal Visa Statement.pdf", target_note: null }));
});
