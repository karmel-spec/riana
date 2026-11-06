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
    lp: "bc", veh: "bd", vi: "be", prop: "b3", ins: "b4", tax: "b5", dig: "b6", hh: "b7", tsi: "b8", epv: "b9", epr: "ba", pc: "bb",
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
  { id: uid("loan", 1), direction: "owed_to_estate", counterparty: "Ryan & Tracy (sample)", principal: 50000, rate_pct: null, status: "active", note_signed: true, started_on: "2023-06-01", purpose: "[Sample] Home purchase help", legal_document_id: uid("l", 9), advance_on_inheritance: "undecided", gift_or_loan: "loan", balance_note: "Note signed 2023. No interest stated on the note." },
  { id: uid("loan", 2), direction: "owed_to_estate", counterparty: "David (sample)", principal: 50000, rate_pct: 5, status: "proposed", note_signed: false, purpose: "For a casita", legal_document_id: uid("l", 10), advance_on_inheritance: "undecided", gift_or_loan: "loan", balance_note: "Proposed at 5%. Note drafted, not signed." },
  { id: uid("loan", 7), direction: "owed_to_estate", counterparty: "StarLar", principal: 20000, rate_pct: null, status: "unclassified", note_signed: false, started_on: "2025-02-01", purpose: "[Sample] Roof on Rental A", gift_or_loan: "undecided", advance_on_inheritance: "no", balance_note: "Gift or loan: to be decided. If a loan, StarLar repays it from rents." },
  { id: uid("loan", 5), direction: "owed_to_estate", counterparty: "StarLar · Note 1", principal: 250000, rate_pct: 4.75, status: "active", note_signed: true, term_months: 240, monthly_payment: 1655, first_payment_on: "2021-04-01", legal_document_id: uid("l", 9), gift_or_loan: "loan", balance_note: "Rents pay this note to Rich & Diana. Unpaid balance at death splits equally among the six children." },
  { id: uid("loan", 6), direction: "owed_to_estate", counterparty: "StarLar · Note 2", principal: 300000, rate_pct: 6.25, status: "active", note_signed: true, term_months: 180, monthly_payment: 2575, first_payment_on: "2023-03-01", legal_document_id: null, gift_or_loan: "loan", balance_note: "Rents pay this note to Rich & Diana. Unpaid balance at death splits equally among the six children." },
  { id: uid("loan", 3), direction: "owed_by_estate", counterparty: "Sample Mortgage Co.", lender: "Sample Mortgage Co.", property_id: uid("prop", 2), principal: 185000, rate_pct: 3.25, status: "active", note_signed: true, started_on: "2018-05-01", term_months: 360, monthly_payment: 805.16, first_payment_on: "2018-06-01", balance_note: "[Sample] 30-year fixed from 2018." },
  { id: uid("loan", 4), direction: "owed_by_estate", counterparty: "Sample Federal Credit Union", lender: "Sample Federal Credit Union", property_id: uid("prop", 3), principal: 210000, rate_pct: 3.5, status: "active", note_signed: true, started_on: "2019-09-01", term_months: 360, monthly_payment: 943.03, first_payment_on: "2019-10-01", appraisal_on: "2026-09-10", appraisal_value: 485000, appraisal_source: "Lender AVM package (sample)", balance_note: "[Sample] AVM appraisal on file from the lender." },
];

