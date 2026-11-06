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
  property_id?: string | null;
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

/** An agent key for the Riana endpoints (hash never leaves the database). */
export type RianaKey = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  use_count: number;
  revoked_at: string | null;
  read_sections: Section[];
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
  property_id?: string | null;
  balance_note?: string | null;
  term_months?: number | null;
  monthly_payment?: number | null;
  first_payment_on?: string | null;
  legal_document_id?: string | null;
  imported_file_id?: string | null;
  advance_on_inheritance?: "yes" | "no" | "undecided" | null;
  principal: number | null;
  rate_pct: number | null;
  status: "proposed" | "unclassified" | "active" | "paid_off" | "forgiven";
  note_signed: boolean;
  lender?: string | null;
  purpose?: string | null;
  appraisal_on?: string | null;
  appraisal_value?: number | null;
  appraisal_source?: string | null;
  gift_or_loan?: "gift" | "loan" | "undecided" | null;
  started_on?: string | null;
};

export type LoanPayment = {
  id: string;
  loan_id: string;
  paid_on: string;
  amount: number;
  kind: "payment" | "interest_only" | "principal_only" | "forgiveness" | "adjustment";
  note: string | null;
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

export type Property = {
  id: string;
  name: string;
  kind: "residence" | "rental" | "land" | "other";
  address: string | null;
  held_by: string | null;
  succession_plan: string | null;
  manager_person_id: string | null;
  hoa_name: string | null;
  notes: string | null;
  source: Source;
};

export type InsurancePolicy = {
  id: string;
  kind: "auto" | "home" | "classic_car" | "umbrella" | "medicare" | "supplemental" | "champva" | "life" | "landlord" | "other";
  carrier: string;
  insured: Subject;
  policy_last4: string | null;
  premium: number | null;
  renews_on: string | null;
  agent_person_id: string | null;
  notes: string | null;
  source: Source;
};

export type TaxRecord = {
  id: string;
  tax_year: number;
  kind: "federal" | "state" | "property" | "exemption" | "other";
  preparer: string | null;
  status: string;
  filed_on: string | null;
  notes: string | null;
  amended: boolean;
  amended_form: string | null;
  ssn_last4_rich: string | null;
  ssn_last4_diana: string | null;
  refund_bank_last4: string | null;
  cpa_person_id: string | null;
  imported_file_id: string | null;
  drive_link: string | null;
  source: Source;
};

export type TaxSourceItem = {
  id: string;
  tax_year: number;
  label: string;
  provider: string | null;
  where_to_find: string | null;
  portal_url: string | null;
  vault_item: string | null;
  received: boolean;
  received_on: string | null;
  notes: string | null;
};

export type DigitalAccount = {
  id: string;
  service: string;
  website: string | null;
  owner: Subject;
  category: string | null;
  purpose: string | null;
  vault_name: string;
  vault_item: string | null;
  status: "found" | "to_find";
  after_death: string | null;
  notes: string | null;
  source: Source;
};

export type HouseholdItem = {
  id: string;
  kind: "pet" | "vehicle" | "heirloom" | "service" | "other";
  name: string;
  details: string | null;
  source: Source;
};

export type EstatePlanVersion = {
  id: string;
  version_no: number;
  title: string;
  plan_date: string;
  status: "draft" | "current" | "superseded";
  source_docs: string[];
  summary: string | null;
};

export type EstateProvision = {
  id: string;
  plan_version_id: string;
  category: "asset" | "role" | "term";
  subject: string;
  planned: string;
  legal_document_id: string | null;
  sort_order: number;
  notes: string | null;
};

export type PlanConflict = {
  id: string;
  plan_version_id: string | null;
  provision_id: string | null;
  title: string;
  detail: string | null;
  owner_name: string | null;
  status: "open" | "with_attorney" | "decided" | "resolved";
  resolution: string | null;
  due_on: string | null;
  sort_order: number;
};

export type Vehicle = {
  id: string;
  year: number | null;
  make: string;
  model: string | null;
  nickname: string | null;
  engine: string | null;
  vin_last4: string | null;
  estimated_value: number | null;
  valuation_on: string | null;
  valuation_source: string | null;
  title_location: string | null;
  owner: Subject;
  insurance_policy_id: string | null;
  estate_provision_id: string | null;
  specs_file_id: string | null;
  notes: string | null;
  source: Source;
};

export type VehicleImprovement = {
  id: string;
  vehicle_id: string;
  done_on: string | null;
  done_on_approx: string | null;
  description: string;
  cost: number | null;
  vendor: string | null;
  imported_file_id: string | null;
  source: Source;
};

export type MediaItem = {
  id: string;
  kind: "photo" | "video" | "audio_story" | "video_story";
  title: string | null;
  caption: string | null;
  story: string | null;
  taken_on: string | null;
  decade: number | null;
  event_name: string | null;
  people_tags: string[];
  category: "memory" | "church" | "music" | "event" | "document" | "other" | null;
  imported_file_id: string | null;
  poster_file_id: string | null;
  duration_seconds: number | null;
  mime_type: string | null;
  transcript: string | null;
  recorded_by: string | null;
  review_status: "pending" | "approved" | "rejected";
  source: Source;
};

export type Playlist = { id: string; slug: string; title: string; description: string | null; track_ids: string[] };

export type TributePage = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  intro: string | null;
  obituary: string | null;
  service: { when?: string; where?: string; address?: string; notes?: string; livestream_url?: string };
  status: "draft" | "published" | "unpublished";
  share_token: string | null;
  published_at: string | null;
  shared_list_ids: string[];
};

export type TributeBlock = {
  id: string;
  page_id: string;
  position: number;
  kind: "heading" | "text" | "media" | "gallery" | "story" | "service";
  text: string | null;
  media_item_id: string | null;
  media_item_ids: string[];
};
