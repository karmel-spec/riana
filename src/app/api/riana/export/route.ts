import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isDemo } from "@/lib/env";
import { demoStore } from "@/lib/data";
import { SECTIONS, type Section } from "@/lib/types";

/**
 * Read-only export for Riana (or any assistant acting for the family).
 *
 *   GET /api/riana/export?sections=urgent_questions,calendar
 *   Authorization: Bearer <key minted with public.riana_inbound_key_create()>
 *
 * Returns JSON for the sections a super admin has granted to that key
 * (public.riana_key_set_read_sections). Omit `sections` for everything the
 * key may read. Sections the key may not read are listed under
 * `not_permitted` rather than returned. Logins, documents, family history,
 * and admin data are never exported. Each call is written to the audit log
 * as an "export" by Riana. The key is verified in Postgres
 * (public.riana_export, security definer) with only the publishable key.
 *
 * Replies: 200 export, 400 unknown section, 401 bad key, 503 not configured.
 */

const EXPORTABLE: readonly Section[] = [
  "urgent_questions", "calendar", "contacts", "health_diana", "health_rich", "properties", "accounts",
  "bills", "insurance", "taxes", "legal", "final_wishes", "household", "next_steps",
];

const json = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function bearer(req: NextRequest): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  return m ? m[1] : null;
}

function wantedSections(req: NextRequest): { sections: Section[] | null; unknown: string[] } {
  const raw = req.nextUrl.searchParams.getAll("sections").flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean);
  if (raw.length === 0) return { sections: null, unknown: [] };
  const unknown = raw.filter((s) => !(SECTIONS as readonly string[]).includes(s));
  return { sections: [...new Set(raw)] as Section[], unknown };
}

export async function GET(req: NextRequest) {
  const key = bearer(req);
  if (!key || key.length < 32) return json(401, { error: "Missing or malformed bearer key." });

  const { sections, unknown } = wantedSections(req);
  if (unknown.length) return json(400, { error: "Unknown section.", unknown, known: EXPORTABLE });

  // Demo mode: any long-enough key may read every exportable section of the
  // fake data, so the shape can be tried without a database.
  if (isDemo()) {
    const s = demoStore();
    const allowed = (sections ?? EXPORTABLE).filter((x) => EXPORTABLE.includes(x));
    const denied = (sections ?? []).filter((x) => !EXPORTABLE.includes(x));
    const demo: Partial<Record<Section, unknown>> = {
      urgent_questions: s.questions.filter((q) => q.status !== "closed"),
      calendar: s.events,
      contacts: s.people,
      health_diana: { patient: "diana", lab_results: s.labs.filter((l) => l.patient === "diana") },
      health_rich: { patient: "rich", lab_results: s.labs.filter((l) => l.patient === "rich") },
      properties: { loans_owed_by_estate: s.loans.filter((l) => l.direction === "owed_by_estate") },
      accounts: { loans_owed_to_estate: s.loans.filter((l) => l.direction === "owed_to_estate") },
      bills: s.bills,
      legal: s.legal,
      final_wishes: s.wishes,
    };
    const out: Record<string, unknown> = {};
    for (const x of allowed) out[x] = demo[x] ?? [];
    s.audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: "Riana", action: "export", section: null, entity: "riana_export", via: "riana", summary: `Exported ${allowed.join(", ") || "nothing"}` });
    return json(200, { generated_at: new Date().toISOString(), key_label: "demo", sections: out, not_permitted: denied, demo: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return json(503, { error: "Export is not connected to a database yet." });

  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("riana_export", { p_key: key, p_sections: sections });
  if (error) {
    if (error.code === "28000") return json(401, { error: "Invalid or revoked key." });
    if (error.code === "22023") return json(400, { error: error.message });
    // PGRST202: PostgREST cannot find the function, i.e. the Riana migrations are not applied yet.
    if (error.code === "PGRST202") return json(503, { error: "The database is missing the Riana migrations. Run scripts/apply-migrations.sh against the project." });
    console.error("[riana/export]", error.code, error.message);
    return json(500, { error: "Could not build the export." });
  }
  return json(200, data as Record<string, unknown>);
}
