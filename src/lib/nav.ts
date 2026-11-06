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
};

export const NAV: NavItem[] = [
  { href: "/", label: "Home", section: null, icon: I.Home, built: true },
  { href: "/questions", label: "Urgent Questions", section: "urgent_questions", icon: I.Question, built: true },
  { href: "/calendar", label: "Calendar", section: "calendar", icon: I.Calendar, built: true },
  { href: "/contacts", label: "Contacts & Who to Notify", section: "contacts", icon: I.People, built: true },
  { href: "/health/diana", label: "Health · Diana", section: "health_diana", icon: I.Heart, built: true },
  { href: "/health/rich", label: "Health · Rich", section: "health_rich", icon: I.Heart, built: true },
  { href: "/properties", label: "Properties", section: "properties", icon: I.House, built: true },
  { href: "/money", label: "Accounts & Bills", section: "accounts", icon: I.Bank, built: true },
  { href: "/loans", label: "Loans Ledger", section: "accounts", icon: I.Receipt, built: true },
  { href: "/insurance", label: "Insurance", section: "insurance", icon: I.Shield, built: true },
  { href: "/legal", label: "Legal & Estate", section: "legal", icon: I.Scroll, built: true },
  { href: "/estate", label: "Estate Plan", section: "legal", icon: I.Scroll, built: true },
  { href: "/wishes", label: "Final Wishes", section: "final_wishes", icon: I.Dove, built: true },
  { href: "/digital", label: "Accounts Directory", section: "digital_accounts", icon: I.Key, built: true },
  { href: "/household", label: "Pets & Household", section: "household", icon: I.Paw, built: true },
  { href: "/history", label: "Family History", section: "family_history", icon: I.Book, built: true },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/riana", label: "Updates from Riana", section: "admin", icon: I.Sparkle, built: true },
  { href: "/admin/import", label: "Drive Import", section: "admin", icon: I.Book, built: true },
  { href: "/taxes", label: "Taxes", section: "admin", icon: I.Receipt, built: true },
  { href: "/admin/audit", label: "Audit Log", section: "admin", icon: I.Shield, built: true },
  { href: "/admin/people", label: "People & Access", section: "admin", icon: I.Lock, built: true },
];

export function visibleNav(v: Viewer, items: NavItem[]) {
  return items.filter((i) => i.section === null || canRead(v, i.section));
}
