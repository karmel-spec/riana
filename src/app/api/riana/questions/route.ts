import type { NextRequest } from "next/server";
import { isDemo } from "@/lib/env";
import { anonClient, bearer, json, rpcError } from "@/lib/riana/agent-route";
import { demoListQuestions } from "@/lib/riana/questions";

/**
 * Ask Riana, agent side: the catch-up list.
 *
 *   GET /api/riana/questions?status=open|waiting|answered|all   (default open)
 *   Authorization: Bearer <the same key as /api/riana/inbound>
 *
 * Returns the family's chat messages, oldest first, so Riana can answer any
 * that her webhook missed. "open" means still waiting for an answer. The key
 * is verified in Postgres (public.riana_questions_list, security definer) with
 * only the publishable Supabase key; each call is written to the audit log.
 *
 * Replies: 200 {questions, generated_at}, 400 unknown status, 401 bad key,
 * 503 not configured or migration not applied.
 */

const STATUSES = ["open", "waiting", "answered", "all"] as const;
type Status = (typeof STATUSES)[number];

export async function GET(req: NextRequest) {
  const key = bearer(req);
  if (!key) return json(401, { error: "Missing or malformed bearer key." });

  const raw = (req.nextUrl.searchParams.get("status") ?? "open").trim().toLowerCase();
  if (!(STATUSES as readonly string[]).includes(raw)) return json(400, { error: "Unknown status.", known: STATUSES });
  const status = raw as Status;

  // Demo mode: any long-enough key may read the fake thread.
  if (isDemo()) {
    return json(200, { questions: demoListQuestions(status === "open" ? "waiting" : status), generated_at: new Date().toISOString(), demo: true });
  }

  const supabase = anonClient();
  if (!supabase) return json(503, { error: "Ask Riana is not connected to a database yet." });

  const { data, error } = await supabase.rpc("riana_questions_list", { p_key: key, p_status: status });
  if (error) return rpcError("riana/questions", error, "Could not list the questions.");
  return json(200, data as Record<string, unknown>);
}

export function POST() {
  return json(405, { error: "GET the list with a bearer key, or POST an answer to /api/riana/questions/<id>/answer. See docs/ASK_RIANA.md." });
}
