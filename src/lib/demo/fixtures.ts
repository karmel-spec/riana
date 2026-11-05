// =============================================================================
// FAKE SAMPLE DATA — every name, number, date and note below is invented.
// Used for (1) demo mode and (2) generating supabase/seed.sql.
// Never put real family records in this file or anywhere in the repo.
// =============================================================================
import type {
  Bill, CalendarEvent, ContactGroup, FinalWish, LabResult, LegalDocument, Loan,
  NotificationCampaign, NotificationList, Person, RianaUpdate, UrgentQuestion,
  AuditEntry,
} from "../types";

/** Deterministic UUIDs so the seed and demo agree: uid("q", 1) */
export function uid(kind: string, n: number): string {
  const prefix: Record<string, string> = {
    q: "a1", e: "a2", l: "a3", g: "a4", p: "a5", nl: "a6", nc: "a7",
    b: "a8", lab: "a9", w: "aa", r: "ab", loan: "ac",
    prov: "ad", med: "ae", cond: "af", vn: "b0", va: "b1", acct: "b2",
    prop: "b3", ins: "b4", tax: "b5",
  };
  const hex = n.toString(16).padStart(12, "0");
  return `000000${prefix[kind] ?? "ff"}-0000-4000-8000-${hex}`;
}

/** Dates relative to today so the sample never goes stale. */
export function day(offset: number, hour?: number, minute = 0): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  const ymd = d.toISOString().slice(0, 10);
  if (hour === undefined) return ymd;
  // Arizona has no daylight saving time: always UTC-7.
  return `${ymd}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-07:00`;
}

const now = () => new Date().toISOString();

export const urgentQuestions: UrgentQuestion[] = [
  { id: uid("q", 1), question: "Where is the original signed healthcare power of attorney kept?", topic: "legal", asked_of: "both", owner_name: "Heather", priority: "high", status: "asked", answer: null, answered_by: null, answered_at: null, due_on: day(4), sort_order: 1, source: "app", updated_at: now() },
  { id: uid("q", 2), question: "Do you still want Karmel and Heather as co-executors in the new will?", topic: "legal", asked_of: "both", owner_name: "Karmel", priority: "high", status: "open", answer: null, answered_by: null, answered_at: null, due_on: day(4), sort_order: 2, source: "app", updated_at: now() },
  { id: uid("q", 3), question: "Which hymns would you like sung at your service?", topic: "final_wishes", asked_of: "diana", owner_name: "Karmel", priority: "normal", status: "partly_answered", answer: "[Sample] One favorite hymn chosen; still thinking about the closing song.", answered_by: "diana", answered_at: day(-6, 15), due_on: null, sort_order: 3, source: "app", updated_at: now() },
  { id: uid("q", 4), question: "Who should be called first if Dad goes to the hospital?", topic: "contacts", asked_of: "rich", owner_name: "Heather", priority: "normal", status: "open", answer: null, answered_by: null, answered_at: null, due_on: null, sort_order: 4, source: "riana", updated_at: now() },
  { id: uid("q", 5), question: "Is the classic car going to anyone in particular?", topic: "household", asked_of: "rich", owner_name: "Karmel", priority: "normal", status: "answered", answer: "[Sample] Yes — written down in the household section.", answered_by: "rich", answered_at: day(-20, 10), due_on: null, sort_order: 5, source: "app", updated_at: now() },
];

export const calendarEvents: CalendarEvent[] = [
  { id: uid("e", 1), section: "health_diana", title: "Cardiology follow-up", kind: "appointment", about: "diana", starts_at: day(7, 10, 30), all_day: false, location: "Sample Heart Clinic", driver: "Karmel", notes: "Bring medication list.", source: "app" },
  { id: uid("e", 2), section: "health_rich", title: "VA C&P exam", kind: "appointment", about: "rich", starts_at: day(13, 13), all_day: false, location: "VA clinic (sample)", driver: "Heather", notes: "Bring claim packet.", source: "riana" },
  { id: uid("e", 3), section: "taxes", title: "Property tax, second half due", kind: "deadline", about: "household", starts_at: day(25, 9), all_day: true, location: null, driver: null, notes: "Tumwater rentals (sample).", source: "app" },
  { id: uid("e", 4), section: "calendar", title: "Family video call", kind: "family", about: "both", starts_at: day(3, 18), all_day: false, location: "Video call", driver: null, notes: null, source: "app" },
  { id: uid("e", 5), section: "insurance", title: "Auto policy renewal", kind: "renewal", about: "both", starts_at: day(40, 9), all_day: true, location: null, driver: null, notes: null, source: "app" },
  { id: uid("e", 6), section: "health_diana", title: "Lab draw (fasting)", kind: "appointment", about: "diana", starts_at: day(19, 8), all_day: false, location: "Sample Lab", driver: "Rich", notes: null, source: "app" },
];

