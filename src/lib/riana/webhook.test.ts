import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWebhookPayload, recentThread } from "./thread.ts";
import { sendWebhook } from "./webhook-send.ts";

type Q = Parameters<typeof buildWebhookPayload>[0];

const at = (min: number) => new Date(Date.UTC(2026, 10, 15, 18, min)).toISOString();
const q = (n: number, over: Partial<Q> = {}): Q => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, public_id: n, intent: "question", channel: "web", asker: "diana", on_behalf_of: null,
  body: `question ${n}`, status: "answered", answer: `answer ${n}`, created_at: at(n * 10), answered_at: at(n * 10 + 1), ...over,
});

test("recent_thread ends with the new message and carries about six messages, oldest first", () => {
  const thread = [q(1), q(2), q(3), q(4, { asker: "rich" })];
  const fresh = q(5, { status: "waiting", answer: null, answered_at: null });
  const recent = recentThread([...thread, fresh], fresh);
  assert.equal(recent.length, 6);
  assert.deepEqual(recent.at(-1), { role: "user", asker: "diana", text: "question 5", created_at: at(50) });
  assert.deepEqual(recent.map((m) => m.role), ["riana", "user", "riana", "user", "riana", "user"]);
  assert.deepEqual(recent.map((m) => m.text), ["answer 2", "question 3", "answer 3", "question 4", "answer 4", "question 5"]);
  assert.equal(recent[3].asker, "rich");
  assert.deepEqual([...recent].sort((a, b) => a.created_at.localeCompare(b.created_at)), recent);
});

test("a first message travels alone, and later messages are left out", () => {
  const first = q(1, { status: "waiting", answer: null, answered_at: null });
  assert.equal(recentThread([first], first).length, 1);
  assert.deepEqual(recentThread([first, q(2)], first).map((m) => m.text), ["question 1"]);
});

test("the payload has the spec's fields", () => {
  const fresh = q(2, { intent: "teach", asker: "karmel", on_behalf_of: "rich", status: "waiting", answer: null, answered_at: null });
  const p = buildWebhookPayload(fresh, [q(1), fresh]);
  assert.equal(p.question_id, fresh.id);
  assert.equal(p.asker, "karmel");
  assert.equal(p.text, "question 2");
  assert.equal(p.created_at, at(20));
  assert.equal(p.recent_thread.length, 3);
  assert.equal(p.intent, "teach");
  assert.equal(p.on_behalf_of, "rich");
});

const payload = buildWebhookPayload(q(1, { body: "a private family question" }), []);
const KEY = "test-key-not-a-real-one";

test("skips when the address or the key is unset, without calling anything", async () => {
  let calls = 0;
  const fetchImpl = (async () => { calls++; return new Response("ok"); }) as typeof fetch;
  assert.equal(await sendWebhook({ url: undefined, key: KEY, payload, fetchImpl }), "skipped");
  assert.equal(await sendWebhook({ url: "https://hooks.example.test/r", key: "", payload, fetchImpl }), "skipped");
  assert.equal(calls, 0);
});

test("posts JSON with the key as a bearer header", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const fetchImpl = (async (url: URL | RequestInfo, init?: RequestInit) => { seen = { url: String(url), init: init ?? {} }; return new Response("{}", { status: 200 }); }) as typeof fetch;
  assert.equal(await sendWebhook({ url: "https://hooks.example.test/r", key: KEY, payload, fetchImpl }), "sent");
  const s = seen as unknown as { url: string; init: RequestInit };
  assert.equal(s.url, "https://hooks.example.test/r");
  assert.equal(s.init.method, "POST");
  const headers = s.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, `Bearer ${KEY}`);
  assert.equal(headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(String(s.init.body)), payload);
});

test("a failure is reported as failed, and the log never has the key, the address or the message", async () => {
  const lines: string[] = [];
  const log = (l: string) => lines.push(l);
  const bad = (async () => new Response("no", { status: 500 })) as typeof fetch;
  const boom = (async () => { throw new TypeError(`could not reach https://hooks.example.test/r with ${KEY}`); }) as typeof fetch;
  assert.equal(await sendWebhook({ url: "https://hooks.example.test/r", key: KEY, payload, fetchImpl: bad, log }), "failed");
  assert.equal(await sendWebhook({ url: "https://hooks.example.test/r", key: KEY, payload, fetchImpl: boom, log }), "failed");
  assert.equal(await sendWebhook({ url: "http://hooks.example.test/r", key: KEY, payload, fetchImpl: bad, log }), "failed");
  assert.equal(await sendWebhook({ url: "not an address", key: KEY, payload, fetchImpl: bad, log }), "failed");
  assert.equal(lines.length, 4);
  for (const l of lines) {
    assert.ok(l.includes(payload.question_id), l);
    assert.ok(!l.includes(KEY) && !l.includes("hooks.example.test") && !l.includes("private family question"), l);
  }
});
