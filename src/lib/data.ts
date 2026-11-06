import "server-only";
import { createClient } from "./supabase/server";
import { canRead, type Viewer } from "./session";
import { SENSITIVE } from "./permissions";
import * as fx from "./demo/fixtures";
import type {
  Account, AuditEntry, Bill, CalendarEvent, ContactGroup, FinalWish, HealthCondition, LabResult, LegalDocument, Loan,
  DigitalAccount, EstatePlanVersion, LoanPayment, MediaItem, Playlist, TributeBlock, TributePage, Vehicle, VehicleImprovement, EstateProvision, HouseholdItem, InsurancePolicy, Medication, PlanConflict, TaxSourceItem, NotificationCampaign, NotificationList, Person, Property, Provider, RianaKey, RianaUpdate, Section, SharedAlbum, TaxRecord, UrgentQuestion, VaClaim, VisitNote,
} from "./types";

// -----------------------------------------------------------------------------
// Demo store: a per-process copy of the FAKE fixtures so demo edits "stick"
// while the server runs. Real mode never touches it.
// -----------------------------------------------------------------------------
type Store = {
  media: MediaItem[]; playlists: Playlist[]; tributes: TributePage[]; tributeBlocks: TributeBlock[];
  vehicles: Vehicle[]; improvements: VehicleImprovement[];
  loanPayments: LoanPayment[];
  planVersions: EstatePlanVersion[]; provisions: EstateProvision[]; conflicts: PlanConflict[];
  taxSources: TaxSourceItem[];
  digital: DigitalAccount[]; household: HouseholdItem[];
  properties: Property[]; policies: InsurancePolicy[]; taxes: TaxRecord[];
  providers: Provider[]; medications: Medication[]; conditions: HealthCondition[]; visits: VisitNote[]; vaClaims: VaClaim[]; accounts: Account[];
  questions: UrgentQuestion[]; events: CalendarEvent[]; legal: LegalDocument[];
  groups: ContactGroup[]; people: Person[]; lists: NotificationList[];
  campaigns: NotificationCampaign[]; bills: Bill[]; labs: LabResult[];
  wishes: FinalWish[]; loans: Loan[]; riana: RianaUpdate[]; audit: AuditEntry[];
  albums: SharedAlbum[];
};
// Bump when Store gains a key, so a dev server that kept the old object rebuilds it.
const STORE_VERSION = 11;
const g = globalThis as unknown as { __greeneDemo?: Store; __greeneDemoV?: number };
export function demoStore(): Store {
  if (g.__greeneDemoV !== STORE_VERSION) { g.__greeneDemo = undefined; g.__greeneDemoV = STORE_VERSION; }
  g.__greeneDemo ??= structuredClone({
    media: [], playlists: fx.playlists, tributes: fx.tributePages, tributeBlocks: fx.tributeBlocks,
    vehicles: fx.vehicles, improvements: fx.vehicleImprovements,
    loanPayments: fx.loanPayments,
    planVersions: fx.estatePlanVersions, provisions: fx.estateProvisions, conflicts: fx.planConflicts,
    taxSources: fx.taxSourceItems,
    digital: fx.digitalAccounts, household: fx.householdItems,
    properties: fx.properties, policies: fx.insurancePolicies, taxes: fx.taxRecords,
    providers: fx.providers, medications: fx.medications, conditions: fx.healthConditions, visits: fx.visitNotes, vaClaims: fx.vaClaims, accounts: fx.accounts,
    questions: fx.urgentQuestions, events: fx.calendarEvents, legal: fx.legalDocuments,
    groups: fx.contactGroups, people: fx.people, lists: fx.notificationLists,
    campaigns: fx.notificationCampaigns, bills: fx.bills, labs: fx.labResults,
    wishes: fx.finalWishes, loans: fx.loans, riana: fx.rianaUpdates, audit: fx.auditEntries,
    albums: fx.sharedAlbums,
  });
  return g.__greeneDemo;
}
const demoVisible = <T extends { section: Section }>(v: Viewer, rows: T[]) => rows.filter((r) => canRead(v, r.section));

function fail(what: string, error: { message: string } | null): never {
  console.error(`[data] ${what}:`, error?.message);
  throw new Error(`Could not load ${what}.`);
}

