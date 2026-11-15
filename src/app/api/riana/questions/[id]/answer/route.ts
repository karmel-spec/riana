import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemo } from "@/lib/env";
import { anonClient, bearer, json, rpcError } from "@/lib/riana/agent-route";
import { demoAnswerQuestion } from "@/lib/riana/questions";
import { checkForSecrets } from "@/lib/riana/secret-check";

/**
 * Ask Riana, agent side: post the answer to one message.
 *
 *   POST /api/riana/questions/<id>/answer
 *   Authorization: Bearer <the same key as /api/riana/inbound>
 *   Content-Type: application/json
 *   { "answer": "…" }          (1 to 4,000 characters after trimming)
 *
 * DISPLAY ONLY. The answer appears in the family's chat thread and nothing
 * else happens: no binder record changes, riana_apply is not called, and a
 * linked "teach" inbox item stays pending until a super admin reviews it.
 * Answers go through the same secret check as family messages. The key is
 * verified in Postgres (public.riana_question_answer, security definer).
 *
 * Replies: 200 {id, status:"answered"} (also for a retry of the same answer),
 * 400 bad body or an answer that looks like a secret, 401 bad key, 404 unknown
 * id, 409 already answered with different text, 413 too large, 503 not
 * configured or migration not applied.
 */

const Body = z.object({ answer: z.string().trim().min(1).max(4000) });
const MAX_BODY_BYTES = 32_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const key = bearer(req);
  if (!key) return json(401, { error: "Missing or malformed bearer key." });

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return json(404, { error: "No such question." });

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json(413, { error: `Body must be under ${MAX_BODY_BYTES} bytes.` });
    raw = JSON.parse(text);
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return json(400, { error: "Invalid answer.", issues: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`) });
  const { answer } = parsed.data;

  // Never store or show a secret, whoever sent it.
  if (!checkForSecrets(answer).ok) {
    return json(400, { error: "The answer looks like it contains a password, a Social Security number or a full account number. Refer to the 1Password item by name instead." });
  }

  const fresh = () => { revalidatePath("/"); revalidatePath("/admin/riana"); };

  // Demo mode: any long-enough key may answer in the fake thread.
  if (isDemo()) {
    const r = demoAnswerQuestion(id, answer);
    if (r === "not_found") return json(404, { error: "No such question." });
    if (r === "conflict") return json(409, { error: "That question already has a different answer." });
    fresh();
    return json(200, { id, status: "answered", ...(r === "duplicate" ? { duplicate: true } : {}), demo: true });
  }

  const supabase = anonClient();
  if (!supabase) return json(503, { error: "Ask Riana is not connected to a database yet." });

  const { data, error } = await supabase.rpc("riana_question_answer", { p_key: key, p_id: id, p_answer: answer });
  if (error) {
    if (error.code === "P0002") return json(404, { error: "No such question." });
    if (error.code === "RQ409") return json(409, { error: "That question already has a different answer." });
    if (error.code === "RQSEC") return json(400, { error: "The answer looks like it contains a password or an account number." });
    return rpcError("riana/questions/answer", error, "Could not record the answer.");
  }
  fresh();
  return json(200, data as Record<string, unknown>);
}

export function GET() {
  return json(405, { error: "POST a JSON answer with a bearer key. See docs/ASK_RIANA.md." });
}