export const legalDocuments: LegalDocument[] = [
  { id: uid("l", 1), doc_type: "will", title: "Last will and testament", principal: "both", status: "drafted", needs_recording: false, prepared_by: "Sample Law Office", drafted_on: "2021-06-01", signed_on: null, recorded_on: null, original_location: null, open_issue: "Draft names one executor; family intends co-executors.", notes: "2021 draft, unsigned.", sort_order: 1, source: "app", updated_at: now() },
  { id: uid("l", 2), doc_type: "trust", title: "Revocable living trust", principal: "both", status: "not_started", needs_recording: false, prepared_by: null, drafted_on: null, signed_on: null, recorded_on: null, original_location: null, open_issue: "Decide with attorney whether a trust is needed.", notes: null, sort_order: 2, source: "app", updated_at: now() },
  { id: uid("l", 3), doc_type: "financial_poa", title: "Durable financial power of attorney", principal: "both", status: "signed", needs_recording: false, prepared_by: "Sample Law Office", drafted_on: "2019-03-01", signed_on: "2019-03-15", recorded_on: null, original_location: "[Sample] Home safe", open_issue: null, notes: null, sort_order: 3, source: "app", updated_at: now() },
  { id: uid("l", 4), doc_type: "healthcare_poa", title: "Healthcare power of attorney", principal: "both", status: "signed", needs_recording: false, prepared_by: "Sample Law Office", drafted_on: "2019-03-01", signed_on: "2019-03-15", recorded_on: null, original_location: null, open_issue: "Location of the signed original is unknown.", notes: null, sort_order: 4, source: "app", updated_at: now() },
  { id: uid("l", 5), doc_type: "directive", title: "Healthcare directive (living will)", principal: "both", status: "signed", needs_recording: false, prepared_by: "Sample Law Office", drafted_on: "2019-03-01", signed_on: "2019-03-15", recorded_on: null, original_location: "[Sample] Home safe", open_issue: null, notes: null, sort_order: 5, source: "app", updated_at: now() },
  { id: uid("l", 6), doc_type: "tod_deed", title: "Transfer-on-death deed · Rental A", principal: "both", status: "drafted", needs_recording: true, prepared_by: "Sample Law Office", drafted_on: "2021-06-01", signed_on: null, recorded_on: null, original_location: null, open_issue: "Must be signed and recorded with the county.", notes: "From the 2021 drafts.", sort_order: 6, source: "app", updated_at: now() },
  { id: uid("l", 7), doc_type: "tod_deed", title: "Transfer-on-death deed · Rentals B & C", principal: "both", status: "drafted", needs_recording: true, prepared_by: "Sample Law Office", drafted_on: "2021-06-01", signed_on: null, recorded_on: null, original_location: null, open_issue: "Must be signed and recorded with the county.", notes: "From the 2021 drafts.", sort_order: 7, source: "app", updated_at: now() },
  { id: uid("l", 8), doc_type: "operating_agreement", title: "Rental properties 50/50 ownership plan", principal: "both", status: "not_started", needs_recording: false, prepared_by: null, drafted_on: null, signed_on: null, recorded_on: null, original_location: null, open_issue: "Plan: two children 50/50, kept outside the will's six-way split.", notes: null, sort_order: 8, source: "app", updated_at: now() },
  { id: uid("l", 9), doc_type: "promissory_note", title: "Promissory note · Loan A", principal: "both", status: "signed", needs_recording: false, prepared_by: null, drafted_on: null, signed_on: "2024-01-10", recorded_on: null, original_location: "[Sample] Filing cabinet", open_issue: null, notes: null, sort_order: 9, source: "app", updated_at: now() },
  { id: uid("l", 10), doc_type: "promissory_note", title: "Promissory note · Loan B", principal: "both", status: "drafted", needs_recording: false, prepared_by: null, drafted_on: null, signed_on: null, recorded_on: null, original_location: null, open_issue: "Proposed, not yet signed.", notes: null, sort_order: 10, source: "app", updated_at: now() },
];

