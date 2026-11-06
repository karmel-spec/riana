// =============================================================================
// The combined import manifest (Update Brief #2, §1 and §2).
//
// Folders: what the app expects to read. Rules: how a file name maps to a
// target section. Nothing here is a file's contents; the brief's folder IDs
// are public identifiers for private folders and reveal nothing by themselves.
// =============================================================================
import type { Section } from "../types.ts";

export type Sensitivity = "normal" | "admin_only" | "excluded";
export type MediaKind = "document" | "pdf" | "spreadsheet" | "image" | "audio" | "video" | "form" | "other";

export type ManifestFolder = {
  key: string;
  name: string;
  driveFolderId: string | null;    // null = a subfolder found by name under its parent
  parentKey?: string;
  sensitivity: Sensitivity;
  defaultTarget: Section;
  defaultNote?: string;
  notes?: string;
};

export type ManifestRule = {
  id: string;
  /** Applies only to files in these folders (any folder if omitted). */
  folders?: string[];
  /** Case-insensitive match on the file name. */
  match: RegExp;
  target: Section;
  note?: string;          // "Properties → Vehicles"
  media?: MediaKind;
  sensitivity?: Sensitivity;
  dedupe?: boolean;       // compare by name + size + md5 across folders
};

export const FOLDERS: ManifestFolder[] = [
  { key: "root", name: "Web App Import", driveFolderId: "1mrhGYLnnLA_usVBb4vuHoA59ZJtXvBKj", sensitivity: "normal", defaultTarget: "family_history", notes: "Main import root" },
  { key: "rich_history", name: "History & Keepsakes - Rich", driveFolderId: null, parentKey: "root", sensitivity: "normal", defaultTarget: "family_history" },
  { key: "home_property", name: "Home & Property", driveFolderId: null, parentKey: "root", sensitivity: "normal", defaultTarget: "properties" },
  { key: "health", name: "Health", driveFolderId: null, parentKey: "root", sensitivity: "normal", defaultTarget: "health_diana" },
  { key: "diana_history", name: "History & Keepsakes - Diana's Drive", driveFolderId: "1uHl9xudE_5NlYK2eBgvqfgE6kw_opzeu", sensitivity: "normal", defaultTarget: "family_history" },
  { key: "singalong", name: "Rich_Greene_Sing-A-Long/MP3_Files", driveFolderId: "1vQiNtIOpbmV9Z9uckrEuR3G-MdxBUeXx", sensitivity: "normal", defaultTarget: "family_history", defaultNote: "Media → Rich's Sing-Along" },
  { key: "va", name: "VA & CHAMPVA", driveFolderId: "1wsEaDmDNhR2qoR726-xo0xFoymvGHnqj", sensitivity: "normal", defaultTarget: "health_rich", defaultNote: "VA benefits" },
  { key: "taxes", name: "Taxes", driveFolderId: "1ptf78Ps6_GYOhV9wAxPM1IDiADZXh6Wn", sensitivity: "admin_only", defaultTarget: "taxes", notes: "Contains SSNs and bank details: masked on display, super admins only" },
  { key: "legal", name: "Legal Docs", driveFolderId: "1C7nytouvRz1C2Lv52QJUi1y0rSeoN3D_", sensitivity: "normal", defaultTarget: "legal" },
  { key: "widow_book", name: "2022 Widow Book", driveFolderId: "19vZ3XcQhF2e1WjzuAJRf-Ghh6nQdOEEq", sensitivity: "admin_only", defaultTarget: "legal", notes: "Four sensitive files: whole folder admin-only until an admin releases individual files" },
  { key: "photos_takeout", name: "Photos (Takeout)", driveFolderId: null, parentKey: "root", sensitivity: "normal", defaultTarget: "family_history", defaultNote: "Photos → timeline", notes: "Created by the recurring Google Takeout export (item 9)" },
];

const H = "family_history" as const;