export const loanPayments: LoanPayment[] = [
  { id: uid("lp", 1), loan_id: uid("loan", 1), paid_on: "2024-01-15", amount: 5000, kind: "payment", note: "[Sample] First repayment" },
  { id: uid("lp", 2), loan_id: uid("loan", 1), paid_on: "2025-01-15", amount: 5000, kind: "payment", note: null },
  { id: uid("lp", 3), loan_id: uid("loan", 1), paid_on: "2026-01-15", amount: 5000, kind: "payment", note: null },
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
import type { Account, HealthCondition, LoanPayment, Medication, Provider, VaClaim, VisitNote } from "../types";

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
import type { InsurancePolicy, Property, TaxRecord, TaxSourceItem } from "../types";

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

const TR = (n: number, year: number, kind: TaxRecord["kind"], status: string, extra: Partial<TaxRecord> = {}): TaxRecord => ({
  id: uid("tax", n), tax_year: year, kind, preparer: year <= 2023 ? "Sample CPA, PLLC" : "Sample Block Advisor", status, filed_on: null, notes: null,
  amended: false, amended_form: null, ssn_last4_rich: "1111", ssn_last4_diana: "2222", refund_bank_last4: "1234", cpa_person_id: null, imported_file_id: null, drive_link: null, source: "app", ...extra,
});
export const taxRecords: TaxRecord[] = [
  TR(1, 2025, "federal", "Filed", { filed_on: "2026-03-20" }),
  TR(2, 2025, "state", "Not required (AZ resident; WA rental income on the federal return)", { ssn_last4_rich: null, ssn_last4_diana: null, refund_bank_last4: null }),
  TR(3, 2025, "property", "Second half due", { notes: "Tumwater rentals. Due dates on the calendar.", ssn_last4_rich: null, ssn_last4_diana: null, refund_bank_last4: null }),
  TR(4, 2026, "exemption", "Active", { notes: "Disabled-veteran exemption on the Lake Havasu home. Renew with the county assessor if asked.", ssn_last4_rich: null, ssn_last4_diana: null, refund_bank_last4: null }),
  TR(5, 2024, "federal", "Filed, then amended", { filed_on: "2025-04-02", amended: true, amended_form: "1040-X", notes: "[Sample] Amended to correct rental depreciation." }),
  TR(6, 2023, "federal", "Filed", { filed_on: "2024-04-10" }),
  TR(7, 2022, "federal", "Filed", { filed_on: "2023-04-05" }),
  TR(8, 2021, "federal", "Filed", { filed_on: "2022-04-12" }),
  TR(9, 2020, "federal", "Filed", { filed_on: "2021-05-01" }),
  TR(10, 2019, "federal", "Filed", { filed_on: "2020-07-10" }),
  TR(11, 2026, "federal", "Not started", { notes: "Gather 1099s in January.", ssn_last4_rich: null, ssn_last4_diana: null, refund_bank_last4: null }),
];

export const taxSourceItems: TaxSourceItem[] = [
  { id: uid("tsi", 1), tax_year: 2025, label: "1099 · Rental A rents", provider: "Welcome Home (sample portal)", where_to_find: "Owner portal → Documents → Tax", portal_url: "https://example.com/welcome-home", vault_item: "Greene – Welcome Home portal", received: true, received_on: day(-30), notes: null },
  { id: uid("tsi", 2), tax_year: 2025, label: "1099 · Rental B rents", provider: "MVP (sample portal)", where_to_find: "Owner portal → Statements → Year-end", portal_url: "https://example.com/mvp", vault_item: "Greene – MVP portal", received: false, received_on: null, notes: "Usually posted late January." },
  { id: uid("tsi", 3), tax_year: 2025, label: "1098 · Mortgage interest, Rental A", provider: "Truist (sample)", where_to_find: "Online banking → Documents → Tax forms", portal_url: "https://example.com/truist", vault_item: "Greene – Truist", received: false, received_on: null, notes: null },
  { id: uid("tsi", 4), tax_year: 2025, label: "1098 · Mortgage interest, Rental B", provider: "Mr. Cooper (sample)", where_to_find: "Account → Tax documents", portal_url: "https://example.com/mrcooper", vault_item: "Greene – Mr. Cooper", received: false, received_on: null, notes: null },
  { id: uid("tsi", 5), tax_year: 2025, label: "SSA-1099 · Social Security", provider: "SSA.gov (sample)", where_to_find: "my Social Security → Replacement documents", portal_url: "https://example.com/ssa", vault_item: "Rich – SSA", received: true, received_on: day(-40), notes: null },
];


// --- Digital accounts & household (FAKE) --------------------------------------
import type { DigitalAccount, HouseholdItem } from "../types";

const DA = (n: number, service: string, owner: DigitalAccount["owner"], category: string, status: DigitalAccount["status"], extra: Partial<DigitalAccount> = {}): DigitalAccount => ({
  id: uid("dig", n), service, website: null, owner, category, purpose: null, vault_name: "Greene Family", vault_item: status === "found" ? `${owner === "both" ? "Greene" : owner === "rich" ? "Rich" : "Diana"} – ${service}` : null, status, after_death: null, notes: null, source: "app", ...extra,
});
export const digitalAccounts: DigitalAccount[] = [
  DA(1, "Gmail (Rich)", "rich", "Email", "found", { website: "https://mail.google.com", purpose: "Main email; Riana reads it", after_death: "Keep open 12 months for bills, then close." }),
  DA(2, "Gmail (Diana)", "diana", "Email", "found", { website: "https://mail.google.com", purpose: "Main email; Riana reads it", after_death: "Keep open 12 months, then close." }),
  DA(3, "Apple ID", "both", "Devices", "found", { website: "https://appleid.apple.com", purpose: "iPad, photos, iCloud", after_death: "Download photos first (Legacy Contact set to Karmel).", notes: "Legacy Contact set up in Settings." }),
  DA(4, "Facebook", "diana", "Social", "found", { website: "https://facebook.com", after_death: "Memorialize." }),
  DA(5, "Sample Credit Union online banking", "both", "Banking", "found", { website: "https://example.com/cu", purpose: "Bills and transfers", after_death: "Executor contacts the bank; do not log in after death.", notes: "Account ····1234 and ····5678." }),
  DA(6, "My HealtheVet (VA)", "rich", "Health", "found", { website: "https://www.myhealth.va.gov", purpose: "VA appointments, prescriptions, claim status", after_death: "Close." }),
  DA(7, "Google Photos (shared family album)", "both", "Photos", "found", { website: "https://photos.google.com", after_death: "Transfer ownership to Karmel.", source: "riana" }),
  DA(8, "Streaming (sample)", "both", "Entertainment", "to_find", { purpose: "TV", after_death: "Cancel.", notes: "Billed to card ····7890." }),
  DA(9, "Sample Brokerage", "rich", "Investments", "to_find", { purpose: "Rich's IRA" }),
  DA(10, "Sample Card Co.", "diana", "Banking", "to_find"),
  DA(11, "Medicare.gov", "both", "Health", "to_find", { website: "https://www.medicare.gov" }),
  DA(12, "SSA.gov (my Social Security)", "rich", "Government", "found", { website: "https://www.ssa.gov" }),
  DA(13, "SSA.gov (my Social Security)", "diana", "Government", "to_find", { website: "https://www.ssa.gov" }),
  DA(14, "Sample Electric Co.", "both", "Utilities", "found", { purpose: "Autopay" }),
  DA(15, "Water & sewer (sample)", "both", "Utilities", "to_find"),
  DA(16, "Phone & internet (sample)", "both", "Utilities", "found"),
  DA(17, "Welcome Home portal (sample)", "both", "Rentals", "found", { purpose: "Rental A statements and 1099" }),
  DA(18, "MVP portal (sample)", "both", "Rentals", "to_find", { purpose: "Rental B statements and 1099" }),
  DA(19, "Amazon", "diana", "Shopping", "to_find"),
  DA(20, "Church membership tools (sample)", "both", "Church", "found"),
];

export const householdItems: HouseholdItem[] = [
  { id: uid("hh", 1), kind: "pet", name: "Buddy (sample dog)", details: "[Sample] 9-year-old terrier mix. Vet: Sample Animal Clinic (555) 010-1001. Food: one scoop morning and night. Goes to David if Mom and Dad can't care for him.", source: "app" },
  { id: uid("hh", 2), kind: "vehicle", name: "Classic car (sample)", details: "[Sample] 1966 convertible. Title in the home safe. Goes to Michael — see Urgent Questions. Insured by Sample Classic Insurers.", source: "app" },
  { id: uid("hh", 3), kind: "vehicle", name: "Everyday car (sample)", details: "[Sample] 2019 sedan. Title in the home safe. Spare key on the hook by the garage door.", source: "app" },
  { id: uid("hh", 4), kind: "heirloom", name: "Grandma's quilt (sample)", details: "[Sample] In the cedar chest. Diana would like it to go to Tina.", source: "app" },
  { id: uid("hh", 5), kind: "heirloom", name: "Rich's service medals (sample)", details: "[Sample] Shadow box in the den. Rich wants them to stay with the family; no one named yet.", source: "app" },
  { id: uid("hh", 6), kind: "service", name: "Yard & pool service (sample)", details: "[Sample] Every other Tuesday. Paid by autopay. Phone (555) 010-1002.", source: "app" },
  { id: uid("hh", 7), kind: "service", name: "Housekeeper (sample)", details: "[Sample] Fridays. Has a key. Phone (555) 010-1003.", source: "app" },
  { id: uid("hh", 8), kind: "other", name: "Home safe", details: "[Sample] In the master closet. Combination is in 1Password under \"Greene – Home safe\". Holds titles, the POA originals and passports.", source: "app" },
  { id: uid("hh", 9), kind: "other", name: "Spare keys", details: "[Sample] Next-door neighbor has a house key. Garage code is in 1Password.", source: "app" },
];

// --- Estate plan (Update Brief #2 §3d: the family's stated plan, no identifiers) -----
import type { EstatePlanVersion, EstateProvision, PlanConflict } from "../types";

export const estatePlanVersions: EstatePlanVersion[] = [
  { id: uid("epv", 1), version_no: 1, title: "2026 estate plan (in progress)", plan_date: "2026-10-15", status: "current",
    source_docs: ["Attorney Strategic Summary Brief", "Family Agreement Notes"],
    summary: "A revocable living trust to hold the Washington rentals, the vehicles and the CDs; StarLar passes to Mike and Karmel; the rents keep paying the parents on two notes; anything unpaid at death is split six ways." },
];

const PV = (n: number, category: EstateProvision["category"], subject: string, planned: string, legal_document_id: string | null = null, notes: string | null = null): EstateProvision =>
  ({ id: uid("epr", n), plan_version_id: uid("epv", 1), category, subject, planned, legal_document_id, sort_order: n, notes });
export const estateProvisions: EstateProvision[] = [
  PV(1, "asset", "Revocable living trust", "Create a revocable living trust to hold the WA rentals, the vehicles, and the Foothills and Glacier CDs.", uid("l", 2), "Trust not yet drafted."),
  PV(2, "asset", "WA rentals (StarLar)", "Title and appreciation go to Mike and Karmel 50/50, held through the trust; outside the six-way split of the will.", uid("l", 6), "2021 TOD deeds conflict with this (see open questions)."),
  PV(3, "asset", "Vehicles (Vickie, '56 Chevy)", "Held by the trust.", uid("l", 2)),
  PV(4, "asset", "Foothills and Glacier CDs", "Held by the trust.", uid("l", 2)),
  PV(5, "role", "Successor trustee / executrix", "Heather.", uid("l", 1), "The 2021 draft will names one executor; family intends co-executors (Karmel & Heather) — confirm which role each holds."),
  PV(6, "role", "Co-attorneys-in-fact", "Mike and Karmel.", uid("l", 3), "Current signed financial POA (2019) names someone — confirm."),
  PV(7, "term", "StarLar Note 1", "$1,655/mo · $250k at 4.75% · 20 years · from Apr 2021. Rents pay the parents.", uid("l", 9)),
  PV(8, "term", "StarLar Note 2", "$2,575/mo · $300k at 6.25% · 15 years · from Mar 2023. Rents pay the parents.", null, "No signed note on the Legal board yet."),
  PV(9, "term", "Unpaid note balance at death", "Split equally among all six children.", null),
  PV(10, "term", "Loans to children ($50k each)", "Not addressed in the plan.", null, "Open question."),
];

const PC = (n: number, title: string, detail: string, owner_name: string, status: PlanConflict["status"], provision_id: string | null = null): PlanConflict =>
  ({ id: uid("pc", n), plan_version_id: uid("epv", 1), provision_id, title, detail, owner_name, status, resolution: null, due_on: null, sort_order: n });
export const planConflicts: PlanConflict[] = [
  PC(1, "Equity figure: $480k vs. $540k", "The attorney's summary and the family notes give different equity figures for the rentals. Which one does the plan use, and as of what date?", "Karmel", "open", uid("epr", 2)),
  PC(2, "Payout at the first death vs. after both deaths", "Does the six-way split (and the StarLar transfer) happen when the first parent dies, or only after both?", "Heather", "open", uid("epr", 9)),
  PC(3, "No attorney named yet", "The 2026 plan has no engaged attorney. Larry Stout drafted the 2021 documents.", "Karmel", "open"),
  PC(4, "The $50k loans to children aren't addressed", "Ryan & Tracy ($50k, signed) and David ($50k, proposed): advances against inheritance, repaid, or forgiven?", "Heather", "open", uid("epr", 10)),
  PC(5, "2021 TOD deeds conflict with the trust plan", "Recorded transfer-on-death deeds (nos. 4857438 and 4857439) would pass the rentals outside the trust. They must be revoked or the plan must change.", "Karmel", "with_attorney", uid("epr", 2)),
  PC(6, "Note 1 terms don't match its payment", "$250k at 4.75% over 20 years computes to $1,615.56/mo, not $1,655 (about $40/mo apart; $1,655 pays off in ~19 years). Confirm the note's actual rate, term or payment.", "Karmel", "open", uid("epr", 7)),
];

// --- Vehicles (Update Brief #2 §3a; values are the brief's estimates, improvements are FAKE) ---
import type { Vehicle, VehicleImprovement } from "../types";

export const vehicles: Vehicle[] = [
  { id: uid("veh", 1), year: 1934, make: "Ford", model: "Victoria", nickname: "Vickie", engine: "350 Chevy V8", vin_last4: null, estimated_value: 50000, valuation_on: "2026-10-01", valuation_source: "Family estimate (sample)", title_location: "[Sample] Home safe", owner: "rich", insurance_policy_id: uid("ins", 2), estate_provision_id: uid("epr", 3), specs_file_id: null, notes: "Specs and the improvements list come from the 'Vickie Specs' and '34 Vickie Improvements' documents once imported.", source: "app" },
  { id: uid("veh", 2), year: 1956, make: "Chevrolet", model: "[Sample] Bel Air", nickname: "the '56", engine: "[Sample] 265 V8", vin_last4: null, estimated_value: 100000, valuation_on: "2026-10-01", valuation_source: "Family estimate (sample)", title_location: "[Sample] Home safe", owner: "rich", insurance_policy_id: uid("ins", 2), estate_provision_id: uid("epr", 3), specs_file_id: null, notes: null, source: "app" },
  { id: uid("veh", 3), year: 2019, make: "[Sample] Sedan", model: null, nickname: "the everyday car", engine: null, vin_last4: null, estimated_value: 14000, valuation_on: "2026-06-01", valuation_source: "[Sample] Online estimate", title_location: "[Sample] Home safe", owner: "both", insurance_policy_id: uid("ins", 1), estate_provision_id: null, specs_file_id: null, notes: "Spare key on the hook by the garage door.", source: "app" },
];

const VI = (n: number, done_on: string | null, approx: string | null, description: string, cost: number | null, vendor: string | null = null): VehicleImprovement =>
  ({ id: uid("vi", n), vehicle_id: uid("veh", 1), done_on, done_on_approx: approx, description, cost, vendor, imported_file_id: null, source: "import" });
export const vehicleImprovements: VehicleImprovement[] = [
  VI(1, "2016-05-01", null, "[Sample] Engine rebuild and new intake", 6800, "Sample Speed Shop"),
  VI(2, "2017-08-01", null, "[Sample] Disc brake conversion", 2400, "Sample Speed Shop"),
  VI(3, null, "2019", "[Sample] Paint and body", 9500, "Sample Body Works"),
  VI(4, "2021-03-15", null, "[Sample] Upholstery and headliner", 3100, null),
  VI(5, "2023-10-10", null, "[Sample] Wiring harness and gauges", 1900, null),
  VI(6, null, "summer 2025", "[Sample] New tires and alignment", 1200, "Sample Tire Co."),
];
