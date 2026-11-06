"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, canWrite } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { demoStore } from "@/lib/data";
import type { LegalStatus, QuestionStatus, Section, Subject, Person } from "@/lib/types";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

// Every action re-checks the viewer; in real mode Postgres checks again.
async function need(section: Section): Promise<Awaited<ReturnType<typeof getViewer>>> {
  const v = await getViewer();
  if (!canWrite(v, section)) throw new Error("You don't have permission to change this.");
  return v;
}

const bump = (v: { name: string }, section: Section, summary: string, entity: string) => {
  const s = demoStore();
  s.audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: v.name, action: "update", section, entity, via: "app", summary });
};

// --- Urgent questions ----------------------------------------------------------
const Answer = z.object({
  id: z.string().uuid(),
  answer: z.string().trim().min(1, "Please write an answer.").max(4000),
  status: z.enum(["partly_answered", "answered"]),
});

export async function answerQuestion(_p: Result | null, form: FormData): Promise<Result> {
  const v = await need("urgent_questions");
  const parsed = Answer.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, answer, status } = parsed.data;
  const answered_by: Subject | null = v.role === "parent" ? v.isSubject : null;

  if (v.demo) {
    const q = demoStore().questions.find((x) => x.id === id);
    if (!q) return { ok: false, error: "Question not found." };
    Object.assign(q, { answer, status, answered_by, answered_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    bump(v, "urgent_questions", `Answered: ${q.question.slice(0, 60)}`, "urgent_questions");
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("urgent_questions")
      .update({ answer, status, answered_by, answered_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: "Could not save the answer." };
  }
  revalidatePath("/questions"); revalidatePath("/");
  return { ok: true };
}

const NewQuestion = z.object({
  question: z.string().trim().min(5, "Please write the question.").max(1000),
  asked_of: z.enum(["rich", "diana", "both"]),
  owner_name: z.string().trim().max(80).optional(),
  priority: z.enum(["high", "normal"]),
  topic: z.string().optional(),
});

export async function addQuestion(_p: Result | null, form: FormData): Promise<Result> {
  const v = await need("urgent_questions");
  const parsed = NewQuestion.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const topic = (d.topic || null) as Section | null;

  if (v.demo) {
    const s = demoStore();
    s.questions.push({
      id: crypto.randomUUID(), question: d.question, topic, asked_of: d.asked_of, owner_name: d.owner_name || v.name,
      priority: d.priority, status: "open", answer: null, answered_by: null, answered_at: null, due_on: null,
      sort_order: s.questions.length + 1, source: "app", updated_at: new Date().toISOString(),
    });
    bump(v, "urgent_questions", `Added question: ${d.question.slice(0, 60)}`, "urgent_questions");
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("urgent_questions")
      .insert({ question: d.question, topic, asked_of: d.asked_of, owner_name: d.owner_name || v.name, priority: d.priority });
    if (error) return { ok: false, error: "Could not add the question." };
  }
  revalidatePath("/questions"); revalidatePath("/");
  return { ok: true };
}

const ShareUpdate = z.object({ text: z.string().trim().min(3, "Write a little more.").max(2000), section: z.string().optional() });

/** "Add an update" on the dashboard: queues a note in the Riana inbox for a super admin to review. */
export async function shareUpdate(_p: Result | null, form: FormData): Promise<Result> {
  const v = await getViewer();
  const parsed = ShareUpdate.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { text, section } = parsed.data;
  const summary = text.length > 100 ? `${text.slice(0, 100)}…` : text;
  if (v.demo) {
    demoStore().riana.unshift({ id: crypto.randomUUID(), kind: "note", summary, received_at: new Date().toISOString(), review_status: "pending", payload: { section: section || null, text, from: v.name } });
  } else {
    const supabase = await createClient();
    const { error } = await supabase.rpc("share_update", { p_section: section || "", p_text: text });
    if (error) return { ok: false, error: error.message.includes("share_update") ? "The database is missing the share_update migration." : `Could not send: ${error.message}` };
  }
  revalidatePath("/admin/riana"); revalidatePath("/");
  return { ok: true };
}

export async function setQuestionStatus(id: string, status: QuestionStatus): Promise<Result> {
  const v = await need("urgent_questions");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
  if (v.demo) {
    const q = demoStore().questions.find((x) => x.id === id);
    if (q) { q.status = status; q.updated_at = new Date().toISOString(); }
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("urgent_questions").update({ status }).eq("id", id);
    if (error) return { ok: false, error: "Could not update." };
  }
  revalidatePath("/questions"); revalidatePath("/");
  return { ok: true };
}

// --- Legal documents --------------------------------------------------------
const LegalUpdate = z.object({
  id: z.string().uuid(),
  status: z.enum(["not_started", "drafted", "signed", "recorded", "superseded"]),
  original_location: z.string().trim().max(300).optional(),
  open_issue: z.string().trim().max(1000).optional(),
  signed_on: z.string().optional(),
  recorded_on: z.string().optional(),
});

export async function updateLegalDocument(_p: Result | null, form: FormData): Promise<Result> {
  const v = await need("legal");
  const parsed = LegalUpdate.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...rest } = parsed.data;
  const patch = {
    status: rest.status as LegalStatus,
    original_location: rest.original_location || null,
    open_issue: rest.open_issue || null,
    signed_on: rest.signed_on || null,
    recorded_on: rest.recorded_on || null,
  };
  if (v.demo) {
    const d = demoStore().legal.find((x) => x.id === id);
    if (!d) return { ok: false, error: "Document not found." };
    Object.assign(d, patch, { updated_at: new Date().toISOString() });
    bump(v, "legal", `Updated ${d.title}: ${patch.status}`, "legal_documents");
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("legal_documents").update(patch).eq("id", id);
    if (error) return { ok: false, error: "Could not save." };
  }
  revalidatePath("/legal"); revalidatePath("/");
  return { ok: true };
}

// --- Contacts ----------------------------------------------------------------
export async function confirmPerson(id: string, confirmed: boolean): Promise<Result> {
  const v = await need("contacts");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
  const confirmed_by: Subject | null = v.role === "parent" ? v.isSubject : null;
  if (v.demo) {
    const p = demoStore().people.find((x) => x.id === id);
    if (p) p.confirmed = confirmed;
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("people")
      .update({ confirmed, confirmed_by: confirmed ? confirmed_by : null, confirmed_at: confirmed ? new Date().toISOString() : null }).eq("id", id);
    if (error) return { ok: false, error: "Could not update." };
  }
  revalidatePath("/contacts");
  return { ok: true };
}

export async function setNotifyFirst(id: string, notify_first: boolean): Promise<Result> {
  const v = await need("contacts");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
  if (v.demo) {
    const p = demoStore().people.find((x) => x.id === id);
    if (p) p.notify_first = notify_first;
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("people").update({ notify_first }).eq("id", id);
    if (error) return { ok: false, error: "Could not update." };
  }
  revalidatePath("/contacts");
  return { ok: true };
}

const NewPerson = z.object({
  full_name: z.string().trim().min(2, "Please enter a name.").max(120),
  relationship: z.string().trim().max(80).optional(),
  connected_to: z.enum(["rich", "diana", "both"]),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional(),
  preferred_method: z.enum(["phone", "text", "email", "mail", "in_person"]).optional().or(z.literal("")),
  group_id: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional(),
});

export async function addPerson(_p: Result | null, form: FormData): Promise<Result> {
  const v = await need("contacts");
  const parsed = NewPerson.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const row = {
    full_name: d.full_name, relationship: d.relationship || null, connected_to: d.connected_to,
    phone: d.phone || null, email: d.email || null, city: d.city || null,
    preferred_method: (d.preferred_method || null) as "phone" | "text" | "email" | "mail" | "in_person" | null,
    notes: d.notes || null,
  };
  if (v.demo) {
    demoStore().people.push({
      id: crypto.randomUUID(), ...row, region: null, closeness: null, last_contact_on: null,
      notify_first: false, confirmed: v.role === "parent", group_ids: d.group_id ? [d.group_id] : [],
    });
    bump(v, "contacts", `Added contact ${d.full_name}`, "people");
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.from("people").insert({ ...row, confirmed: v.role === "parent" }).select("id").single();
    if (error) return { ok: false, error: "Could not add the person." };
    if (d.group_id) await supabase.from("person_groups").insert({ person_id: data.id, group_id: d.group_id });
  }
  revalidatePath("/contacts");
  return { ok: true };
}

const EditPerson = NewPerson.omit({ group_id: true }).extend({ id: z.string().uuid(), new_group: z.string().trim().max(60).optional() });

export async function updatePerson(_p: Result | null, form: FormData): Promise<Result> {
  const v = await need("contacts");
  const parsed = EditPerson.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const groupIds = form.getAll("group_ids").map(String).filter((g) => z.string().uuid().safeParse(g).success);
  const row = {
    full_name: d.full_name, relationship: d.relationship || null, connected_to: d.connected_to,
    phone: d.phone || null, email: d.email || null, city: d.city || null,
    preferred_method: (d.preferred_method || null) as "phone" | "text" | "email" | "mail" | "in_person" | null,
    notes: d.notes || null,
  };
  if (v.demo) {
    const p = demoStore().people.find((x) => x.id === d.id);
    if (!p) return { ok: false, error: "Person not found." };
    Object.assign(p, row);
    if (d.new_group) { const g = { id: crypto.randomUUID(), name: d.new_group, kind: "other" as const, description: null }; demoStore().groups.push(g); groupIds.push(g.id); }
    p.group_ids = groupIds;
    bump(v, "contacts", `Updated contact ${d.full_name}`, "people");
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("people").update(row).eq("id", d.id);
    if (error) return { ok: false, error: "Could not save the changes." };
    if (d.new_group) {
      const { data: g, error: ge } = await supabase.from("contact_groups").upsert({ name: d.new_group, kind: "other" }, { onConflict: "name" }).select("id").single();
      if (ge) return { ok: false, error: "Saved, but could not create the tag." };
      groupIds.push(g.id);
    }
    await supabase.from("person_groups").delete().eq("person_id", d.id);
    if (groupIds.length) {
      const { error: pe } = await supabase.from("person_groups").insert(groupIds.map((group_id) => ({ person_id: d.id, group_id })));
      if (pe) return { ok: false, error: "Saved, but could not update the tags." };
    }
  }
  revalidatePath("/contacts");
  return { ok: true };
}

export async function deletePerson(id: string): Promise<Result> {
  const v = await need("contacts");
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Bad id." };
  if (v.demo) {
    const s = demoStore(); const i = s.people.findIndex((p) => p.id === id);
    if (i < 0) return { ok: false, error: "Person not found." };
    const [p] = s.people.splice(i, 1);
    bump(v, "contacts", `Removed contact ${p.full_name}`, "people");
  } else {
    const supabase = await createClient();
    await supabase.from("person_groups").delete().eq("person_id", id);
    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) return { ok: false, error: "Could not remove this person. They may be on a notification list." };
  }
  revalidatePath("/contacts");
  return { ok: true };
}

