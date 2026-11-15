import "server-only";
import { createClient } from "../supabase/server";
import { demoStore } from "../data";
import type { Viewer } from "../session";
import type { RianaAsker, RianaQuestion } from "../types";
import type { WebhookOutcome } from "./webhook-send";

/**
 * Ask Riana: the home-page chat. Reads and family submits use the signed-in
 * person's session (row-level security and public.ask_riana decide what is
 * allowed). The agent side lives in src/app/api/riana/questions.
 */

export const MIGRATION = "20261115000027_riana_questions.sql";
export const MAX_PER_HOUR = 8;
const THREAD_SIZE = 60;
const COLUMNS = "id, public_id, intent, channel, asker, on_behalf_of, body, status, answer, created_at, answered_at";

/** Only Rich, Diana and the super admins see or use the chat. */
export const canAskRiana = (v: Pick<Viewer, "role">) => v.role === "parent" || v.role === "super_admin";

export type RianaThread = {
  /** False until the riana_questions migration is applied (or the read failed). */
  ready: boolean;
  /** True when the database has no riana_questions table yet. */
  missing: boolean;
  questions: RianaQuestion[];
};

/** PostgREST / Postgres ways of saying "that table or function is not there". */
const isMissing = (e: { code?: string | null; message?: string | null }) =>
  e.code === "PGRST205" || e.code === "PGRST202" || e.code === "42P01" || e.code === "42883";

const strip = (q: RianaQuestion & { asked_by?: string }): RianaQuestion => ({
  id: q.id, public_id: q.public_id, intent: q.intent, channel: q.channel, asker: q.asker, on_behalf_of: q.on_behalf_of,
  body: q.body, status: q.status, answer: q.answer, created_at: q.created_at, answered_at: q.answered_at,
});

// --- Demo ----------------------------------------------------------------------------
const DEMO_ANSWER_AFTER_MS = 12_000;
const DEMO_ANSWER = "[Sample] This is the sample binder, so this is a sample answer. In the family’s real binder, Riana replies here, usually within a minute.";

/** In demo there is no Riana, so a waiting message answers itself after a few seconds. */
function demoSettle() {
  const s = demoStore();
  const cutoff = Date.now() - DEMO_ANSWER_AFTER_MS;
  for (const q of s.rianaQuestions) {
    if (q.status === "waiting" && new Date(q.created_at).getTime() < cutoff) {
      q.status = "answered"; q.answer = DEMO_ANSWER; q.answered_at = new Date().toISOString();
    }
  }
}

function demoThread(v: Viewer): RianaQuestion[] {
  demoSettle();
  const rows = demoStore().rianaQuestions.filter((q) =>
    v.role === "super_admin" || q.asker === "rich" || q.asker === "diana" || q.on_behalf_of !== null || q.asked_by === v.id);
  return [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-THREAD_SIZE).map(strip);
}

/** Demo side of GET /api/riana/questions. */
export function demoListQuestions(status: "waiting" | "answered" | "all"): RianaQuestion[] {
  const s = demoStore();
  const rows = s.rianaQuestions.filter((q) => status === "all" || q.status === status);
  s.audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: "Riana", action: "export", section: "admin", entity: "riana_questions", via: "riana", summary: `Read ${rows.length} Ask Riana message${rows.length === 1 ? "" : "s"} (${status})` });
  return [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-200).map(strip);
}

/** Demo side of POST /api/riana/questions/<id>/answer. */
export function demoAnswerQuestion(id: string, answer: string): "answered" | "duplicate" | "conflict" | "not_found" {
  const s = demoStore();
  const q = s.rianaQuestions.find((x) => x.id === id);
  if (!q) return "not_found";
  if (q.status === "answered") return q.answer === answer ? "duplicate" : "conflict";
  q.status = "answered"; q.answer = answer; q.answered_at = new Date().toISOString();
  s.audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: "Riana", action: "update", section: "admin", entity: "riana_questions", via: "riana", summary: `Answered Ask Riana message Q-${q.public_id}` });
  return "answered";
}

// --- Read ----------------------------------------------------------------------------
/** The thread this person may see, oldest first. Never throws: the home page must load even if the chat cannot. */
export async function getRianaThread(v: Viewer): Promise<RianaThread> {
  if (!canAskRiana(v)) return { ready: true, missing: false, questions: [] };
  if (v.demo) return { ready: true, missing: false, questions: demoThread(v) };
  const supabase = await createClient();
  const { data, error } = await supabase.from("riana_questions").select(COLUMNS).order("created_at", { ascending: false }).limit(THREAD_SIZE);
  if (error) {
    if (!isMissing(error)) console.error("[riana/questions] thread:", error.code, error.message);
    return { ready: false, missing: isMissing(error), questions: [] };
  }
  return { ready: true, missing: false, questions: (data as RianaQuestion[]).reverse() };
}