// -----------------------------------------------------------------------------
// Audit: every page that shows a sensitive section records a "view".
// -----------------------------------------------------------------------------
export async function logView(v: Viewer, section: Section, entity?: string) {
  if (!SENSITIVE.has(section) && section !== "final_wishes") return;
  if (v.demo) {
    const s = demoStore();
    s.audit.unshift({ id: Date.now(), at: new Date().toISOString(), actor_name: v.name, action: "view", section, entity: entity ?? section, via: "app", summary: `Viewed ${section.replace("_", " ")}` });
    s.audit.length = Math.min(s.audit.length, 200);
    return;
  }
  const supabase = await createClient();
  await supabase.rpc("log_view", { p_section: section, p_entity: entity ?? null });
}

// -----------------------------------------------------------------------------
// Reads. In real mode Postgres RLS decides what comes back; the `canRead`
// checks below only skip pointless queries.
// -----------------------------------------------------------------------------
export async function getQuestions(v: Viewer): Promise<UrgentQuestion[]> {
  if (!canRead(v, "urgent_questions")) return [];
  if (v.demo) return [...demoStore().questions].sort((a, b) => a.sort_order - b.sort_order);
  const supabase = await createClient();
  const { data, error } = await supabase.from("urgent_questions").select("*").order("sort_order");
  if (error) fail("urgent questions", error);
  return data as UrgentQuestion[];
}