export const contactGroups: ContactGroup[] = [
  { id: uid("g", 1), name: "Immediate family", kind: "family", description: "Children, spouses and grandchildren" },
  { id: uid("g", 2), name: "Rich's friends", kind: "friends", description: null },
  { id: uid("g", 3), name: "Diana's friends", kind: "friends", description: null },
  { id: uid("g", 4), name: "Ward & stake", kind: "church", description: "Bishopric, Relief Society, elders quorum" },
  { id: uid("g", 5), name: "Car club", kind: "club", description: "Club members and newsletter contacts" },
  { id: uid("g", 6), name: "Ladies' group", kind: "club", description: null },
  { id: uid("g", 7), name: "Lake Havasu neighbors", kind: "neighbors", description: null },
  { id: uid("g", 8), name: "Tumwater / Olympia neighbors", kind: "neighbors", description: null },
  { id: uid("g", 9), name: "Military & veterans", kind: "military", description: null },
  { id: uid("g", 10), name: "Professionals", kind: "professional", description: "Doctors, attorney, CPA, agents, property manager" },
];

const P = (n: number, p: Omit<Person, "id">): Person => ({ id: uid("p", n), ...p });
export const people: Person[] = [
  P(1, { full_name: "Sample Son One", relationship: "Son", connected_to: "both", email: "son1@example.com", phone: "(555) 010-0101", city: "Sample City", region: "WA", closeness: 1, last_contact_on: day(-2), preferred_method: "phone", notify_first: true, confirmed: true, notes: null, group_ids: [uid("g", 1)] }),
  P(2, { full_name: "Sample Daughter Two", relationship: "Daughter", connected_to: "both", email: "dau2@example.com", phone: "(555) 010-0102", city: "Sample City", region: "UT", closeness: 1, last_contact_on: day(-5), preferred_method: "text", notify_first: true, confirmed: true, notes: null, group_ids: [uid("g", 1)] }),
  P(3, { full_name: "Ken Example", relationship: "Close friend", connected_to: "rich", email: null, phone: "(555) 010-0201", city: "Lake Havasu City", region: "AZ", closeness: 2, last_contact_on: day(-14), preferred_method: "phone", notify_first: true, confirmed: true, notes: "Coffee every Tuesday.", group_ids: [uid("g", 2), uid("g", 5)] }),
  P(4, { full_name: "Pat Placeholder", relationship: "Car club president", connected_to: "rich", email: "pat@example.com", phone: null, city: "Lake Havasu City", region: "AZ", closeness: 3, last_contact_on: day(-40), preferred_method: "email", notify_first: false, confirmed: false, notes: "Can announce in the club newsletter.", group_ids: [uid("g", 5)] }),
  P(5, { full_name: "Joan Sampleton", relationship: "Dear friend", connected_to: "diana", email: "joan@example.com", phone: "(555) 010-0301", city: "Olympia", region: "WA", closeness: 2, last_contact_on: day(-9), preferred_method: "phone", notify_first: true, confirmed: true, notes: null, group_ids: [uid("g", 3), uid("g", 8)] }),
  P(6, { full_name: "Ruth Example", relationship: "Ladies' group friend", connected_to: "diana", email: null, phone: "(555) 010-0302", city: "Lake Havasu City", region: "AZ", closeness: 3, last_contact_on: day(-30), preferred_method: "phone", notify_first: false, confirmed: false, notes: null, group_ids: [uid("g", 6)] }),
  P(7, { full_name: "Bishop Sample", relationship: "Bishop", connected_to: "both", email: "bishop@example.com", phone: "(555) 010-0401", city: "Lake Havasu City", region: "AZ", closeness: 3, last_contact_on: day(-21), preferred_method: "phone", notify_first: true, confirmed: true, notes: "Coordinates the service and the luncheon.", group_ids: [uid("g", 4)] }),
  P(8, { full_name: "Relief Society President (sample)", relationship: "Relief Society", connected_to: "diana", email: null, phone: "(555) 010-0402", city: "Lake Havasu City", region: "AZ", closeness: 3, last_contact_on: null, preferred_method: "text", notify_first: false, confirmed: false, notes: null, group_ids: [uid("g", 4)] }),
  P(9, { full_name: "Elders Quorum President (sample)", relationship: "Elders quorum", connected_to: "rich", email: null, phone: "(555) 010-0403", city: "Lake Havasu City", region: "AZ", closeness: 3, last_contact_on: null, preferred_method: "text", notify_first: false, confirmed: false, notes: null, group_ids: [uid("g", 4)] }),
  P(10, { full_name: "Next-Door Neighbor (sample)", relationship: "Neighbor", connected_to: "both", email: null, phone: "(555) 010-0501", city: "Lake Havasu City", region: "AZ", closeness: 2, last_contact_on: day(-3), preferred_method: "in_person", notify_first: true, confirmed: true, notes: "Has a spare key.", group_ids: [uid("g", 7)] }),
  P(11, { full_name: "Former Neighbor (sample)", relationship: "Old neighbor", connected_to: "both", email: "neighbor@example.com", phone: null, city: "Tumwater", region: "WA", closeness: 4, last_contact_on: day(-200), preferred_method: "mail", notify_first: false, confirmed: false, notes: "Christmas cards.", group_ids: [uid("g", 8)] }),
  P(12, { full_name: "Army Buddy (sample)", relationship: "Served together", connected_to: "rich", email: null, phone: "(555) 010-0601", city: "Sample Town", region: "TX", closeness: 3, last_contact_on: day(-90), preferred_method: "phone", notify_first: false, confirmed: true, notes: null, group_ids: [uid("g", 9), uid("g", 2)] }),
  P(13, { full_name: "Veterans Post Contact (sample)", relationship: "Veterans post", connected_to: "rich", email: "post@example.com", phone: null, city: "Lake Havasu City", region: "AZ", closeness: 4, last_contact_on: null, preferred_method: "email", notify_first: false, confirmed: false, notes: "Can help arrange military honors.", group_ids: [uid("g", 9)] }),
  P(14, { full_name: "Estate Attorney (sample)", relationship: "Attorney", connected_to: "both", email: "attorney@example.com", phone: "(555) 010-0701", city: "Olympia", region: "WA", closeness: 5, last_contact_on: day(-12), preferred_method: "email", notify_first: false, confirmed: true, notes: null, group_ids: [uid("g", 10)] }),
  P(15, { full_name: "Property Manager (sample)", relationship: "Property manager", connected_to: "both", email: "pm@example.com", phone: "(555) 010-0702", city: "Tumwater", region: "WA", closeness: 5, last_contact_on: day(-8), preferred_method: "email", notify_first: false, confirmed: true, notes: null, group_ids: [uid("g", 10)] }),
  P(16, { full_name: "Family Doctor (sample)", relationship: "Primary care", connected_to: "diana", email: null, phone: "(555) 010-0703", city: "Lake Havasu City", region: "AZ", closeness: 5, last_contact_on: day(-35), preferred_method: "phone", notify_first: false, confirmed: true, notes: null, group_ids: [uid("g", 10)] }),
];