// --- Submit --------------------------------------------------------------------------
export type AskInput = { intent: "question" | "teach"; body: string; asker?: "rich" | "diana"; onBehalfOf?: "rich" | "diana" | null };
export type AskOutcome = { ok: true; question: RianaQuestion } | { ok: false; error: string };

const TOO_MANY = "That is a lot of messages in one hour. Please wait a little while, then try again.";
const NOT_ALLOWED = "Only Rich, Diana, Karmel and Heather can use the chat with Riana.";
export const NOT_READY = `The chat is not switched on yet: the database is missing the Ask Riana migration (${MIGRATION}).`;

/** Stores one message (and, for "teach", a pending inbox item). The caller has already validated and secret-checked it. */
export async function submitRianaQuestion(v: Viewer, input: AskInput): Promise<AskOutcome> {
  if (!canAskRiana(v)) return { ok: false, error: NOT_ALLOWED };

  if (v.demo) {
    const s = demoStore();
    const hourAgo = Date.now() - 3_600_000;
    if (s.rianaQuestions.filter((q) => q.asked_by === v.id && new Date(q.created_at).getTime() > hourAgo).length >= MAX_PER_HOUR) return { ok: false, error: TOO_MANY };
    const first = v.name.trim().split(/\s+/)[0].toLowerCase();
    const asker = (v.role === "parent" ? input.asker ?? v.isSubject : first) as RianaAsker;
    if (!["rich", "diana", "karmel", "heather"].includes(asker)) return { ok: false, error: NOT_ALLOWED };
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(), public_id: s.rianaQuestions.reduce((m, q) => Math.max(m, q.public_id), 0) + 1,
      intent: input.intent, channel: "web" as const, asker, on_behalf_of: v.role === "super_admin" ? input.onBehalfOf ?? null : null,
      body: input.body, status: "waiting" as const, answer: null, created_at: now, answered_at: null, asked_by: v.id,
    };
    s.rianaQuestions.push(row);
    if (input.intent === "teach") {
      s.riana.unshift({ id: crypto.randomUUID(), kind: "teach", summary: input.body.length > 100 ? `${input.body.slice(0, 100)}…` : input.body, received_at: now, review_status: "pending",
        payload: { text: input.body, from: v.name, asker, on_behalf_of: row.on_behalf_of, question_id: row.id, question_public_id: row.public_id } });
    }
    s.audit.unshift({ id: Date.now(), at: now, actor_name: v.name, action: "create", section: "admin", entity: "riana_questions", via: "app", summary: input.intent === "teach" ? "Told Riana something new" : "Asked Riana a question" });
    return { ok: true, question: strip(row) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ask_riana", {
    p_intent: input.intent, p_body: input.body,
    p_asker: v.role === "parent" ? input.asker ?? null : null,
    p_on_behalf_of: v.role === "super_admin" ? input.onBehalfOf ?? null : null,
  });
  if (error) {
    if (isMissing(error)) return { ok: false, error: NOT_READY };
    if (error.code === "RQ429") return { ok: false, error: TOO_MANY };
    if (error.code === "RQSEC") return { ok: false, error: "That looks like a password or an account number, so it was not sent. Those stay in the password vault." };
    if (error.code === "42501" || error.code === "28000") return { ok: false, error: NOT_ALLOWED };
    if (error.code === "22023") return { ok: false, error: "That message could not be sent. Please check it and try again." };
    console.error("[riana/questions] ask:", error.code);
    return { ok: false, error: "Something went wrong and the message was not sent. Please try again in a minute." };
  }
  const r = data as { id: string; public_id: number; created_at: string; asker: RianaAsker; on_behalf_of: "rich" | "diana" | null };
  return {
    ok: true,
    question: { id: r.id, public_id: r.public_id, intent: input.intent, channel: "web", asker: r.asker, on_behalf_of: r.on_behalf_of, body: input.body, status: "waiting", answer: null, created_at: r.created_at, answered_at: null },
  };
}

/** Records what happened when the web app called Riana's webhook. A failure here is logged and otherwise ignored. */
export async function recordWebhookOutcome(v: Viewer, id: string, outcome: WebhookOutcome): Promise<void> {
  if (v.demo) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("riana_question_set_webhook", { p_id: id, p_status: outcome });
  if (error) console.error("[riana/questions] webhook status:", error.code);
}
