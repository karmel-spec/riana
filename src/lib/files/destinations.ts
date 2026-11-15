import type { Section } from "@/lib/types";

/** Where a reviewed file can be sent: the page it will show on, the section that guards it, and the note tag the page keys on. */
export type Destination = { key: string; label: string; section: Section; tag?: string; collection?: "book" | "photos" | "imemories" | "digital_history"; journal?: "rich" | "diana" };

export const DESTINATIONS: Destination[] = [
  { key: "health_diana", label: "Health · Diana (timeline)", section: "health_diana" },
  { key: "health_rich", label: "Health · Rich (timeline)", section: "health_rich" },
  { key: "home", label: "Home", section: "properties", tag: "Properties → Home" },
  { key: "starlar", label: "StarLar", section: "properties", tag: "[StarLar · Added]" },
  { key: "vehicles", label: "Vehicles", section: "properties", tag: "Properties → Vehicles" },
  { key: "accounts", label: "Accounts", section: "accounts" },
  { key: "bills", label: "Bills", section: "bills" },
  { key: "insurance", label: "Insurance", section: "insurance" },
  { key: "taxes", label: "Taxes", section: "taxes" },
  { key: "legal", label: "Legal & Estate", section: "legal" },
  { key: "funeral", label: "Funeral", section: "final_wishes", tag: "Final wishes → Funeral" },
  { key: "burial", label: "Burial", section: "final_wishes", tag: "Final wishes → Burial" },
  { key: "contacts", label: "Contacts", section: "contacts" },
  { key: "history", label: "Family History", section: "family_history" },
  { key: "journal_diana", label: "Journals · Diana", section: "family_history", journal: "diana" },
  { key: "journal_rich", label: "Journals · Rich", section: "family_history", journal: "rich" },
  { key: "books", label: "Mom’s Books", section: "family_history", collection: "book" },
  { key: "photos", label: "Photos", section: "family_history", collection: "photos" },
  { key: "imemories", label: "iMemories", section: "family_history", collection: "imemories" },
  { key: "digital_history", label: "Digital family history", section: "family_history", collection: "digital_history" },
  ...["Legal", "Financial", "Insurance", "Military & VA", "Funeral & Burial", "Guides", "Family Photos & Notes", "2026"].map((t) => ({ key: `widow:${t}`, label: `Widow Book · ${t}`, section: "legal" as Section, tag: `[Widow Book · ${t}]` })),
  { key: "vital", label: "The Safe · Vital records (vault)", section: "accounts", tag: "[Vital records · Other]" },
  { key: "agenda", label: "Meeting agenda (to review)", section: "legal", tag: "[Agenda]" },
  { key: "admin", label: "Admin only (hold back)", section: "admin" },
];

/** Strip an earlier page tag so a file can be re-filed cleanly. */
export const untag = (note: string | null) => (note ?? "").replace(/^\[[^\]]*\]\s*/, "").replace(/^(Properties|Final wishes|Health|Media|History archive)[^·]*(→|->)[^·]*·?\s*/, "").trim();