export const notificationLists: NotificationList[] = [
  {
    id: uid("nl", 1), name: "Hospital stay — tell right away", purpose: "hospitalization",
    description: "Immediate family and the closest friends. Phone first.",
    members: [
      { person_id: uid("p", 1), wave: 1 }, { person_id: uid("p", 2), wave: 1 },
      { person_id: uid("p", 3), wave: 2 }, { person_id: uid("p", 5), wave: 2 },
      { person_id: uid("p", 7), wave: 2 }, { person_id: uid("p", 10), wave: 2 },
    ],
  },
  {
    id: uid("nl", 2), name: "Funeral & memorial service", purpose: "funeral",
    description: "Everyone who should receive the obituary and service details.",
    members: people.filter((p) => !p.group_ids.includes(uid("g", 10))).map((p) => ({
      person_id: p.id, wave: (p.notify_first ? 1 : p.closeness && p.closeness <= 3 ? 2 : 3) as 1 | 2 | 3,
    })),
  },
  {
    id: uid("nl", 3), name: "Good news & family updates", purpose: "news",
    description: "Birthdays, milestones and happy news.",
    members: [uid("p", 3), uid("p", 5), uid("p", 6), uid("p", 11), uid("p", 12)].map((id) => ({ person_id: id, wave: 2 as const })),
  },
];

export const notificationCampaigns: NotificationCampaign[] = [
  {
    id: uid("nc", 1), list_id: uid("nl", 1), title: "[Practice] Dad's knee surgery update",
    message: "[Sample] Dad's surgery went well and he is resting. Visitors are welcome after Thursday.",
    status: "sent", requested_by_name: "Heather", approved_by_name: "Karmel",
    recipients: [
      { person_id: uid("p", 1), status: "replied", contacted_by: "Heather", note: "Will call Dad tonight." },
      { person_id: uid("p", 2), status: "replied", contacted_by: "Heather", note: null },
      { person_id: uid("p", 3), status: "sent", contacted_by: "Karmel", note: null },
      { person_id: uid("p", 5), status: "not_sent", contacted_by: null, note: null },
      { person_id: uid("p", 7), status: "attending", contacted_by: "Karmel", note: "Bringing dinner Friday." },
      { person_id: uid("p", 10), status: "sent", contacted_by: "Karmel", note: null },
    ],
  },
];

