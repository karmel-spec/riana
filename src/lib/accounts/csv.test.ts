import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parseAccountsCsv, splitCsv } from "./csv.ts";

const SAMPLE = new URL("../../../docs/samples/accounts-directory-sample.csv", import.meta.url);

test("the sample CSV (54 fake accounts) imports with names and statuses only", () => {
  const r = parseAccountsCsv(readFileSync(SAMPLE, "utf8"));
  assert.ok(r.ok, r.ok ? "" : r.error);
  if (!r.ok) return;
  assert.equal(r.rows.length, 54);
  const found = r.rows.filter((x) => x.status === "found").length;
  assert.ok(found > 0 && found < 54, `found=${found}`);
  assert.ok(r.rows.every((x) => ["rich", "diana", "both"].includes(x.owner)));
});

test("a password column makes the whole import fail", () => {
  const r = parseAccountsCsv("name,owner,password\nGmail,Rich,hunter2\n");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /credential/i);
});

test("a password in the notes makes the import fail", () => {
  const r = parseAccountsCsv('name,owner,notes\nGmail,Rich,"password: hunter2"\n');
  assert.equal(r.ok, false);
});

test("unknown columns are refused, quoting and status words are handled", () => {
  assert.equal(parseAccountsCsv("name,favorite_color\nGmail,blue\n").ok, false);
  const r = parseAccountsCsv('name,owner,status,notes\n"Bank, Sample",Diana,Found,"has ""two"" cards"\nStreaming,,to find,\n');
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.rows[0].service, "Bank, Sample");
  assert.equal(r.rows[0].status, "found");
  assert.equal(r.rows[0].notes, 'has "two" cards');
  assert.equal(r.rows[1].owner, "both");
  assert.equal(r.rows[1].status, "to_find");
});

test("splitCsv handles CRLF and trailing newline", () => {
  assert.deepEqual(splitCsv("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
});

// --- Schema guard: no migration may add a credential-looking column ---------
test("no migration defines a column that looks like a credential or identifier", () => {
  const dir = new URL("../../../supabase/migrations/", import.meta.url);
  const forbidden = /^\s*(password|passwd|pwd|secret|token|api_key|apikey|pin|passcode|credential|private_key|ssn|social_security|dob|date_of_birth|birth_date|birthdate)\s+(text|varchar|char|bytea|jsonb|json)\b/im;
  const allowed = /^\s*key_hash\s+text/im;   // Riana inbound keys are stored hashed; the plaintext never lands
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql"))) {
    const sql = readFileSync(new URL(f, dir), "utf8");
    const hit = sql.match(forbidden);
    assert.equal(hit, null, `${f} defines a credential-like column: ${hit?.[0]}`);
    void allowed;
  }
});
