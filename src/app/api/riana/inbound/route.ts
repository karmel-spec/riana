import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isDemo } from "@/lib/env";
import { demoStore } from "@/lib/data";

/**
 * Inbound updates from Riana (or any assistant acting for the family).
 *
 *   POST /api/riana/inbound
 *   Authorization: Bearer <key minted with public.riana_inbound_key_create()>
 *   Content-Type: application/json
 *   { "kind": "lab_result", "summary": "...", "payload": {...}, "external_ref": "optional-id" }
 *
 * Nothing posted here touches a binder record. Each update lands in the
 * Riana inbox and waits for a super admin to approve or reject it on
 * Admin → Updates from Riana. The key is verified in Postgres
 * (public.riana_inbound, security definer) using only the publishable
 * Supabase key, so this route never holds the service-role secret.
 *
 * Replies: 201 {id, status:"pending"}, 200 for an already-received
 * external_ref, 400 bad body, 401 bad key, 413 too large, 503 not configured.
 */

const KINDS = ["appointment", "lab_result", "bill", "urgent_question", "document", "note", "contact", "album"] as const;

const Update = z.object({
  kind: z.enum(KINDS),
  summary: z.string().trim().min(1).max(500),
  payload: z.record(z.string(), z.unknown()).default({}),
  external_ref: z.string().trim().min(1).max(200).optional(),
});

const MAX_BODY_BYTES = 32_000;

const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  const key = bearer(req);
  if (!key || key.length < 32) {
    return json(401, { error: "Missing or malformed bearer key." });
  }

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return json(413, { error: `Body must be under ${MAX_BODY_BYTES} bytes.` });

  let raw: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json(413, { error: `Body must be under ${MAX_BODY_BYTES} bytes.` });
    raw = JSON.parse(text);
  } catch {
    return json(400, { error: "Body must be JSON." });
  }
  const parsed = Update.safeParse(raw);
  if (!parsed.success) {
    return json(400, { error: "Invalid update.", issues: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`) });
  }
  const u = parsed.data;

  // Demo mode: accept any long-enough key and drop it in the fake inbox so the
  // flow can be tried end to end without a database.
  if (isDemo()) {
    const s = demoStore();
    const existing = u.external_ref ? s.riana.find((r) => r.external_ref === u.external_ref) : undefined;
    if (existing) return json(201, { id: existing.id, status: existing.review_status, duplicate: true });
    const id = `demo-r-${Date.now()}`;
    s.riana.unshift({ id, kind: u.kind, summary: u.summary, received_at: new Date().toISOString(), review_status: "pending", external_ref: u.external_ref ?? null });
    s.audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: "Riana", action: "create", section: "admin", entity: "riana_updates", via: "riana", summary: `Sent ${u.kind.replace("_", " ")} for review` });
    return json(201, { id, status: "pending", demo: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return json(503, { error: "Inbox is not connected to a database yet." });

  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("riana_inbound", {
    p_key: key, p_kind: u.kind, p_summary: u.summary, p_payload: u.payload, p_external_ref: u.external_ref ?? null,
  });
  if (error) {
    // 28000 = bad key (raised by riana_inbound); 22023 = a validation rule the
    // database applies on top of ours. Everything else is logged, not echoed.
    if (error.code === "28000") return json(401, { error: "Invalid or revoked key." });
    if (error.code === "22023") return json(400, { error: error.message });
    // No code + "Invalid API key": NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY does not belong to NEXT_PUBLIC_SUPABASE_URL.
    if (!error.code && /invalid api key/i.test(error.message)) return json(503, { error: "The Supabase publishable key does not match the project URL. Check the site's environment variables." });
    // PGRST202: PostgREST cannot find the function, i.e. the Riana migrations are not applied yet.
    if (error.code === "PGRST202") return json(503, { error: "The database is missing the Riana migrations. Run scripts/apply-migrations.sh against the project." });
    console.error("[riana/inbound]", error.code, error.message);
    return json(500, { error: "Could not record the update.", code: error.code ?? null });
  }
  return json(201, { id: data as string, status: "pending" });
}

export function GET() {
  return json(405, { error: "POST a JSON update with a bearer key. See docs/RIANA_INBOUND.md." });
}
