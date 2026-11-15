"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/session";
import { addDocSource, removeDocSource, setDocSourceEnabled, syncDocSources, type DocSource, type DocSyncResult } from "@/lib/riana/doc-sync";
import { driveIdFromLink } from "@/lib/riana/doc-parse";
import { canAskRiana, getRianaThread, recordWebhookOutcome, submitRianaQuestion, NOT_READY } from "@/lib/riana/questions";
import { checkForSecrets, VAULT_WARNING } from "@/lib/riana/secret-check";
import { buildWebhookPayload } from "@/lib/riana/thread";
import { notifyRiana } from "@/lib/riana/notify-webhook";
import type { RianaQuestion } from "@/lib/types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function admin() {
  const v = await getViewer();
  if (v.role !== "super_admin") throw new Error("Super admins only.");
  return v;
}

export async function addRianaDoc(input: { name: string; link: string }): Promise<Result<DocSource>> {
  try {
    const parsed = z.object({ name: z.string().trim().max(120), link: z.string().trim().min(10).max(500) }).safeParse(input);
    if (!parsed.success) return { ok: false, error: "Give the doc a name and paste its link." };
    const id = driveIdFromLink(parsed.data.link);
    if (!id) return { ok: false, error: "That doesn't look like a Google Docs link or file id." };
    const v = await admin();
    const data = await addDocSource(v, parsed.data.name, id);
    revalidatePath("/admin/riana");
    return { ok: true, data };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeRianaDoc(id: string): Promise<Result> {
  try {
    const v = await admin();
    await removeDocSource(v, id);
    revalidatePath("/admin/riana");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function toggleRianaDoc(id: string, enabled: boolean): Promise<Result> {
  try {
    const v = await admin();
    await setDocSourceEnabled(v, id, enabled);
    revalidatePath("/admin/riana");
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function syncRianaDocs(dryRun: boolean): Promise<Result<DocSyncResult>> {
  try {
    const v = await admin();
    const data = await syncDocSources(v, { dryRun });
    revalidatePath("/admin/riana"); revalidatePath("/");
    return { ok: true, data };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// --- Ask Riana: the home-page chat ---------------------------------------------------

export type AskRianaResult = { ok: true; questions: RianaQuestion[] } | { ok: false; error: string };

const Ask = z.object({
  intent: z.enum(["question", "teach"]),
  body: z.string().trim().min(3, "Please write a little more.").max(2000, "That is too long for one message. Please send it in two parts."),
  asker: z.enum(["rich", "diana"]).optional(),
  onBehalfOf: z.enum(["rich", "diana"]).nullish(),
});

const NOT_ALLOWED = "Only Rich, Diana, Karmel and Heather can use the chat with Riana.";

/**
 * Send one chat message to Riana. Stores it (public.ask_riana), wakes her
 * routine with the webhook, and returns the refreshed thread. A message that
 * looks like a secret is refused before anything is stored or sent.
 */
export async function askRiana(input: { intent: "question" | "teach"; body: string; asker?: "rich" | "diana"; onBehalfOf?: "rich" | "diana" | null }): Promise<AskRianaResult> {
  const v = await getViewer();
  if (!canAskRiana(v)) return { ok: false, error: NOT_ALLOWED };
  const parsed = Ask.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { intent, body, onBehalfOf } = parsed.data;
  if (!checkForSecrets(body).ok) return { ok: false, error: VAULT_WARNING };

  // A parent chooses Rich or Diana (a shared sign-in); a super admin is always themself.
  let asker: "rich" | "diana" | undefined;
  if (v.role === "parent") {
    asker = parsed.data.asker ?? (v.isSubject === "rich" || v.isSubject === "diana" ? v.isSubject : undefined);
    if (!asker) return { ok: false, error: "Please choose who is asking: Rich or Diana." };
  }

  const sent = await submitRianaQuestion(v, { intent, body, asker, onBehalfOf: v.role === "super_admin" ? onBehalfOf ?? null : null });
  if (!sent.ok) return sent;

  // Wake Riana. Whatever happens here, the message is stored and stays "waiting".
  let thread = await getRianaThread(v);
  const outcome = await notifyRiana(buildWebhookPayload(sent.question, thread.questions));
  await recordWebhookOutcome(v, sent.question.id, outcome);

  revalidatePath("/"); revalidatePath("/admin/riana");
  if (!thread.questions.some((q) => q.id === sent.question.id)) thread = { ...thread, questions: [...thread.questions, sent.question] };
  return { ok: true, questions: thread.questions };
}

/** The chat polls this while a message is waiting. Uses the signed-in session, never the agent key. */
export async function rianaThread(): Promise<AskRianaResult> {
  const v = await getViewer();
  if (!canAskRiana(v)) return { ok: false, error: NOT_ALLOWED };
  const thread = await getRianaThread(v);
  if (!thread.ready) return { ok: false, error: thread.missing ? NOT_READY : "The chat could not be loaded just now." };
  return { ok: true, questions: thread.questions };
}
