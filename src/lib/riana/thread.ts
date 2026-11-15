import type { RianaAsker, RianaQuestion } from "../types";

/** What the web app POSTs to Riana's routine when a family message is stored. */
export type WebhookMessage = { role: "user" | "riana"; asker: RianaAsker; text: string; created_at: string };
export type WebhookPayload = {
  question_id: string;
  asker: RianaAsker;
  text: string;
  created_at: string;
  recent_thread: WebhookMessage[];
  /** Additions to the spec's shape, so Riana can tell a question from a note without a second call. */
  public_id: number;
  intent: RianaQuestion["intent"];
  channel: RianaQuestion["channel"];
  on_behalf_of: RianaQuestion["on_behalf_of"];
};

const ms = (iso: string) => new Date(iso).getTime();

/** About this many messages of context travel with each webhook call. */
export const RECENT_THREAD_SIZE = 6;

/**
 * The last few messages of the household thread, oldest first, ending with the
 * new message. Each stored row is one family message plus, once answered,
 * Riana's reply. Anything sent after the new message is left out.
 */
export function recentThread(thread: RianaQuestion[], question: RianaQuestion, size = RECENT_THREAD_SIZE): WebhookMessage[] {
  const upTo = [...thread.filter((q) => q.id !== question.id && ms(q.created_at) <= ms(question.created_at))]
    .sort((a, b) => ms(a.created_at) - ms(b.created_at));
  const messages: WebhookMessage[] = [];
  for (const q of upTo) {
    messages.push({ role: "user", asker: q.asker, text: q.body, created_at: q.created_at });
    if (q.status === "answered" && q.answer && q.answered_at) messages.push({ role: "riana", asker: q.asker, text: q.answer, created_at: q.answered_at });
  }
  messages.sort((a, b) => ms(a.created_at) - ms(b.created_at));
  const mine: WebhookMessage = { role: "user", asker: question.asker, text: question.body, created_at: question.created_at };
  return [...messages.slice(-(Math.max(size, 1) - 1)), mine];
}

export function buildWebhookPayload(question: RianaQuestion, thread: RianaQuestion[]): WebhookPayload {
  return {
    question_id: question.id,
    asker: question.asker,
    text: question.body,
    created_at: question.created_at,
    recent_thread: recentThread(thread, question),
    public_id: question.public_id,
    intent: question.intent,
    channel: question.channel,
    on_behalf_of: question.on_behalf_of,
  };
}
