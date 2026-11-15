import type { WebhookPayload } from "./thread";

export type WebhookOutcome = "sent" | "failed" | "skipped";

type Options = {
  /** RIANA_WEBHOOK_URL. Unset means the webhook is not configured. */
  url: string | undefined;
  /** RIANA_WEBHOOK_KEY. Sent as Authorization: Bearer; never logged. */
  key: string | undefined;
  payload: WebhookPayload;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  log?: (line: string) => void;
};

/**
 * POST one message to Riana's routine. Never throws: a webhook problem must not
 * lose the stored question, so every failure comes back as "failed" and Riana's
 * catch-up poll (GET /api/riana/questions?status=open) picks the message up.
 *
 * Log lines carry the question id and an HTTP status or error name only: never
 * the key, the webhook address, or the message text.
 */
export async function sendWebhook({ url, key, payload, fetchImpl = fetch, timeoutMs = 6000, log = console.error }: Options): Promise<WebhookOutcome> {
  if (!url || !key) return "skipped";

  let target: URL;
  try { target = new URL(url); } catch {
    log(`[riana/webhook] question ${payload.question_id}: RIANA_WEBHOOK_URL is not a valid address`);
    return "failed";
  }
  const local = target.hostname === "localhost" || target.hostname === "127.0.0.1";
  if (target.protocol !== "https:" && !(target.protocol === "http:" && local)) {
    log(`[riana/webhook] question ${payload.question_id}: RIANA_WEBHOOK_URL must start with https://`);
    return "failed";
  }

  try {
    const res = await fetchImpl(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
      redirect: "error",
    });
    if (res.ok) return "sent";
    log(`[riana/webhook] question ${payload.question_id}: webhook replied ${res.status}`);
    return "failed";
  } catch (e) {
    const name = e instanceof Error ? e.name : "Error";
    log(`[riana/webhook] question ${payload.question_id}: webhook call failed (${name})`);
    return "failed";
  }
}