// --- Notification workflow ------------------------------------------------------
export async function setRecipientStatus(campaignId: string, personId: string, status: "not_sent" | "sent" | "replied" | "attending" | "not_attending"): Promise<Result> {
  const v = await need("notify");
  if (v.demo) {
    const c = demoStore().campaigns.find((x) => x.id === campaignId);
    const r = c?.recipients.find((x) => x.person_id === personId);
    if (r) { r.status = status; r.contacted_by = status === "not_sent" ? null : v.name; }
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("notification_recipients")
      .update({ status, contacted_by: status === "not_sent" ? null : v.name, contacted_at: status === "not_sent" ? null : new Date().toISOString() })
      .eq("campaign_id", campaignId).eq("person_id", personId);
    if (error) return { ok: false, error: "Could not update." };
  }
  revalidatePath("/contacts/notify"); revalidatePath(`/contacts/notify/${campaignId}`);
  return { ok: true };
}

// --- Riana inbox --------------------------------------------------------------------
export async function reviewRianaUpdate(id: string, decision: "approved" | "rejected"): Promise<Result> {
  const v = await getViewer();
  if (v.role !== "super_admin") return { ok: false, error: "Super admins only." };
  if (v.demo) {
    const s = demoStore();
    const r = s.riana.find((x) => x.id === id);
    if (!r || r.review_status !== "pending") return { ok: false, error: "Already reviewed." };
    r.review_status = decision;
    if (decision === "approved") {
      const p = (r.payload ?? {}) as Record<string, string | boolean | undefined>;
      if (r.kind === "contact") {
        const name = String(p.full_name ?? "").trim(); if (!name) return { ok: false, error: "This contact has no name." };
        s.people.push({ id: crypto.randomUUID(), full_name: name, relationship: (p.relationship as string) ?? null, connected_to: ((p.connected_to as "rich" | "diana" | "both") ?? "both"), email: (p.email as string) ?? null, phone: (p.phone as string) ?? null, city: (p.city as string) ?? null, region: (p.region as string) ?? null, closeness: null, last_contact_on: null, preferred_method: (p.preferred_method as Person["preferred_method"]) ?? null, notify_first: Boolean(p.notify_first), confirmed: false, notes: (p.notes as string) ?? null, group_ids: p.is_professional ? [s.groups.find((g) => g.kind === "professional")?.id ?? ""].filter(Boolean) : [] });
      } else if (r.kind === "album") {
        const url = String(p.url ?? ""); if (!/^https:\/\//.test(url)) return { ok: false, error: "The album link must start with https://." };
        if (!s.albums.some((a) => a.url === url)) s.albums.push({ id: crypto.randomUUID(), title: String(p.title ?? "Shared album"), url, provider: "google_photos", note: (p.note as string) ?? null, added_by_name: "Riana", source: "riana", created_at: new Date().toISOString() });
      }
    }
    s.audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: v.name, action: decision === "approved" ? "approve" : "reject", section: "admin", entity: "riana_updates", via: "app", summary: `${decision === "approved" ? "Approved" : "Rejected"} an update from Riana` });
  } else {
    const supabase = await createClient();
    if (decision === "approved") {
      const { error } = await supabase.rpc("riana_apply", { p_update_id: id });
      if (error) return { ok: false, error: error.message.includes("riana_apply") ? "The database is missing migration 16." : `Could not apply: ${error.message}` };
    } else {
      const { error } = await supabase.from("riana_updates")
        .update({ review_status: decision, reviewed_by: v.id, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) return { ok: false, error: "Could not save the decision." };
    }
  }
  revalidatePath("/admin/riana"); revalidatePath("/"); revalidatePath("/contacts"); revalidatePath("/history");
  return { ok: true };
}

