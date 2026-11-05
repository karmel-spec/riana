// FAKE demo identities for the role switcher (demo mode only).
import type { AppRole, Subject } from "../types";

export type DemoUser = { key: string; name: string; role: AppRole; isSubject: Subject | null; blurb: string };

export const DEMO_USERS: DemoUser[] = [
  { key: "karmel", name: "Karmel", role: "super_admin", isSubject: null, blurb: "Co-executor · Super Admin" },
  { key: "heather", name: "Heather", role: "super_admin", isSubject: null, blurb: "Co-executor · Super Admin" },
  { key: "diana", name: "Diana", role: "parent", isSubject: "diana", blurb: "Mom · parent view" },
  { key: "rich", name: "Rich", role: "parent", isSubject: "rich", blurb: "Dad · parent view" },
  { key: "david", name: "David", role: "family", isSubject: null, blurb: "Son · family member" },
  { key: "grandchild", name: "A grandchild", role: "posterity", isSubject: null, blurb: "Grandchild · history & wishes" },
];
