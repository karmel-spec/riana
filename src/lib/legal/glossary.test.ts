import { test } from "node:test";
import assert from "node:assert/strict";
import { COMPARISONS, TERM_GROUPS, haystack } from "./glossary.ts";
import { DOCUMENT_KINDS } from "./explainers.ts";

const all = [
  ...COMPARISONS.map((c) => haystack(c.title, c.intro, c.bottomLine, ...c.rows.flatMap((r) => [r.name, r.text]))),
  ...DOCUMENT_KINDS.map((e) => haystack(e.kind, e.what, e.why, ...e.lookFor)),
  ...TERM_GROUPS.flatMap((g) => g.terms.map((t) => haystack(t.term, t.also, t.def))),
].join("\n");

// Estate and end-of-life words the binder's own pages and records use. When a page starts
// using a new one, add it here and to the glossary.
const USED_IN_THE_BINDER = [
  "executor", "executrix", "personal representative", "alternate", "trustee", "successor trustee", "co-trustee", "beneficiary", "heir", "agent",
  "witness", "notarized", "recorded", "probate", "small estate", "affidavit", "self-proving", "pour-over", "superseded", "original", "provision",
  "will", "codicil", "addendum", "trust", "revocable", "living will", "healthcare directive", "power of attorney", "poa", "hipaa", "dnr", "polst",
  "artificial nutrition", "final disposition", "digital assets", "community property", "transfer on death", "tod", "payable on death", "pod",
  "beneficiary deed", "beneficiary designation", "deed", "deed of trust", "easement", "lien", "title", "legal description", "promissory note",
  "amortization", "balloon", "payoff", "advance on inheritance", "equalization", "personal property", "step-up", "basis", "appraisal", "valuation",
  "assessor", "net worth", "financial statement", "liabilities", "annuity", "survivor benefit", "401(k)", "life insurance", "safe deposit",
  "vital records", "death certificate", "certified", "retitle", "memorialize", "notify", "final income tax return", "estate tax",
  "widow", "obituary", "eulogy", "viewing", "visitation", "graveside", "casket", "urn", "vault", "grave liner", "plot", "interment",
  "opening/closing", "endowment care", "pre-need", "prepaid", "headstone", "marker", "cremation", "burial", "cemetery", "funeral home",
  "military funeral honors", "dd-214", "burial allowance", "champva", "social security", "medicare", "organ", "hospice",
];

test("every estate and end-of-life term the binder uses is explained in the glossary", () => {
  const missing = USED_IN_THE_BINDER.filter((t) => !all.includes(t));
  assert.deepEqual(missing, []);
});

test("no term is defined twice and every entry has a definition", () => {
  const names = TERM_GROUPS.flatMap((g) => g.terms.map((t) => t.term.toLowerCase()));
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
  for (const g of TERM_GROUPS) for (const t of g.terms) assert.ok(t.def.length >= 20, t.term);
});