/**
 * Super admin pastes the binder's "who to notify" additions, one per line:
 *   Name | relationship | phone | email | rich/diana/both | professional
 * Each line becomes a pending update in the Riana inbox, so additions are reviewed before they reach People.
 * The pasted names stay in the database only, never in the repo.
 */
export async function proposeContacts(_p: Result<{ queued: number }> | null, form: FormData): Promise<Result<{ queued: number }>> {
  const v = await getViewer();
  if (v.role !== "super_admin") return { ok: false, error: "Super admins only." };
  const text = String(form.get("lines") ?? "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 100);
  if (lines.length === 0) return { ok: false, error: "Paste at least one line." };
  const rows = lines.map((line) => {
    const [full_name = "", relationship = "", phone = "", email = "", who = "", prof = ""] = line.split("|").map((x) => x.trim());
    const connected_to = ["rich", "diana", "both"].includes(who.toLowerCase()) ? who.toLowerCase() : "both";
    const is_professional = /^(y|yes|true|professional|pro)$/i.test(prof) || /attorney|cpa|doctor|dr\.|funeral|memorial|agent|manager/i.test(relationship);
    return { full_name, relationship: relationship || null, phone: phone || null, email: email || null, connected_to, is_professional, notify_first: false };
  }).filter((r) => r.full_name.length >= 2);
  if (rows.length === 0) return { ok: false, error: "No line had a name." };
  if (v.demo) {
    const s = demoStore();
    for (const r of rows) s.riana.unshift({ id: crypto.randomUUID(), kind: "contact", summary: `Add to Who to Notify: ${r.full_name}${r.relationship ? ` (${r.relationship})` : ""}`, received_at: new Date().toISOString(), review_status: "pending", payload: r });
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("riana_updates").insert(rows.map((r) => ({ kind: "contact", summary: `Add to Who to Notify: ${r.full_name}${r.relationship ? ` (${r.relationship})` : ""}`, payload: r, source: "app" })));
    if (error) return { ok: false, error: `Could not queue: ${error.message}` };
  }
  revalidatePath("/admin/riana");
  return { ok: true, data: { queued: rows.length } };
}