export const bills: Bill[] = [
  { id: uid("b", 1), payee: "Sample Electric Co.", category: "Utilities", amount: 142.18, frequency: "monthly", next_due_on: day(-2), autopay: true, status: "failed", notes: "Card on file expired (sample).", source: "riana" },
  { id: uid("b", 2), payee: "Mortgage · Rental A", category: "Mortgage", amount: 1210.0, frequency: "monthly", next_due_on: day(-4), autopay: true, status: "paid", property_id: uid("prop", 2), notes: null, source: "app" },
  { id: uid("b", 3), payee: "HOA · Rental A", category: "HOA", amount: 95.0, frequency: "monthly", next_due_on: day(10), autopay: false, status: "upcoming", property_id: uid("prop", 2), notes: null, source: "app" },
  { id: uid("b", 4), payee: "Water & sewer (sample)", category: "Utilities", amount: 68.4, frequency: "monthly", next_due_on: day(12), autopay: true, status: "upcoming", notes: null, source: "app" },
  { id: uid("b", 5), payee: "Medicare supplement (sample)", category: "Insurance", amount: 231.0, frequency: "monthly", next_due_on: day(14), autopay: true, status: "upcoming", notes: null, source: "app" },
  { id: uid("b", 6), payee: "Property tax · WA (sample)", category: "Taxes", amount: 1850.0, frequency: "semiannual", next_due_on: day(25), autopay: false, status: "upcoming", property_id: uid("prop", 3), notes: null, source: "app" },
  { id: uid("b", 7), payee: "Phone & internet (sample)", category: "Utilities", amount: 119.99, frequency: "monthly", next_due_on: day(18), autopay: true, status: "upcoming", notes: null, source: "app" },
];

const lab = (n: number, monthsAgo: number, value: number, source: "app" | "riana" = "app"): LabResult => {
  const d = new Date(); d.setMonth(d.getMonth() - monthsAgo);
  return { id: uid("lab", n), patient: "diana", test_name: "A1C", value, unit: "%", ref_low: 4.0, ref_high: 5.6, flag: value > 5.6 ? "high" : value < 4 ? "low" : "normal", taken_on: d.toISOString().slice(0, 10), source };
};
export const labResults: LabResult[] = [
  lab(1, 30, 5.2), lab(2, 24, 5.3), lab(3, 18, 5.4), lab(4, 12, 5.5), lab(5, 6, 5.6), lab(6, 0, 6.1, "riana"),
];

export const finalWishes: FinalWish[] = [
  { id: uid("w", 1), person: "both", topic: "burial_place", wish: "[Sample] Family plot in Washington, beside other family members.", confirmed: false },
  { id: uid("w", 2), person: "both", topic: "service", wish: "[Sample] A simple LDS chapel service followed by a family luncheon.", confirmed: true },
  { id: uid("w", 3), person: "diana", topic: "music", wish: "[Sample] A favorite hymn sung by the grandchildren.", confirmed: false },
  { id: uid("w", 4), person: "rich", topic: "military_honors", wish: "[Sample] Military honors at the graveside, if possible.", confirmed: true },
  { id: uid("w", 5), person: "both", topic: "obituary", wish: "[Sample] Keep it short; include the grandchildren's names.", confirmed: false },
];

export const loans: Loan[] = [
  { id: uid("loan", 1), direction: "owed_to_estate", counterparty: "Loan A (sample child)", principal: 50000, rate_pct: 5, status: "active", note_signed: true },
  { id: uid("loan", 2), direction: "owed_to_estate", counterparty: "Loan B (sample child)", principal: 50000, rate_pct: 5, status: "proposed", note_signed: false },
  { id: uid("loan", 3), direction: "owed_by_estate", counterparty: "Sample Mortgage Co.", property_id: uid("prop", 2), principal: 185000, rate_pct: 3.25, status: "active", note_signed: true, balance_note: "[Sample] About $120k remaining, 30-year fixed from 2018." },
  { id: uid("loan", 4), direction: "owed_by_estate", counterparty: "Sample Mortgage Co.", property_id: uid("prop", 3), principal: 210000, rate_pct: 3.5, status: "active", note_signed: true, balance_note: "[Sample] About $150k remaining." },
];

export const rianaUpdates: RianaUpdate[] = [
  { id: uid("r", 1), kind: "lab_result", summary: "New A1C result for Diana: 6.1 %", received_at: day(0, 7, 42), review_status: "pending" },
  { id: uid("r", 2), kind: "bill", summary: "Payment failed: Sample Electric Co., $142.18", received_at: day(-1, 9, 5), review_status: "pending" },
];

