import "server-only";
import { isDemo } from "../env";
import type { WebhookPayload } from "./thread";
import { sendWebhook, type WebhookOutcome } from "./webhook-send";

/**
 * Wake Riana's "Ask Riana live chat (webapp)" routine for one stored message.
 *
 *   POST $RIANA_WEBHOOK_URL
 *   Authorization: Bearer $RIANA_WEBHOOK_KEY
 *
 * Both values are server-only environment variables set in Netlify. When either
 * is unset, or in demo mode, nothing is sent and the outcome is "skipped". A
 * failed call returns "failed" and leaves the stored question waiting for
 * Riana's catch-up poll. The caller records the outcome as webhook_status.
 */
export async function notifyRiana(payload: WebhookPayload): Promise<WebhookOutcome> {
  if (isDemo()) return "skipped";
  return sendWebhook({ url: process.env.RIANA_WEBHOOK_URL, key: process.env.RIANA_WEBHOOK_KEY, payload });
}
