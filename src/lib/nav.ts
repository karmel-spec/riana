import type { ComponentType } from "react";
import type { Section } from "./types";
import type { Viewer } from "./session";
import { canRead } from "./session";
import * as I from "@/components/icons";

export type NavItem = {
  href: string;
  label: string;
  section: Section | null;   // null = always visible
  icon: ComponentType<{ size?: number; className?: string }>;
  built?: boolean;            // false = coming in a later phase
  group?: string;             // sidebar heading this item sits under
};

export const NAV: NavItem[] = [
  { href: "/", label: "Home", section: null, icon: I.Home, built: true },
  { href: "/questions", label: "Urgent Questions", section: "urgent_questions", icon: I.Question, built: true , group: "Today" },
  { href: "/calendar", label: "Calendar", section: "calendar", icon: I.Calendar, built: true , group: "Today" },
  { href: "/contacts", label: "Contacts & Who to Notify", section: "contacts", icon: I.People, built: true , group: "Today" },
  { href: "/health/diana", label: "Health · Diana", section: "health_diana", icon: I.Heart, built: true , group: "Health" },
  { href: "/health/rich", label: "Health · Rich", section: "health_rich", icon: I.Heart, built: true , group: "Health" },
  { href: "/properties", label: "Properties", section: "properties", icon: I.House, built: true , group: "Property & money" },
  { href: "/vehicles", label: "Vehicles", section: "properties", icon: I.Car, built: true , group: "Property & money" },
  { href: "/money", label: "Accounts & Bills", section: "accounts", icon: I.Bank, built: true , group: "Property & money" },
  { href: "/loans", label: "Loans Ledger", section: "accounts", icon: I.Receipt, built: true , group: "Property & money" },
  { href: "/insurance", label: "Insurance", section: "insurance", icon: I.Shield, built: true , group: "Property & money" },
  { href: "/legal", label: "Legal & Estate", section: "legal", icon: I.Scroll, built: true , group: "Legal & wishes" },
  { href: "/estate", label: "Estate Plan", section: "legal", icon: I.Scroll, built: true , group: "Legal & wishes" },
  { href: "/wishes", label: "Final Wishes", section: "final_wishes", icon: I.Dove, built: true , group: "Legal & wishes" },
  { href: "/digital", label: "Accounts Directory", section: "digital_accounts", icon: I.Key, built: true , group: "Logins & home" },
  { href: "/passwords", label: "Passwords", section: "digital_accounts", icon: I.Lock, built: true , group: "Logins & home" },
  { href: "/household", label: "Household", section: "household", icon: I.House, built: true , group: "Logins & home" },
  { href: "/history", label: "Family History", section: "family_history", icon: I.Book, built: true , group: "Memories" },
  { href: "/journals", label: "Journals", section: "family_history", icon: I.Book, built: true, group: "Memories" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/riana", label: "Updates from Riana", section: "admin", icon: I.Sparkle, built: true },
  { href: "/admin/import", label: "Riana Drive Import", section: "admin", icon: I.Book, built: true },
  { href: "/taxes", label: "Taxes", section: "admin", icon: I.Receipt, built: true },
  { href: "/admin/audit", label: "Audit Log", section: "admin", icon: I.Shield, built: true },
  { href: "/admin/people", label: "People & Access", section: "admin", icon: I.Lock, built: true },
];

export function visibleNav(v: Viewer, items: NavItem[]) {
  return items.filter((i) => i.section === null || canRead(v, i.section));
}