export const auditEntries: AuditEntry[] = [
  { id: 6, at: day(0, 7, 42), actor_name: "Riana", action: "create", section: "admin", entity: "riana_updates", via: "riana", summary: "Sent a lab result for review" },
  { id: 5, at: day(-1, 16, 10), actor_name: "Heather", action: "update", section: "health_rich", entity: "medications", via: "app", summary: "Changed a medication dose" },
  { id: 4, at: day(-2, 21, 2), actor_name: "David", action: "view", section: "final_wishes", entity: "final_wishes", via: "app", summary: "Viewed final wishes" },
  { id: 3, at: day(-3, 14, 35), actor_name: "Karmel", action: "update", section: "contacts", entity: "people", via: "app", summary: "Confirmed 6 contacts" },
  { id: 2, at: day(-3, 9, 12), actor_name: "Karmel", action: "download", section: "legal", entity: "documents", via: "app", summary: "Downloaded 2021 will draft" },
  { id: 1, at: day(-4, 11, 0), actor_name: "Heather", action: "permission_change", section: "legal", entity: "user_section_access", via: "app", summary: "Gave the estate attorney access to Legal until Jan 31" },
];

// --- Health (FAKE) -------------------------------------------------------------
import type { Account, HealthCondition, Medication, Provider, VaClaim, VisitNote } from "../types";

export const providers: Provider[] = [
  { id: uid("prov", 1), patient: "diana", name: "Dr. Sample Primary", specialty: "Primary care", practice: "Sample Family Medicine", phone: "(555) 010-0703", portal_name: "MyChart (sample)", is_va: false, notes: null },
  { id: uid("prov", 2), patient: "diana", name: "Dr. Example Heart", specialty: "Cardiology", practice: "Sample Heart Clinic", phone: "(555) 010-0801", portal_name: null, is_va: false, notes: "Follow-up every 6 months." },
  { id: uid("prov", 3), patient: "rich", name: "VA Primary Care Team (sample)", specialty: "Primary care", practice: "VA clinic", phone: "(555) 010-0901", portal_name: "My HealtheVet (sample)", is_va: true, notes: null },
  { id: uid("prov", 4), patient: "rich", name: "Dr. Placeholder Ortho", specialty: "Orthopedics", practice: "Sample Orthopedic Group", phone: "(555) 010-0902", portal_name: null, is_va: false, notes: "Knee." },
];

export const medications: Medication[] = [
  { id: uid("med", 1), patient: "diana", name: "Metformin (sample)", dose: "500 mg", schedule: "Twice daily with meals", purpose: "Blood sugar", prescriber_id: uid("prov", 1), started_on: "2024-02-01", stopped_on: null, active: true, notes: null, source: "app" },
  { id: uid("med", 2), patient: "diana", name: "Lisinopril (sample)", dose: "10 mg", schedule: "Every morning", purpose: "Blood pressure", prescriber_id: uid("prov", 2), started_on: "2022-06-15", stopped_on: null, active: true, notes: null, source: "app" },
  { id: uid("med", 3), patient: "diana", name: "Vitamin D (sample)", dose: "2000 IU", schedule: "Daily", purpose: "Supplement", prescriber_id: null, started_on: null, stopped_on: null, active: true, notes: "Over the counter.", source: "app" },
  { id: uid("med", 4), patient: "rich", name: "Atorvastatin (sample)", dose: "20 mg", schedule: "Every evening", purpose: "Cholesterol", prescriber_id: uid("prov", 3), started_on: "2021-09-01", stopped_on: null, active: true, notes: null, source: "app" },
  { id: uid("med", 5), patient: "rich", name: "Meloxicam (sample)", dose: "7.5 mg", schedule: "Daily as needed", purpose: "Knee pain", prescriber_id: uid("prov", 4), started_on: "2025-03-10", stopped_on: null, active: true, notes: "Dose lowered Nov 2026.", source: "app" },
  { id: uid("med", 6), patient: "rich", name: "Old blood pressure pill (sample)", dose: "5 mg", schedule: "Daily", purpose: "Blood pressure", prescriber_id: uid("prov", 3), started_on: "2019-01-01", stopped_on: "2023-04-01", active: false, notes: "Replaced.", source: "app" },
];

