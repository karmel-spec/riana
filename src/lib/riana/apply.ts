import type { SupabaseClient } from "@supabase/supabase-js";

/** What approving an inbox item files into the binder (real mode). Contacts and albums stay with the riana_apply RPC. */
export type Applied = { table: string; id: string } | null;

type P = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const pick = (p: P, ...keys: string[]) => { for (const k of keys) { const s = str(p[k]); if (s) return s; } return ""; };
const nested = (p: P, k: string): P => (p[k] && typeof p[k] === "object" && !Array.isArray(p[k]) ? (p[k] as P) : {});
const dateOf = (s: string) => (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
/** Never let a full account number through. */
const redact = (s: string) => s.replace(/\d[\d\s-]{6,}\d/g, (m) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(m) || m.replace(/\D/g, "").length < 7) return m; // dates and short refs stay
  return `····${(m.split(/[\s-]+/).pop() ?? "").slice(-4)}`;
});
const links = (p: P): string[] => Object.values(p).flatMap((v) => (typeof v === "string" && /^https?:\/\//.test(v) ? [v] : v && typeof v === "object" ? links(v as P) : []));
const patientOf = (p: P): "rich" | "diana" | null => { const s = pick(p, "patient", "about", "asked_of", "person").toLowerCase(); return s === "rich" || s === "diana" ? s : null; };
const FREQ: Record<string, string> = { monthly: "monthly", quarterly: "quarterly", semiannual: "semiannual", annual: "annual", yearly: "annual", one_time: "one_time", once: "one_time", per_service: "one_time", variable: "monthly" };

export async function applyRianaUpdate(
  supabase: SupabaseClient, u: { id: string; kind: string; summary: string; payload: P | null },
): Promise<{ ok: true; applied: Applied } | { ok: false; error: string }> {
  const p = u.payload ?? {};
  const fail = (what: string, e: { message: string } | null) => ({ ok: false as const, error: `Could not file the ${what}: ${e?.message ?? "unknown error"}` });

  if (u.kind === "document") {
    const patient = patientOf(p);
    const hint = pick(p, "target_section_hint", "proposed_section", "section");
    const section = patient ? `health_${patient}` : hint.startsWith("health_") ? hint.split(".")[0] : hint.split(".")[0] || "admin";
    const summary = pick(p, "content_summary", "summary", "description") || u.summary;
    const who = [pick(p, "provider"), pick(p, "facility")].filter(Boolean).join(" · ");
    const category = pick(p, "doc_type", "category", "kind").replace(/_/g, " ");
    const row = {
      drive_file_id: `riana:${u.id}`, drive_folder_key: "riana_backup", name: pick(p, "title", "name") || u.summary.slice(0, 200),
      mime_type: "application/pdf", media_kind: "document", sensitivity: "normal", review_status: "approved", manifest_rule: "riana",
      section, target_section: section, web_view_link: links(p)[0] ?? null, taken_at: dateOf(pick(p, "date", "collected_on", "taken_on", "signed_on")),
      target_note: `[${category || "document"}] ${who ? `${who}: ` : ""}${summary}`, source: "riana",
    };
    const { data, error } = await supabase.from("imported_files").insert(row).select("id").single();
    if (error) return fail("document", error);
    return { ok: true, applied: { table: "imported_files", id: data.id } };
  }

  if (u.kind === "lab_result") {
    const patient = patientOf(p);
    if (!patient) return { ok: false, error: "This lab result does not say whether it is Rich's or Diana's." };
    const value = Number(p.value); const num = Number.isFinite(value) ? value : null;
    const notes = [pick(p, "result_summary", "result", "summary"), pick(p, "lab") && `Lab: ${pick(p, "lab")}`, pick(p, "ordering_context"), links(p)[0]].filter(Boolean).join(" · ");
    const row = { patient, test_name: pick(p, "test", "test_name", "name") || u.summary.slice(0, 120), value: num, unit: pick(p, "unit") || null, flag: pick(p, "flag") || null,
      taken_on: dateOf(pick(p, "collected_on", "taken_on", "date")) ?? new Date().toISOString().slice(0, 10), notes: notes || u.summary, source: "riana" };
    const { data, error } = await supabase.from("lab_results").insert(row).select("id").single();
    if (error) return fail("lab result", error);
    return { ok: true, applied: { table: "lab_results", id: data.id } };
  }

  if (u.kind === "bill") {
    const b = Object.keys(nested(p, "bill")).length ? nested(p, "bill") : p;
    const amount = nested(b, "amount"); const due = nested(b, "due");
    const payee = pick(b, "payee", "name"); if (!payee) return { ok: false, error: "This bill has no payee." };
    const amt = Number(amount.value ?? b.amount); const num = Number.isFinite(amt) ? amt : null;
    const cadence = pick(due, "cadence") || pick(b, "cadence", "frequency", "recurrence");
    const autopayRaw = pick(due, "autopay") || pick(b, "autopay");
    const noteBits = [pick(b, "notes"), pick(amount, "note"), pick(b, "owner_context", "service_location") && `For: ${pick(b, "owner_context", "service_location")}`,
      pick(b, "pay_with_last4") && `Paid from ····${pick(b, "pay_with_last4")}`, pick(amount, "asof") && `Amount as of ${pick(amount, "asof")}`,
      Array.isArray(b.questions) && b.questions.length ? `To confirm: ${(b.questions as unknown[]).map(String).join("; ")}` : ""].filter(Boolean);
    const row = { payee, category: pick(b, "category").replace(/_/g, " ") || null, amount: num, frequency: FREQ[cadence] ?? "monthly",
      autopay: /^(confirmed|yes|true|on)$/i.test(autopayRaw), next_due_on: dateOf(pick(due, "due_date")), status: "upcoming",
      notes: redact(`${noteBits.join(" · ")} (via Riana)`), source: "riana" };
    const correction = /correction/i.test(pick(p, "correction_or_new")) || /CORRECTION/.test(u.summary);
    if (correction) {
      const { data: existing } = await supabase.from("bills").select("id").ilike("payee", `%${payee.split(/[\/(]/)[0].trim()}%`).limit(1).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("bills").update(row).eq("id", existing.id);
        if (error) return fail("bill", error);
        return { ok: true, applied: { table: "bills", id: existing.id } };
      }
    }
    const { data, error } = await supabase.from("bills").insert(row).select("id").single();
    if (error) return fail("bill", error);
    return { ok: true, applied: { table: "bills", id: data.id } };
  }

  if (u.kind === "urgent_question") {
    const question = [pick(p, "question") || u.summary, pick(p, "caveat")].filter(Boolean).join(" ");
    const askedRaw = pick(p, "asked_of").toLowerCase(); const asked_of = askedRaw === "rich" || askedRaw === "diana" ? askedRaw : "both";
    const row = { question, asked_of, priority: /high|urgent/i.test(pick(p, "priority")) ? "high" : "normal", status: "open", owner_name: "Riana", source: "riana" };
    const { data, error } = await supabase.from("urgent_questions").insert(row).select("id").single();
    if (error) return fail("question", error);
    return { ok: true, applied: { table: "urgent_questions", id: data.id } };
  }

  if (u.kind === "appointment") {
    const when = pick(p, "starts_at", "datetime", "date"); if (!when) return { ok: false, error: "This appointment has no date." };
    const about = patientOf(p) ?? "both";
    const row = { title: pick(p, "title", "with", "provider") || u.summary.slice(0, 120), kind: "appointment", about, starts_at: /T/.test(when) ? when : `${when}T09:00:00`,
      all_day: !/T/.test(when), location: pick(p, "location", "facility") || null, notes: [pick(p, "notes", "reason"), links(p)[0]].filter(Boolean).join(" · ") || null, source: "riana" };
    const { data, error } = await supabase.from("calendar_events").insert(row).select("id").single();
    if (error) return fail("appointment", error);
    return { ok: true, applied: { table: "calendar_events", id: data.id } };
  }

  return { ok: true, applied: null }; // note and anything unknown: reviewed, kept in the log
}
