import "server-only";
import type { Viewer } from "./session";
import { canRead } from "./session";
import * as data from "./data";
import { NAV, ADMIN_NAV } from "./nav";

/** One search result: where it lives, what it is, and the text that matched. */
export type SearchHit = {
  group: string;    // sidebar label, e.g. "Health · Diana"
  href: string;     // page (and anchor) to open
  title: string;
  detail: string;   // a short line under the title
  matched: string;  // the snippet containing the query
};

type Row = { href: string; group: string; title: string; detail?: string | null; text: (string | null | undefined)[] };

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** The sentence or window of text around the first match, so the user sees why it matched. */
function snippet(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return "";
  const start = Math.max(0, i - 60);
  const end = Math.min(text.length, i + q.length + 90);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

/** Pages the sidebar lists, so a search for "insurance" also offers the page itself. */
function pageHits(v: Viewer, q: string): SearchHit[] {
  return [...NAV, ...(v.role === "super_admin" ? ADMIN_NAV : [])]
    .filter((i) => i.built !== false && (i.section === null || canRead(v, i.section)))
    .filter((i) => i.label.toLowerCase().includes(q) || (i.group ?? "").toLowerCase().includes(q))
    .map((i) => ({ group: "Pages", href: i.href, title: i.label, detail: i.group ? `${i.group} section` : "", matched: "" }));
}

/**
 * Searches every record the viewer may read, across all sections, for a phrase.
 * Plain substring matching, case-insensitive: it runs on the server over the
 * same getters the pages use, so permissions and the demo store apply as usual.
 */
export async function searchBinder(v: Viewer, query: string): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const rows: Row[] = [];
  const add = (r: Row) => rows.push(r);

  const [questions, events, legal, bills, wishes, loans, people, accounts, properties, policies, digital, household, vehicles, journals, collections, safe, albums, income, vaClaims, taxes] =
    await Promise.all([
      data.getQuestions(v), data.getUpcomingEvents(v, 400), data.getLegalDocuments(v), data.getBills(v), data.getFinalWishes(v),
      data.getLoans(v, "all"), data.getPeople(v), data.getAccounts(v), data.getProperties(v), data.getPolicies(v),
      data.getDigitalAccounts(v), data.getHouseholdItems(v), data.getVehicles(v), data.getJournals(v), data.getCollections(v),
      data.getSafeItems(v), data.getSharedAlbums(v), data.getIncomeSources(v), data.getVaClaims(v), data.getTaxRecords(v),
    ]);

  questions.forEach((x) => add({ href: `/questions#${x.id}`, group: "Questions", title: x.question, detail: `${x.status.replace("_", " ")}${x.owner_name ? ` · ${x.owner_name}` : ""}`, text: [x.question, x.answer, x.owner_name] }));
  events.forEach((x) => add({ href: "/calendar", group: "Calendar", title: x.title, detail: `${x.starts_at.slice(0, 10)}${x.location ? ` · ${x.location}` : ""}`, text: [x.title, x.location, x.driver, x.notes] }));
  legal.forEach((x) => add({ href: "/legal", group: "Legal & Estate", title: x.title, detail: x.status.replace("_", " "), text: [x.title, x.doc_type, x.prepared_by, x.original_location, x.open_issue, x.notes] }));
  bills.forEach((x) => add({ href: "/bills", group: "Bills", title: x.payee, detail: `${x.category ?? ""}${x.frequency ? ` · ${x.frequency}` : ""}`, text: [x.payee, x.category, x.notes] }));
  wishes.forEach((x) => add({ href: "/wishes", group: "Final Wishes", title: x.topic, detail: x.person, text: [x.topic, x.wish, x.detail] }));
  loans.forEach((x) => add({ href: "/loans", group: "Loans Ledger", title: x.counterparty, detail: x.status, text: [x.counterparty, x.balance_note, (x as { notes?: string | null }).notes] }));
  people.forEach((x) => add({ href: "/contacts", group: "Contacts & Who to Notify", title: x.full_name, detail: `${x.relationship ?? ""}${x.city ? ` · ${x.city}` : ""}`, text: [x.full_name, x.relationship, x.email, x.phone, x.city, x.region, x.notes] }));
  accounts.forEach((x) => add({ href: "/money", group: "Accounts", title: x.institution, detail: `${x.kind.replace("_", " ")}${x.purpose ? ` · ${x.purpose}` : ""}`, text: [x.institution, x.purpose, x.beneficiary_notes, x.notes] }));
  income.forEach((x) => add({ href: "/statement", group: "Financial Statement", title: x.name, detail: x.kind.replace("_", " "), text: [x.name, x.survivor_note, x.note] }));
  properties.forEach((x) => add({ href: "/properties", group: "Home", title: x.name, detail: x.address ?? "", text: [x.name, x.address, x.held_by, x.succession_plan, x.hoa_name, x.notes] }));
  household.forEach((x) => add({ href: "/properties", group: "Home", title: x.name, detail: x.kind, text: [x.name, x.details] }));
  vehicles.forEach((x) => add({ href: "/vehicles", group: "Vehicles", title: [x.year, x.make, x.model].filter(Boolean).join(" ") + (x.nickname ? ` “${x.nickname}”` : ""), detail: x.title_location ?? "", text: [x.make, x.model, x.nickname, x.engine, x.title_location, x.valuation_source, (x as { notes?: string | null }).notes] }));
  policies.forEach((x) => add({ href: "/insurance", group: "Insurance", title: x.carrier, detail: x.kind.replace("_", " "), text: [x.carrier, x.kind, x.notes] }));
  taxes.forEach((x) => add({ href: "/taxes", group: "Taxes", title: `${x.tax_year} ${x.kind}`, detail: x.status, text: [String(x.tax_year), x.kind, x.preparer, x.status, x.notes] }));
  digital.forEach((x) => add({ href: "/digital", group: "Accounts Directory", title: x.service, detail: `${x.category ?? ""}${x.vault_item ? ` · 1Password: ${x.vault_item}` : ""}`, text: [x.service, x.website, x.category, x.purpose, x.vault_item, x.after_death, x.notes] }));
  safe.forEach((x) => add({ href: "/safe", group: "The Safe", title: x.name, detail: `${x.category} · ${x.safe_name}`, text: [x.name, x.detail, x.safe_name] }));
  journals.forEach((x) => add({ href: "/journals", group: "Journals", title: x.title, detail: x.period ?? "", text: [x.title, x.period, x.note] }));
  const tab = { book: "books", photos: "photos", imemories: "imemories", digital_history: "imemories", love_letter: "love-letters", interview: "interviews", ancestor: "ancestors", other: "photos" } as const;
  const groupOf = { book: "Mom’s Books", photos: "Photos", imemories: "iMemories", digital_history: "iMemories", love_letter: "Love Letters", interview: "Interviews", ancestor: "Ancestors", other: "Photos" } as const;
  collections.forEach((x) => add({ href: `/collections/${tab[x.category]}`, group: groupOf[x.category], title: x.title, detail: x.location ?? x.period ?? "", text: [x.title, x.person, x.location, x.period, x.note] }));
  albums.forEach((x) => add({ href: "/collections/photos", group: "Photos", title: x.title, detail: "Shared album", text: [x.title, x.note] }));
  vaClaims.forEach((x) => add({ href: "/health/rich", group: "Health · Rich", title: x.title, detail: `VA · ${x.status}`, text: [x.title, x.status, x.next_step, x.summary, x.notes] }));

  for (const p of ["diana", "rich"] as const) {
    const group = `Health · ${p === "diana" ? "Diana" : "Rich"}`;
    const href = `/health/${p}`;
    const [providers, meds, conditions, visits, files] = await Promise.all([
      data.getProviders(v, p), data.getMedications(v, p), data.getConditions(v, p), data.getVisitNotes(v, p), data.getHealthFiles(v, p),
    ]);
    providers.forEach((x) => add({ href, group, title: x.name, detail: `${x.specialty ?? "Provider"}${x.practice ? ` · ${x.practice}` : ""}`, text: [x.name, x.specialty, x.practice, x.phone, x.portal_name, x.notes] }));
    meds.forEach((x) => add({ href, group, title: x.name, detail: `Medication${x.dose ? ` · ${x.dose}` : ""}${x.active ? "" : " · stopped"}`, text: [x.name, x.dose, x.schedule, x.purpose, x.prn_for, x.notes] }));
    conditions.forEach((x) => add({ href, group, title: x.name, detail: `${x.kind} · ${x.status}`, text: [x.name, x.detail, x.reaction, x.source_document] }));
    visits.forEach((x) => add({ href: `${href}#timeline`, group, title: `Visit ${x.visit_on}`, detail: "Visit note", text: [x.summary, x.follow_up, x.author_name] }));
    files.forEach((x) => add({ href: `${href}#timeline`, group, title: x.name, detail: `Record${x.taken_at ? ` · ${x.taken_at.slice(0, 10)}` : ""}`, text: [x.name, x.target_note] }));
  }

  const hits: SearchHit[] = pageHits(v, q);
  for (const r of rows) {
    const text = clean(r.text.filter(Boolean).join(" · "));
    if (!text.toLowerCase().includes(q)) continue;
    hits.push({ group: r.group, href: r.href, title: r.title, detail: clean(r.detail ?? ""), matched: snippet(text, q) });
  }
  return hits;
}