export async function getUpcomingEvents(v: Viewer, days = 45): Promise<CalendarEvent[]> {
  const from = new Date(); from.setHours(0, 0, 0, 0);
  const to = new Date(from); to.setDate(to.getDate() + days);
  if (v.demo) {
    return demoVisible(v, demoStore().events)
      .filter((e) => new Date(e.starts_at) >= from && new Date(e.starts_at) <= to)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("calendar_events").select("*")
    .gte("starts_at", from.toISOString()).lte("starts_at", to.toISOString()).order("starts_at");
  if (error) fail("calendar", error);
  return data as CalendarEvent[];
}

export async function getLegalDocuments(v: Viewer): Promise<LegalDocument[]> {
  if (!canRead(v, "legal")) return [];
  if (v.demo) return [...demoStore().legal].sort((a, b) => a.sort_order - b.sort_order);
  const supabase = await createClient();
  const { data, error } = await supabase.from("legal_documents").select("*").order("sort_order");
  if (error) fail("legal documents", error);
  return data as LegalDocument[];
}

export async function getBills(v: Viewer): Promise<Bill[]> {
  if (!canRead(v, "bills")) return [];
  if (v.demo) return [...demoStore().bills].sort((a, b) => (a.next_due_on ?? "").localeCompare(b.next_due_on ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.from("bills").select("*").order("next_due_on");
  if (error) fail("bills", error);
  return data as Bill[];
}

export async function getLabSeries(v: Viewer, patient: "rich" | "diana", test: string): Promise<LabResult[]> {
  if (!canRead(v, `health_${patient}`)) return [];
  if (v.demo) return demoStore().labs.filter((l) => l.patient === patient && l.test_name === test).sort((a, b) => a.taken_on.localeCompare(b.taken_on));
  const supabase = await createClient();
  const { data, error } = await supabase.from("lab_results").select("*")
    .eq("patient", patient).eq("test_name", test).order("taken_on");
  if (error) fail("lab results", error);
  return data as LabResult[];
}

export async function getFinalWishes(v: Viewer): Promise<FinalWish[]> {
  if (!canRead(v, "final_wishes")) return [];
  if (v.demo) return demoStore().wishes;
  const supabase = await createClient();
  const { data, error } = await supabase.from("final_wishes").select("*").order("created_at");
  if (error) fail("final wishes", error);
  return data as FinalWish[];
}

export async function getLoans(v: Viewer, direction: "owed_to_estate" | "owed_by_estate" | "all" = "owed_to_estate"): Promise<Loan[]> {
  const section = direction === "owed_by_estate" ? "properties" : "accounts";
  if (direction !== "all" && !canRead(v, section)) return [];
  if (v.demo) return demoStore().loans.filter((l) => (direction === "all" ? canRead(v, l.direction === "owed_by_estate" ? "properties" : "accounts") : l.direction === direction));
  const supabase = await createClient();
  let q = supabase.from("loans").select("*");
  if (direction !== "all") q = q.eq("direction", direction);
  const { data, error } = await q;
  if (error) fail("loans", error);
  return data as Loan[];
}

export async function getRianaPending(v: Viewer): Promise<RianaUpdate[]> {
  if (!canRead(v, "admin")) return [];
  if (v.demo) return demoStore().riana.filter((r) => r.review_status === "pending");
  const supabase = await createClient();
  const { data, error } = await supabase.from("riana_updates").select("id, kind, summary, received_at, review_status, external_ref, payload")
    .eq("review_status", "pending").order("received_at", { ascending: false });
  if (error) fail("Riana updates", error);
  return data as RianaUpdate[];
}

export async function getRianaKeys(v: Viewer): Promise<RianaKey[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return [
    { id: "demo-k-1", label: "Grok assistant (sample)", created_at: new Date().toISOString(), last_used_at: null, use_count: 0, revoked_at: null, read_sections: ["urgent_questions", "calendar", "final_wishes"] },
  ];
  const supabase = await createClient();
  const { data, error } = await supabase.from("riana_inbound_keys")
    .select("id, label, created_at, last_used_at, use_count, revoked_at, read_sections").order("created_at", { ascending: false });
  if (error) fail("Riana keys", error);
  return data as RianaKey[];
}

export async function getAudit(v: Viewer, limit = 100): Promise<AuditEntry[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return demoStore().audit.slice(0, limit);
  const supabase = await createClient();
  const { data, error } = await supabase.from("audit_log_named").select("*").order("at", { ascending: false }).limit(limit);
  if (error) fail("audit log", error);
  return (data ?? []).map((r) => ({
    id: r.id, at: r.at, actor_name: r.actor_name, action: r.action, section: r.section,
    entity: r.entity, via: r.via, summary: `${r.action} ${r.entity ?? ""}`.trim(),
  }));
}

// --- Contacts & notification lists ------------------------------------------
export async function getGroups(v: Viewer): Promise<ContactGroup[]> {
  if (!canRead(v, "contacts")) return [];
  if (v.demo) return demoStore().groups;
  const supabase = await createClient();
  const { data, error } = await supabase.from("contact_groups").select("id, name, kind, description").order("name");
  if (error) fail("contact groups", error);
  return data as ContactGroup[];
}

export async function getPeople(v: Viewer): Promise<Person[]> {
  if (!canRead(v, "contacts")) return [];
  if (v.demo) return [...demoStore().people].sort((a, b) => a.full_name.localeCompare(b.full_name));
  const supabase = await createClient();
  const { data, error } = await supabase.from("people").select("*, person_groups(group_id)").order("full_name");
  if (error) fail("contacts", error);
  return (data ?? []).map(({ person_groups, ...p }) => ({
    ...p, group_ids: (person_groups as { group_id: string }[]).map((x) => x.group_id),
  })) as Person[];
}

export async function getNotificationLists(v: Viewer): Promise<NotificationList[]> {
  if (!canRead(v, "notify")) return [];
  if (v.demo) return demoStore().lists;
  const supabase = await createClient();
  const { data, error } = await supabase.from("notification_lists")
    .select("id, name, purpose, description, members:notification_list_members(person_id, wave)").order("created_at");
  if (error) fail("notification lists", error);
  return data as NotificationList[];
}

export async function getCampaigns(v: Viewer, listId: string): Promise<NotificationCampaign[]> {
  if (!canRead(v, "notify")) return [];
  if (v.demo) return demoStore().campaigns.filter((c) => c.list_id === listId);
  const supabase = await createClient();
  const { data, error } = await supabase.from("notification_campaigns")
    .select(`id, list_id, title, message, status,
      requester:profiles!notification_campaigns_requested_by_fkey(display_name),
      approver:profiles!notification_campaigns_approved_by_fkey(display_name),
      recipients:notification_recipients(person_id, status, contacted_by, note)`)
    .eq("list_id", listId).order("created_at", { ascending: false });
  if (error) fail("notifications", error);
  return (data ?? []).map((c) => {
    const { requester, approver, ...rest } = c as typeof c & {
      requester: { display_name: string } | null; approver: { display_name: string } | null;
    };
    return { ...rest, requested_by_name: requester?.display_name ?? null, approved_by_name: approver?.display_name ?? null };
  }) as NotificationCampaign[];
}

// --- Health ---------------------------------------------------------------------
export type Patient = "rich" | "diana";

async function patientRows<T>(v: Viewer, patient: Patient, table: string, demoRows: T[], order: string, ascending = true): Promise<T[]> {
  if (!canRead(v, `health_${patient}`)) return [];
  if (v.demo) return demoRows;
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).select("*").eq("patient", patient).order(order, { ascending });
  if (error) fail(table.replace("_", " "), error);
  return data as T[];
}

export const getProviders = (v: Viewer, p: Patient) =>
  patientRows<Provider>(v, p, "providers", demoStore().providers.filter((x) => x.patient === p), "name");
export const getMedications = (v: Viewer, p: Patient) =>
  patientRows<Medication>(v, p, "medications", demoStore().medications.filter((x) => x.patient === p).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)), "name");
export const getConditions = (v: Viewer, p: Patient) =>
  patientRows<HealthCondition>(v, p, "health_conditions", demoStore().conditions.filter((x) => x.patient === p), "kind");
