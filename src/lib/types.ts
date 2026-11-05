// Row shapes as returned by Supabase (snake_case, matching the SQL migrations).

export type AppRole = "super_admin" | "parent" | "family" | "posterity" | "professional";
export type Subject = "rich" | "diana" | "both" | "household";
export type Source = "app" | "riana" | "import";
export type AccessLevel = "none" | "read" | "write";

export const SECTIONS = [
  "urgent_questions", "calendar", "contacts", "health_diana", "health_rich",
  "properties", "accounts", "bills", "insurance", "taxes", "legal",
  "final_wishes", "digital_accounts", "household", "next_steps",
  "family_history", "notify", "admin",
] as const;
export type Section = (typeof SECTIONS)[number];

export type QuestionStatus = "open" | "asked" | "partly_answered" | "answered" | "closed";
export type UrgentQuestion = {
  id: string;
  question: string;
  topic: Section | null;
  asked_of: Subject;
  owner_name: string | null;
  priority: "high" | "normal";
  status: QuestionStatus;
  answer: string | null;
  answered_by: Subject | null;
  answered_at: string | null;
  due_on: string | null;
  sort_order: number;
  source: Source;
  updated_at: string;
};

export type CalendarEvent = {
  id: string;
  section: Section;
  title: string;
  kind: "appointment" | "deadline" | "renewal" | "family" | "other";
  about: Subject;
  starts_at: string;
  all_day: boolean;
  location: string | null;
  driver: string | null;
  notes: string | null;
  source: Source;
};

export type LegalStatus = "not_started" | "drafted" | "signed" | "recorded" | "superseded";
export type LegalDocument = {
  id: string;
  doc_type: string;
  title: string;
  principal: Subject;
  status: LegalStatus;
  needs_recording: boolean;
  prepared_by: string | null;
  drafted_on: string | null;
  signed_on: string | null;
  recorded_on: string | null;
  original_location: string | null;
  open_issue: string | null;
  notes: string | null;
  sort_order: number;
  source: Source;
  updated_at: string;
};

export type ContactMethod = "phone" | "text" | "email" | "mail" | "in_person";
export type ContactGroup = {
  id: string;
  name: string;
  kind: "family" | "friends" | "church" | "club" | "neighbors" | "military" | "professional" | "other";
  description: string | null;
};
export type Person = {
  id: string;
  full_name: string;
  relationship: string | null;
  connected_to: Subject;
  email: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  closeness: number | null;
  last_contact_on: string | null;
  preferred_method: ContactMethod | null;
  notify_first: boolean;
  confirmed: boolean;
  notes: string | null;
  group_ids: string[];
};

export type NotificationList = {
  id: string;
  name: string;
  purpose: "funeral" | "hospitalization" | "news" | "other";
  description: string | null;
  members: { person_id: string; wave: 1 | 2 | 3 }[];
};

export type RecipientStatus = "not_sent" | "sent" | "replied" | "attending" | "not_attending";
export type NotificationCampaign = {
  id: string;
  list_id: string;
  title: string;
  message: string;
  status: "draft" | "awaiting_approval" | "approved" | "sending" | "sent" | "cancelled";
  requested_by_name: string | null;
  approved_by_name: string | null;
  recipients: { person_id: string; status: RecipientStatus; contacted_by: string | null; note: string | null }[];
};

export type Bill = {
  id: string;
  payee: string;
  category: string | null;
  amount: number | null;
  frequency: string;
  next_due_on: string | null;
  autopay: boolean;
  status: "upcoming" | "paid" | "failed" | "overdue";
  last_paid_on?: string | null;
  notes: string | null;
  source: Source;
};

export type LabResult = {
  id: string;
  patient: "rich" | "diana";
  test_name: string;
  value: number;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  flag: "high" | "low" | "normal";
  taken_on: string;
  source: Source;
};

export type FinalWish = {
  id: string;
  person: "rich" | "diana" | "both";
  topic: string;
  wish: string;
  confirmed: boolean;
};

export type RianaUpdate = {
  id: string;
  kind: string;
  summary: string;
  received_at: string;
  review_status: "pending" | "approved" | "rejected";
  /** Set by the agent that sent it, so a retry is recognized as the same update. */
  external_ref?: string | null;
};

export type AuditEntry = {
  id: number;
  at: string;
  actor_name: string;
  action: string;
  section: Section | null;
  entity: string | null;
  via: Source;
  summary: string;
};

export type Loan = {
  id: string;
  direction: "owed_to_estate" | "owed_by_estate";
  counterparty: string;
  principal: number | null;
  rate_pct: number | null;
  status: "proposed" | "active" | "paid_off" | "forgiven";
  note_signed: boolean;
};

export type Provider = {
  id: string;
  patient: "rich" | "diana";
  name: string;
  specialty: string | null;
  practice: string | null;
  phone: string | null;
  portal_name: string | null;
  is_va: boolean;
  notes: string | null;
};

export type Medication = {
  id: string;
  patient: "rich" | "diana";
  name: string;
  dose: string | null;
  schedule: string | null;
  purpose: string | null;
  prescriber_id: string | null;
  started_on: string | null;
  stopped_on: string | null;
  active: boolean;
  notes: string | null;
  source: Source;
};

export type HealthCondition = {
  id: string;
  patient: "rich" | "diana";
  kind: "condition" | "allergy" | "coverage";
  name: string;
  detail: string | null;
  since: string | null;
};

export type VisitNote = {
  id: string;
  patient: "rich" | "diana";
  visit_on: string;
  provider_id: string | null;
  summary: string;
  follow_up: string | null;
  author_name: string | null;
  source: Source;
  created_at: string;
};

export type VaClaim = {
  id: string;
  kind: "claim" | "appeal" | "cp_exam" | "rating_decision";
  title: string;
  status: string;
  filed_on: string | null;
  decided_on: string | null;
  rating_pct: number | null;
  next_step: string | null;
  notes: string | null;
  source: Source;
};

export type Account = {
  id: string;
  institution: string;
  kind: "checking" | "savings" | "brokerage" | "retirement" | "credit_card" | "loan" | "other";
  purpose: string | null;
  last4: string | null;
  held_by: Subject;
  beneficiary_notes: string | null;
  notes: string | null;
  source: Source;
};
