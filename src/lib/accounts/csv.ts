// CSV import for the accounts directory. Accepts ONLY where-the-login-lives
// fields. Any column that looks like a credential makes the whole import fail.
import type { DigitalAccount } from "../types.ts";

export type CsvRow = {
  service: string; website: string | null; owner: DigitalAccount["owner"]; category: string | null;
  vault_name: string | null; vault_item: string | null; status: DigitalAccount["status"]; notes: string | null;
};
export type ParseResult = { ok: true; rows: CsvRow[]; skipped: number } | { ok: false; error: string };

const ALLOWED = new Set(["name", "account", "service", "website", "url", "owner", "category", "vault", "vault_name", "vault_item", "item", "status", "notes", "note"]);
const FORBIDDEN = /password|passwd|pwd|secret|token|pin\b|passcode|credential|username|user_name|login|email_password|security answer|answer/i;

/** Minimal RFC-4180-ish parser: quoted fields, doubled quotes, CRLF. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function parseAccountsCsv(text: string): ParseResult {
  const table = splitCsv(text.trim());
  if (table.length < 2) return { ok: false, error: "Paste a CSV with a header row and at least one account." };
  const header = table[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const bad = header.find((h) => FORBIDDEN.test(h));
  if (bad) return { ok: false, error: `The column "${bad}" looks like a credential. This import takes names and statuses only; passwords stay in 1Password.` };
  const unknown = header.filter((h) => h && !ALLOWED.has(h));
  if (unknown.length) return { ok: false, error: `Unknown column(s): ${unknown.join(", ")}. Allowed: name, website, owner, category, vault, vault_item, status, notes.` };
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = idx(["name", "account", "service"]), iSite = idx(["website", "url"]), iOwner = idx(["owner"]), iCat = idx(["category"]);
  const iVault = idx(["vault", "vault_name"]), iItem = idx(["vault_item", "item"]), iStatus = idx(["status"]), iNotes = idx(["notes", "note"]);
  if (iName < 0) return { ok: false, error: 'The CSV needs a "name" column.' };

  const rows: CsvRow[] = []; let skipped = 0;
  for (const r of table.slice(1)) {
    const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
    const service = get(iName);
    if (!service) { skipped++; continue; }
    const ownerRaw = get(iOwner).toLowerCase();
    const owner: CsvRow["owner"] = /rich/.test(ownerRaw) ? "rich" : /diana/.test(ownerRaw) ? "diana" : "both";
    const statusRaw = get(iStatus).toLowerCase();
    const status: CsvRow["status"] = /^(found|done|yes|in vault|✓|x)$/.test(statusRaw) ? "found" : "to_find";
    const notes = get(iNotes);
    if (FORBIDDEN.test(notes) && /[:=]/.test(notes)) return { ok: false, error: `Row "${service}": the notes look like they contain a password.` };
    rows.push({
      service, website: get(iSite) || null, owner, category: get(iCat) || null,
      vault_name: get(iVault) || null, vault_item: get(iItem) || null, status, notes: notes || null,
    });
  }
  if (!rows.length) return { ok: false, error: "No accounts found in the CSV." };
  return { ok: true, rows, skipped };
}