export const getVisitNotes = (v: Viewer, p: Patient) =>
  patientRows<VisitNote>(v, p, "visit_notes", [...demoStore().visits.filter((x) => x.patient === p)].sort((a, b) => b.visit_on.localeCompare(a.visit_on)), "visit_on", false);

export async function getAllLabs(v: Viewer, p: Patient): Promise<LabResult[]> {
  return patientRows<LabResult>(v, p, "lab_results", [...demoStore().labs.filter((x) => x.patient === p)].sort((a, b) => a.taken_on.localeCompare(b.taken_on)), "taken_on");
}

export async function getVaClaims(v: Viewer): Promise<VaClaim[]> {
  if (!canRead(v, "health_rich")) return [];
  const key = (c: VaClaim) => c.event_on ?? c.decided_on ?? c.filed_on ?? "";
  if (v.demo) return [...demoStore().vaClaims].sort((a, b) => key(a).localeCompare(key(b)));
  const supabase = await createClient();
  const { data, error } = await supabase.from("va_claim_timeline").select("*").order("timeline_on");
  if (error) fail("VA claims", error);
  return data as VaClaim[];
}

// --- Money ----------------------------------------------------------------------
export async function getAccounts(v: Viewer): Promise<Account[]> {
  if (!canRead(v, "accounts")) return [];
  if (v.demo) return demoStore().accounts;
  const supabase = await createClient();
  const { data, error } = await supabase.from("accounts").select("*").order("institution");
  if (error) fail("accounts", error);
  return data as Account[];
}

// --- Properties, insurance, taxes ---------------------------------------------------
export async function getProperties(v: Viewer): Promise<Property[]> {
  if (!canRead(v, "properties")) return [];
  if (v.demo) return demoStore().properties;
  const supabase = await createClient();
  const { data, error } = await supabase.from("properties").select("*").order("kind").order("name");
  if (error) fail("properties", error);
  return data as Property[];
}

export async function getPolicies(v: Viewer): Promise<InsurancePolicy[]> {
  if (!canRead(v, "insurance")) return [];
  if (v.demo) return demoStore().policies;
  const supabase = await createClient();
  const { data, error } = await supabase.from("insurance_policies").select("*").order("kind");
  if (error) fail("insurance", error);
  return data as InsurancePolicy[];
}

export async function getTaxRecords(v: Viewer): Promise<TaxRecord[]> {
  if (v.role !== "super_admin" || !canRead(v, "admin")) return [];
  if (v.demo) return [...demoStore().taxes].sort((a, b) => b.tax_year - a.tax_year || a.kind.localeCompare(b.kind));
  const supabase = await createClient();
  const { data, error } = await supabase.from("tax_records").select("*").order("tax_year", { ascending: false }).order("kind");
  if (error) fail("tax records", error);
  return data as TaxRecord[];
}

// --- Digital accounts & household --------------------------------------------------
export async function getDigitalAccounts(v: Viewer): Promise<DigitalAccount[]> {
  if (!canRead(v, "digital_accounts")) return [];
  if (v.demo) return [...demoStore().digital].sort((a, b) => a.service.localeCompare(b.service));
  const supabase = await createClient();
  const { data, error } = await supabase.from("digital_accounts").select("*").order("service");
  if (error) fail("digital accounts", error);
  return data as DigitalAccount[];
}

export async function getHouseholdItems(v: Viewer): Promise<HouseholdItem[]> {
  if (!canRead(v, "household")) return [];
  if (v.demo) return demoStore().household;
  const supabase = await createClient();
  const { data, error } = await supabase.from("household_items").select("*").order("kind").order("name");
  if (error) fail("household", error);
  return data as HouseholdItem[];
}

export async function getTaxSourceItems(v: Viewer): Promise<TaxSourceItem[]> {
  if (v.role !== "super_admin" || !canRead(v, "admin")) return [];
  if (v.demo) return demoStore().taxSources;
  const supabase = await createClient();
  const { data, error } = await supabase.from("tax_source_items").select("*").order("tax_year", { ascending: false }).order("label");
  if (error) fail("tax source items", error);
  return data as TaxSourceItem[];
}

// --- Estate plan -----------------------------------------------------------------------
export async function getPlanVersions(v: Viewer): Promise<EstatePlanVersion[]> {
  if (!canRead(v, "legal")) return [];
  if (v.demo) return [...demoStore().planVersions].sort((a, b) => b.version_no - a.version_no);
  const supabase = await createClient();
  const { data, error } = await supabase.from("estate_plan_versions").select("*").order("version_no", { ascending: false });
  if (error) fail("estate plan", error);
  return data as EstatePlanVersion[];
}