export const RULES: ManifestRule[] = [
  // --- Rich's Drive files (prior brief) --------------------------------------
  { id: "rich-hymn", folders: ["rich_history", "root"], match: /^(He Hymn|HE - Google Docs|SHE)\.(docx|pdf)$/i, target: H, note: "History archive", media: "document" },
  { id: "rich-song", folders: ["rich_history", "root", "diana_history", "singalong"], match: /^You are the only one\.mp3$/i, target: H, note: "Media → Rich's Sing-Along", media: "audio", dedupe: true },
  { id: "rich-photo", folders: ["rich_history", "root"], match: /^IMG_\d+\.(jpe?g|heic|png)$/i, target: H, note: "History archive → Photos", media: "image" },
  { id: "avm", folders: ["home_property", "root"], match: /^Approved_AVM_Package\.pdf$/i, target: "properties", note: "Properties → 2908 Solitude loan (AVM appraisal)", media: "pdf" },
  { id: "garage", folders: ["home_property", "root"], match: /(Parker Garage Doors|^estimate\.pdf$|^Garage Doors\.docx$|^Handyman Repairs\.docx$)/i, target: "properties", note: "Properties → Home", media: "document" },
  { id: "vickie", folders: ["home_property", "root"], match: /^34 Vickie Improvements\.docx$|^Vickie Specs\.docx$/i, target: "properties", note: "Properties → Vehicles (Vickie)", media: "document" },
  { id: "dentist", folders: ["health", "root"], match: /^Dentist\.docx$/i, target: "health_diana", note: "Health", media: "document" },

  // --- Diana's Drive files (§2) ------------------------------------------------
  { id: "diana-scripture", folders: ["diana_history"], match: /readscripture/i, target: H, note: "History archive → Media / Church", media: "video" },
  { id: "diana-video", folders: ["diana_history"], match: /\.(mp4|webm|mov)$/i, target: H, note: "History archive → Media (video)", media: "video" },
  { id: "singalong-untitled", folders: ["diana_history", "singalong"], match: /^Track part \d+/i, target: H, note: "Media → Rich's Sing-Along (title to identify)", media: "audio", dedupe: true },
  { id: "singalong-track", folders: ["diana_history", "singalong"], match: /\.mp3$/i, target: H, note: "Media → Rich's Sing-Along", media: "audio", dedupe: true },
  { id: "light", folders: ["diana_history"], match: /^IfoundtheLIGHT\.pdf$/i, target: H, note: "History archive / Church", media: "pdf" },
  { id: "forgive", folders: ["diana_history"], match: /Forgive for Good/i, target: H, note: "History archive", media: "document" },
  { id: "family-addresses", folders: ["diana_history"], match: /^Family_Names_and_Addresses\.pdf$/i, target: "contacts", note: "Contacts (import candidates, admin review first)", media: "pdf", sensitivity: "admin_only" },
  { id: "genealogy", folders: ["diana_history"], match: /Tokos.*(genealogy|military history)/i, target: H, note: "Family tree / Genealogy", media: "document" },
  { id: "masterlist", folders: ["diana_history"], match: /^masterlist.*\.xlsx$/i, target: "contacts", note: "Contacts (bulk import, admin review first)", media: "spreadsheet", sensitivity: "admin_only" },
  { id: "missionary", folders: ["diana_history"], match: /^Missionary_Letter_Tracker\.csv$/i, target: H, note: "Church", media: "spreadsheet" },
  { id: "champva-guide", folders: ["diana_history", "va"], match: /CHAMPVA.*guidebook/i, target: "health_rich", note: "VA benefits", media: "pdf" },
  { id: "va-form", folders: ["diana_history", "va"], match: /^(Form 10-7959c|VBA-21-4138)/i, target: "health_rich", note: "VA benefits (form)", media: "form" },
  { id: "va-letter", folders: ["diana_history", "va"], match: /VA.*claim.*letter|claim.*letter.*\d{4}-\d{2}-\d{2}|^\d{4}-\d{2}-\d{2}.*claim/i, target: "health_rich", note: "VA benefits → claim history timeline", media: "pdf" },

  // --- Folder-wide rules -----------------------------------------------------------
  { id: "tax-return", folders: ["taxes"], match: /^\d{4} Greene Federal Tax Return\.pdf$/i, target: "taxes", note: "Taxes → returns by year", media: "pdf", sensitivity: "admin_only" },
  { id: "tax-other", folders: ["taxes"], match: /./, target: "taxes", note: "Taxes", media: "pdf", sensitivity: "admin_only" },
  { id: "legal-any", folders: ["legal"], match: /./, target: "legal", note: "Legal & Estate → documents", media: "pdf" },
  { id: "widow-book", folders: ["widow_book"], match: /./, target: "legal", note: "2022 Widow Book (admin-only)", media: "document", sensitivity: "admin_only" },
  { id: "va-any", folders: ["va"], match: /./, target: "health_rich", note: "VA benefits", media: "pdf" },
  { id: "photo-sidecar", folders: ["photos_takeout"], match: /\.json$/i, target: H, note: "Takeout metadata sidecar: read for the photo's date, not imported", media: "other", sensitivity: "excluded" },
  { id: "photo-takeout", folders: ["photos_takeout"], match: /\.(jpe?g|png|heic|gif|webp|mp4|mov)$/i, target: H, note: "Photos → timeline (EXIF date)", dedupe: true },
];

export function mediaKindFor(name: string, mime?: string | null): MediaKind {
  const n = name.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(n) || mime?.startsWith("video/")) return "video";
  if (/\.(mp3|m4a|wav|aac|ogg)$/.test(n) || mime?.startsWith("audio/")) return "audio";
  if (/\.(jpe?g|png|heic|gif|webp|tiff?)$/.test(n) || mime?.startsWith("image/")) return "image";
  if (/\.pdf$/.test(n) || mime === "application/pdf") return "pdf";
  if (/\.(xlsx|xls|csv)$/.test(n) || mime?.includes("spreadsheet")) return "spreadsheet";
  if (/\.(docx?|txt|rtf)$/.test(n) || mime?.includes("document") || mime === "application/vnd.google-apps.document") return "document";
  return "other";
}

export type Match = { rule: ManifestRule | null; target: Section; note: string; media: MediaKind; sensitivity: Sensitivity; dedupe: boolean };

/** Decide where a file goes. Folder sensitivity always wins over a rule's. */
export function matchFile(folderKey: string, name: string, mime?: string | null): Match {
  const folder = FOLDERS.find((f) => f.key === folderKey);
  const rule = RULES.find((r) => (!r.folders || r.folders.includes(folderKey)) && r.match.test(name)) ?? null;
  const folderSens = folder?.sensitivity ?? "normal";
  const ruleSens = rule?.sensitivity ?? "normal";
  const sensitivity: Sensitivity =
    folderSens === "excluded" || ruleSens === "excluded" ? "excluded"
    : folderSens === "admin_only" || ruleSens === "admin_only" ? "admin_only" : "normal";
  return {
    rule,
    target: rule?.target ?? folder?.defaultTarget ?? "family_history",
    note: rule?.note ?? folder?.defaultNote ?? (rule ? "" : "Unmatched: filed under the folder's default section for review"),
    media: rule?.media ?? mediaKindFor(name, mime),
    sensitivity,
    dedupe: rule?.dedupe ?? false,
  };
}