export const healthConditions: HealthCondition[] = [
  { id: uid("cond", 1), patient: "diana", kind: "condition", name: "Type 2 diabetes (sample)", detail: "Managed with medication and diet.", since: "2024-01-01" },
  { id: uid("cond", 2), patient: "diana", kind: "condition", name: "High blood pressure (sample)", detail: null, since: "2022-01-01" },
  { id: uid("cond", 3), patient: "diana", kind: "allergy", name: "Penicillin (sample)", detail: "Rash.", since: null },
  { id: uid("cond", 4), patient: "diana", kind: "coverage", name: "Medicare Part A & B + supplement (sample)", detail: "Cards in the blue folder.", since: null },
  { id: uid("cond", 5), patient: "rich", kind: "condition", name: "Knee osteoarthritis (sample)", detail: "Service-connected.", since: "2015-01-01" },
  { id: uid("cond", 6), patient: "rich", kind: "allergy", name: "No known allergies", detail: null, since: null },
  { id: uid("cond", 7), patient: "rich", kind: "coverage", name: "VA health care + Medicare (sample)", detail: "VA is primary for service-connected care.", since: null },
];

export const visitNotes: VisitNote[] = [
  { id: uid("vn", 1), patient: "diana", visit_on: day(-35), provider_id: uid("prov", 1), summary: "[Sample] Routine check. Blood pressure good. Ordered A1C.", follow_up: "Repeat labs in 3 months.", author_name: "Karmel", source: "app", created_at: day(-35, 15) },
  { id: uid("vn", 2), patient: "diana", visit_on: day(-180), provider_id: uid("prov", 2), summary: "[Sample] Echo normal. Keep current medication.", follow_up: "See again in 6 months.", author_name: "Heather", source: "app", created_at: day(-180, 15) },
  { id: uid("vn", 3), patient: "rich", visit_on: day(-20), provider_id: uid("prov", 4), summary: "[Sample] Knee still sore after walking. Discussed injection option.", follow_up: "Decide on injection at next visit.", author_name: "Heather", source: "app", created_at: day(-20, 15) },
  { id: uid("vn", 4), patient: "rich", visit_on: day(-60), provider_id: uid("prov", 3), summary: "[Sample] Annual VA visit. Labs fine. Updated claim paperwork.", follow_up: null, author_name: "Riana", source: "riana", created_at: day(-60, 15) },
];

