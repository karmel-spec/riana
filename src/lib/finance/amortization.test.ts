import { test } from "node:test";
import assert from "node:assert/strict";
import { addMonths, balanceOn, levelPayment, payoffDate, schedule } from "./amortization.ts";

// Terms from Update Brief #2 §3d. The notes' STATED payments are what the
// rents actually pay, so the schedule uses them; the test also records what
// the stated rate/term would imply, which is an open question on the plan.
const NOTE1 = { principal: 250_000, annualRatePct: 4.75, termMonths: 240, monthlyPayment: 1_655, firstPaymentOn: "2021-04-01" };
const NOTE2 = { principal: 300_000, annualRatePct: 6.25, termMonths: 180, monthlyPayment: 2_575, firstPaymentOn: "2023-03-01" };

test("Note 2: the level payment for the stated terms matches the note within $3 (rounded up on the note)", () => {
  const p = levelPayment(NOTE2.principal, NOTE2.annualRatePct, NOTE2.termMonths);
  assert.ok(Math.abs(p - 2572.27) < 0.01, `computed ${p}`);
  assert.ok(Math.abs(p - NOTE2.monthlyPayment) <= 3);
});

test("Note 1: the stated terms do NOT reproduce $1,655 — this is surfaced, not hidden", () => {
  const p = levelPayment(NOTE1.principal, NOTE1.annualRatePct, NOTE1.termMonths);
  assert.ok(Math.abs(p - 1615.56) < 0.01, `computed ${p}`);
  assert.ok(Math.abs(p - NOTE1.monthlyPayment) > 1, "the discrepancy is real (about $40/mo)");
});

test("schedules use the note's actual payment, so every row matches it to the cent (±$1 on the final payment)", () => {
  for (const note of [NOTE1, NOTE2]) {
    const rows = schedule(note);
    for (const row of rows.slice(0, -1)) assert.equal(row.payment, note.monthlyPayment);
    assert.ok(rows[rows.length - 1].payment <= note.monthlyPayment + 1);
    assert.equal(rows[rows.length - 1].balance, 0);
  }
});

test("Note 2 pays off in 180 months at $2,575 (slightly early thanks to the rounding)", () => {
  const rows = schedule(NOTE2);
  assert.ok(rows.length >= 178 && rows.length <= 180, `${rows.length} payments`);
  assert.equal(payoffDate(NOTE2).slice(0, 4), "2038");
});

test("Note 1 at $1,655 pays off in about 19 years, not 20", () => {
  const rows = schedule(NOTE1);
  assert.ok(rows.length >= 228 && rows.length <= 232, `${rows.length} payments`);
});

test("balance on a date, before, during and after", () => {
  assert.equal(balanceOn(NOTE2, "2023-02-15").balance, 300_000);
  const mid = balanceOn(NOTE2, "2026-11-05");
  assert.equal(mid.paymentsMade, 45);                   // Mar 2023 … Nov 2026 inclusive = 45 payments
  assert.ok(mid.balance > 240_000 && mid.balance < 260_000, `balance ${mid.balance}`);
  assert.equal(mid.nextPaymentOn, "2026-12-01");
  assert.equal(balanceOn(NOTE2, "2045-01-01").paidOff, true);
});

test("first-row arithmetic is exact", () => {
  const [r1] = schedule(NOTE2);
  assert.equal(r1.interest, 1562.5);                    // 300000 × 6.25% / 12
  assert.equal(r1.principal, 1012.5);
  assert.equal(r1.balance, 298_987.5);
});

test("addMonths handles year roll-over and short months", () => {
  assert.equal(addMonths("2021-04-01", 9), "2022-01-01");
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
});

test("a payment that doesn't cover interest is refused", () => {
  assert.throws(() => schedule({ principal: 100_000, annualRatePct: 12, monthlyPayment: 500, firstPaymentOn: "2026-01-01" }));
});
