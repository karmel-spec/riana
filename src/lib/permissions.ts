// The role matrix, mirrored from supabase/migrations/…_foundation.sql.
// The DATABASE is the source of truth and enforces it; this copy is only
// used to (a) shape navigation and (b) filter fake data in demo mode.
import type { AccessLevel, AppRole, Section } from "./types";

export const SENSITIVE: ReadonlySet<Section> = new Set<Section>([
  "health_diana", "health_rich", "properties", "accounts", "bills",
  "insurance", "taxes", "legal", "digital_accounts", "admin",
]);

const R = "read", W = "write";
export const ROLE_DEFAULTS: Record<AppRole, Partial<Record<Section, AccessLevel>>> = {
  super_admin: {},
  parent: {
    urgent_questions: W, calendar: R, contacts: W, properties: R, accounts: R, bills: R,
    insurance: R, taxes: R, legal: R, final_wishes: W, digital_accounts: R, household: W,
    next_steps: R, family_history: W,
  },
  family: {
    urgent_questions: R, calendar: R, contacts: R, health_diana: R, health_rich: R,
    final_wishes: R, household: R, next_steps: R, family_history: W,
  },
  posterity: { final_wishes: R, family_history: R },
  professional: {},
};

export const SECTION_LABELS: Record<Section, string> = {
  urgent_questions: "Urgent Questions",
  calendar: "Calendar",
  contacts: "Contacts & Who to Notify",
  health_diana: "Health · Diana",
  health_rich: "Health · Rich",
  properties: "Properties",
  accounts: "Accounts & Loans",
  bills: "Bills & Utilities",
  insurance: "Insurance",
  taxes: "Taxes",
  legal: "Legal & Estate",
  final_wishes: "Final Wishes",
  digital_accounts: "Digital Accounts",
  household: "Pets & Household",
  next_steps: "Next Steps",
  family_history: "Family History",
  notify: "Notification Lists",
  admin: "Admin",
};