export const vaClaims: VaClaim[] = [
  { id: uid("va", 1), kind: "rating_decision", title: "Current combined rating", status: "70% (sample)", filed_on: null, decided_on: "2023-05-01", rating_pct: 70, next_step: null, notes: "Letter in the VA folder.", source: "app" },
  { id: uid("va", 2), kind: "claim", title: "Increase for knee condition (sample)", status: "Under review", filed_on: day(-90), decided_on: null, rating_pct: null, next_step: "C&P exam scheduled.", notes: null, source: "app" },
  { id: uid("va", 3), kind: "cp_exam", title: "C&P exam — knee", status: "Scheduled", filed_on: null, decided_on: null, rating_pct: null, next_step: `Attend exam on ${new Date(`${day(13)}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Bring claim packet.`, notes: null, source: "riana" },
];

export const accounts: Account[] = [
  { id: uid("acct", 1), institution: "Sample Credit Union", kind: "checking", purpose: "Everyday bills and autopay", last4: "1234", held_by: "both", beneficiary_notes: "[Sample] POD to the children equally.", notes: null, source: "app" },
  { id: uid("acct", 2), institution: "Sample Credit Union", kind: "savings", purpose: "Emergency fund", last4: "5678", held_by: "both", beneficiary_notes: null, notes: null, source: "app" },
  { id: uid("acct", 3), institution: "Sample Brokerage", kind: "retirement", purpose: "Rich's IRA", last4: "9012", held_by: "rich", beneficiary_notes: "[Sample] Diana primary; children contingent.", notes: null, source: "app" },
  { id: uid("acct", 4), institution: "Sample Bank", kind: "checking", purpose: "Rental income and expenses (StarLar)", last4: "3456", held_by: "both", beneficiary_notes: null, notes: "Property manager deposits here.", source: "app" },
  { id: uid("acct", 5), institution: "Sample Card Co.", kind: "credit_card", purpose: "Travel and groceries", last4: "7890", held_by: "diana", beneficiary_notes: null, notes: "Autopay from checking 1234.", source: "app" },
];

// --- Properties, insurance, taxes (FAKE) --------------------------------------
import type { InsurancePolicy, Property, TaxRecord } from "../types";

export const properties: Property[] = [
  { id: uid("prop", 1), name: "Home · Lake Havasu City", kind: "residence", address: "[Sample] 123 Example Dr, Lake Havasu City, AZ", held_by: "Rich & Diana", succession_plan: "[Sample] Passes under the will (six-way split).", manager_person_id: null, hoa_name: null, notes: "Paid off. Disabled-veteran property tax exemption applied.", source: "app" },
  { id: uid("prop", 2), name: "Rental A · Tumwater", kind: "rental", address: "[Sample] 100 Example Cir SW, Tumwater, WA", held_by: "StarLar (Rich & Diana)", succession_plan: "[Sample] 50/50 to two children via TOD deed, outside the will.", manager_person_id: uid("p", 15), hoa_name: "Sample HOA", notes: "Duplex. Both units rented.", source: "app" },
  { id: uid("prop", 3), name: "Rental B · Tumwater", kind: "rental", address: "[Sample] 200 Example St SE, Tumwater, WA", held_by: "StarLar (Rich & Diana)", succession_plan: "[Sample] 50/50 to two children via TOD deed, outside the will.", manager_person_id: uid("p", 15), hoa_name: null, notes: "Easement amendment drafted 2021, unsigned.", source: "import" },
];

export const insurancePolicies: InsurancePolicy[] = [
  { id: uid("ins", 1), kind: "auto", carrier: "Sample Mutual", insured: "both", policy_last4: "4411", premium: 1180, renews_on: day(40), agent_person_id: null, notes: "Two vehicles.", source: "app" },
  { id: uid("ins", 2), kind: "classic_car", carrier: "Sample Classic Insurers", insured: "rich", policy_last4: "7720", premium: 420, renews_on: day(140), agent_person_id: null, notes: "Agreed value. Limited miles.", source: "app" },
  { id: uid("ins", 3), kind: "home", carrier: "Sample Mutual", insured: "both", policy_last4: "3305", premium: 1650, renews_on: day(200), agent_person_id: null, notes: null, source: "app" },
  { id: uid("ins", 4), kind: "landlord", carrier: "Sample Mutual", insured: "both", policy_last4: "9981", premium: 2100, renews_on: day(200), agent_person_id: null, notes: "Covers both Tumwater rentals.", source: "app" },
  { id: uid("ins", 5), kind: "umbrella", carrier: "Sample Mutual", insured: "both", policy_last4: "1002", premium: 390, renews_on: day(200), agent_person_id: null, notes: "$1M.", source: "app" },
  { id: uid("ins", 6), kind: "medicare", carrier: "Medicare", insured: "both", policy_last4: null, premium: null, renews_on: null, agent_person_id: null, notes: "Parts A & B. Cards in the blue folder.", source: "app" },
  { id: uid("ins", 7), kind: "supplemental", carrier: "Sample Health Plan (Medicare Advantage)", insured: "diana", policy_last4: "5566", premium: 231, renews_on: day(55), agent_person_id: null, notes: "Open enrollment each fall.", source: "app" },
  { id: uid("ins", 8), kind: "champva", carrier: "CHAMPVA", insured: "diana", policy_last4: null, premium: null, renews_on: null, agent_person_id: null, notes: "Secondary to Medicare.", source: "app" },
  { id: uid("ins", 9), kind: "life", carrier: "Sample Life Co.", insured: "rich", policy_last4: "2290", premium: 95, renews_on: null, agent_person_id: null, notes: "[Sample] Term policy; beneficiary Diana. Check the end date.", source: "app" },
];

export const taxRecords: TaxRecord[] = [
  { id: uid("tax", 1), tax_year: 2025, kind: "federal", preparer: "Sample CPA, PLLC", status: "Filed", filed_on: "2026-03-20", notes: null, source: "app" },
  { id: uid("tax", 2), tax_year: 2025, kind: "state", preparer: "Sample CPA, PLLC", status: "Not required (AZ resident, WA rental income reported federally)", filed_on: null, notes: null, source: "app" },
  { id: uid("tax", 3), tax_year: 2025, kind: "property", preparer: null, status: "Second half due", filed_on: null, notes: "Tumwater rentals. Due dates on the calendar.", source: "app" },
  { id: uid("tax", 4), tax_year: 2026, kind: "exemption", preparer: null, status: "Active", filed_on: null, notes: "Disabled-veteran exemption on the Lake Havasu home. Renew with the county assessor if asked.", source: "app" },
  { id: uid("tax", 5), tax_year: 2024, kind: "federal", preparer: "Sample CPA, PLLC", status: "Filed", filed_on: "2025-04-02", notes: null, source: "app" },
  { id: uid("tax", 6), tax_year: 2026, kind: "federal", preparer: "Sample CPA, PLLC", status: "Not started", filed_on: null, notes: "Gather 1099s in January.", source: "app" },
];
