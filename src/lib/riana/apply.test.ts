import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRianaUpdate } from "./apply.ts";

/** A stand-in for the Supabase client that records what would be written. */
function fake(existingBill: { id: string } | null = null) {
  const writes: { table: string; op: string; row: Record<string, unknown> }[] = [];
  const chain = (table: string, op: string, row: Record<string, unknown>) => {
    writes.push({ table, op, row });
    const r = { select: () => r, single: async () => ({ data: { id: "new-id" }, error: null }), eq: () => r, then: (f: (x: unknown) => void) => f({ error: null }) };
    return r;
  };
  const client = { from: (table: string) => ({
    insert: (row: Record<string, unknown>) => chain(table, "insert", row),
    update: (row: Record<string, unknown>) => ({ eq: async () => { writes.push({ table, op: "update", row }); return { error: null }; } }),
    select: () => ({ ilike: () => ({ limit: () => ({ maybeSingle: async () => ({ data: existingBill }) }) }) }),
  }) };
  return { client: client as never, writes };
}

test("a document is filed on the patient's health page with its Drive link and date", async () => {
  const { client, writes } = fake();
  const r = await applyRianaUpdate(client, { id: "u1", kind: "document", summary: "Diana letter 2006-02-14", payload: {
    date: "2006-02-14", patient: "diana", doc_type: "letter", provider: "Dr. Leo Kesting", content_summary: "Atypical TN; MVD ~50% benefit.", drive_link: "https://drive.google.com/file/d/abc/view" } });
  assert.deepEqual(r, { ok: true, applied: { table: "imported_files", id: "new-id" } });
  const row = writes[0].row;
  assert.equal(row.section, "health_diana");
  assert.equal(row.web_view_link, "https://drive.google.com/file/d/abc/view");
  assert.equal(row.taken_at, "2006-02-14");
  assert.equal(row.target_note, "[letter] Dr. Leo Kesting: Atypical TN; MVD ~50% benefit.");
  assert.equal(row.drive_file_id, "riana:u1");
});

test("a Bills v2 payload becomes a bill with account numbers shortened", async () => {
  const { client, writes } = fake();
  const r = await applyRianaUpdate(client, { id: "u2", kind: "bill", summary: "Bills v2 NEW: Pacific Disposal", payload: { bill: {
    payee: "Pacific Disposal", category: "utilities_trash", notes: "account 2183-644021-001", amount: { value: 75.47, asof: "2026-11-03" },
    due: { cadence: "monthly", autopay: "confirmed", due_date: null }, pay_with_last4: "7087", questions: ["Confirm amount"] } } });
  assert.equal(r.ok, true);
  const row = writes[0].row;
  assert.equal(row.payee, "Pacific Disposal"); assert.equal(row.amount, 75.47); assert.equal(row.frequency, "monthly"); assert.equal(row.autopay, true);
  assert.ok(!String(row.notes).includes("644021"), "full account number must not be stored");
  assert.ok(String(row.notes).includes("····001") && String(row.notes).includes("Confirm amount"));
});

test("a correction updates the matching bill instead of adding one", async () => {
  const { client, writes } = fake({ id: "bill-9" });
  const r = await applyRianaUpdate(client, { id: "u3", kind: "bill", summary: "Bills v2 CORRECTION: Liberty Mutual", payload: { correction_or_new: "correction", bill: { payee: "Liberty Mutual", amount: { value: 75 }, due: { cadence: "monthly" } } } });
  assert.deepEqual(r, { ok: true, applied: { table: "bills", id: "bill-9" } });
  assert.equal(writes[0].op, "update");
});

test("a lab result without a patient is refused; a question lands as open", async () => {
  const { client, writes } = fake();
  const bad = await applyRianaUpdate(client, { id: "u4", kind: "lab_result", summary: "Lab", payload: { test: "CBC" } });
  assert.equal(bad.ok, false);
  const q = await applyRianaUpdate(client, { id: "u5", kind: "urgent_question", summary: "Estate", payload: { question: "Keep the TOD deeds?", asked_of: "both", priority: "high" } });
  assert.equal(q.ok, true);
  assert.equal(writes[0].row.status, "open"); assert.equal(writes[0].row.priority, "high");
  const note = await applyRianaUpdate(client, { id: "u6", kind: "note", summary: "n", payload: {} });
  assert.deepEqual(note, { ok: true, applied: null });
});