export async function getProvisions(v: Viewer, versionId: string): Promise<EstateProvision[]> {
  if (!canRead(v, "legal")) return [];
  if (v.demo) return demoStore().provisions.filter((p) => p.plan_version_id === versionId).sort((a, b) => a.sort_order - b.sort_order);
  const supabase = await createClient();
  const { data, error } = await supabase.from("estate_provisions").select("*").eq("plan_version_id", versionId).order("sort_order");
  if (error) fail("provisions", error);
  return data as EstateProvision[];
}

export async function getPlanConflicts(v: Viewer): Promise<PlanConflict[]> {
  if (!canRead(v, "legal")) return [];
  if (v.demo) return [...demoStore().conflicts].sort((a, b) => a.sort_order - b.sort_order);
  const supabase = await createClient();
  const { data, error } = await supabase.from("plan_conflicts").select("*").order("sort_order");
  if (error) fail("open questions", error);
  return data as PlanConflict[];
}

export async function getLoanPayments(v: Viewer): Promise<LoanPayment[]> {
  if (!canRead(v, "accounts")) return [];
  if (v.demo) return [...demoStore().loanPayments].sort((a, b) => a.paid_on.localeCompare(b.paid_on));
  const supabase = await createClient();
  const { data, error } = await supabase.from("loan_payments").select("*").order("paid_on");
  if (error) fail("loan payments", error);
  return data as LoanPayment[];
}

// --- Vehicles ----------------------------------------------------------------------------
export async function getVehicles(v: Viewer): Promise<Vehicle[]> {
  if (!canRead(v, "properties")) return [];
  if (v.demo) return [...demoStore().vehicles].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicles").select("*").order("year");
  if (error) fail("vehicles", error);
  return data as Vehicle[];
}

export async function getVehicleImprovements(v: Viewer): Promise<VehicleImprovement[]> {
  if (!canRead(v, "properties")) return [];
  if (v.demo) return [...demoStore().improvements].sort((a, b) => (a.done_on ?? a.done_on_approx ?? "").localeCompare(b.done_on ?? b.done_on_approx ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_improvements").select("*").order("done_on");
  if (error) fail("vehicle improvements", error);
  return data as VehicleImprovement[];
}

// --- Media library ------------------------------------------------------------------------
export async function getMediaItems(v: Viewer): Promise<MediaItem[]> {
  if (!canRead(v, "family_history")) return [];
  if (v.demo) return [...demoStore().media].sort((a, b) => (b.taken_on ?? "").localeCompare(a.taken_on ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.from("media_items").select("*").order("taken_on", { ascending: false, nullsFirst: false });
  if (error) fail("media", error);
  return data as MediaItem[];
}

export async function getPlaylists(v: Viewer): Promise<Playlist[]> {
  if (!canRead(v, "family_history")) return [];
  if (v.demo) return demoStore().playlists;
  const supabase = await createClient();
  const { data, error } = await supabase.from("playlists").select("id, slug, title, description, tracks:playlist_tracks(media_item_id, position)").order("title");
  if (error) fail("playlists", error);
  return (data ?? []).map((p) => ({ id: p.id, slug: p.slug, title: p.title, description: p.description, track_ids: [...(p.tracks as { media_item_id: string; position: number }[])].sort((a, b) => a.position - b.position).map((t) => t.media_item_id) }));
}

export async function getTributePages(v: Viewer): Promise<TributePage[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return demoStore().tributes;
  const supabase = await createClient();
  const { data, error } = await supabase.from("tribute_pages").select("*").order("created_at");
  if (error) fail("tribute pages", error);
  return data as TributePage[];
}

export async function getTributeBlocks(v: Viewer, pageId: string): Promise<TributeBlock[]> {
  if (v.role !== "super_admin") return [];
  if (v.demo) return demoStore().tributeBlocks.filter((b) => b.page_id === pageId).sort((a, b) => a.position - b.position);
  const supabase = await createClient();
  const { data, error } = await supabase.from("tribute_blocks").select("*").eq("page_id", pageId).order("position");
  if (error) fail("tribute blocks", error);
  return data as TributeBlock[];
}

export async function getSharedAlbums(v: Viewer): Promise<SharedAlbum[]> {
  if (!canRead(v, "family_history")) return [];
  if (v.demo) return demoStore().albums;
  const supabase = await createClient();
  const { data, error } = await supabase.from("shared_albums").select("*").order("created_at");
  if (error) fail("shared albums", error);
  return data as SharedAlbum[];
}
