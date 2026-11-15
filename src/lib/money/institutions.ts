import type { Account } from "@/lib/types";

/** Groups accounts by the institution that holds them, so one card covers every account at Foothills, Navy Federal, and so on. */
export type Institution = { key: string; name: string; accounts: Account[]; terms: string[] };

const ALIASES: Record<string, string[]> = {
  "navy federal": ["navy federal", "nfcu", "navyfederal"],
  "foothills": ["foothills", "glacier"],
  "twin star": ["twin star", "twinstar"],
  "athene": ["athene"],
  "social security": ["social security", "ssa ", "ssa-", "ssa_", "ss benefit", "cola notice"],
  "chase": ["chase"],
  "pension": ["pension"],
  "brokerage": [],
};
const STOP = new Set(["bank", "credit", "union", "administration", "federal", "the", "and", "life", "co", "inc", "to", "find", "annuity"]);

/** Canonical key: the first name before any "/" or "(", lower-cased, with alias families collapsed. */
export function institutionKey(name: string): string {
  const base = name.split(/\s*[/(]/)[0].trim().toLowerCase();
  for (const k of Object.keys(ALIASES)) if (base.includes(k)) return k;
  return base;
}

export function groupByInstitution(accounts: Account[]): Institution[] {
  const out: Institution[] = [];
  for (const a of accounts) {
    const key = institutionKey(a.institution);
    let g = out.find((x) => x.key === key);
    if (!g) {
      const alias = ALIASES[key];
      const words = key.split(/\s+/).filter((w) => w.length >= 4 && !STOP.has(w));
      g = { key, name: a.institution.split(/\s*\(/)[0].trim(), accounts: [], terms: alias ?? [key, ...words] };
      out.push(g);
    } else if (a.institution.length > g.name.length && /\//.test(a.institution)) g.name = a.institution.split(/\s*\(/)[0].trim();
    g.accounts.push(a);
  }
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

/** Does a filed document belong to this institution? Matched on the file name and its note, plus an explicit "[Accounts · name]" tag. */
export function fileMatches(g: Institution, f: { name: string; target_note: string | null }): boolean {
  const text = `${f.name} ${f.target_note ?? ""}`.toLowerCase();
  if (text.includes(`[accounts · ${g.key}`)) return true;
  if (g.terms.length === 0) return false;
  return g.terms.some((t) => text.includes(t));
}
