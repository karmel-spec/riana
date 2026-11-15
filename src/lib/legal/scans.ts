// Matches a Legal-board document to its digital copy among the filed scans, by the words in its title.
// Deliberately strict: a wrong link on a will is worse than no link.

export type ScanDoc = { id: string; title: string; principal: string; doc_type: string; status: string };
export type ScanFile = { id: string; name: string; target_note: string | null };

/** Uploads made from a Legal-board row carry this tag followed by the document's title, which makes them match it. */
export const LEGAL_COPY_TAG = "[Legal copy]";

const STOP = new Set(["the", "and", "of", "to", "on", "for", "with", "re", "my", "in", "a", "an", "naming", "form", "forms", "signed", "draft", "copy", "pdf", "jpg", "jpeg", "png"]);
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function words(s: string): string[] {
  return s.toLowerCase().replace(/&/g, " and ").replace(/\.com\b/g, " ").replace(/health ?care/g, "healthcare").replace(/\bpoas?\b/g, "power attorney")
    .replace(/\bpowers\b/g, "power").replace(/\brichard\b/g, "rich").replace(/[’']s\b/g, "").replace(/(\d),(\d)/g, "$1$2")
    .split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w));
}

/** The part of a title that names the kind of document: "Healthcare Directive" in "Healthcare Directive: Richard Arthur Greene". */
function headOf(title: string): { head: string; tail: string } {
  const parts = title.split(":");
  // "Diana: My Comfort and End-of-Life Wishes (…)" leads with the person, not the document.
  const lead = parts.length > 1 && /^(rich|richard|diana)$/i.test(parts[0].trim()) ? 1 : 0;
  const [head, ...paren] = parts[lead].split("(");
  return { head, tail: [...parts.slice(0, lead), ...parts.slice(lead + 1), ...paren].join(" ") };
}

/** A date written in a title, "May 24, 2026", as 2026-05-24. */
function titleDate(title: string): string | null {
  const m = /\b([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})\b/.exec(title);
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

function score(d: ScanDoc, f: ScanFile): number {
  const text = `${f.name} ${f.target_note ?? ""}`;
  const have = new Set(words(text));
  const { head, tail } = headOf(d.title);
  const headWords = [...new Set(words(head))];
  // Every word that names the kind of document must be there: "Addendum to the Last Will" is not the will.
  if (headWords.length === 0 || !headWords.every((w) => have.has(w))) return 0;
  // Rich's will is not Diana's.
  if (d.principal === "rich" && have.has("diana") && !have.has("rich")) return 0;
  if (d.principal === "diana" && have.has("rich") && !have.has("diana")) return 0;
  // A dated document only matches a copy of that date.
  const on = titleDate(d.title); const fileDates = text.match(/\d{4}-\d{2}-\d{2}/g);
  if (on && fileDates && !fileDates.includes(on)) return 0;
  // A name that only gives the month ("… 2026-11.jpg") must at least be the right month.
  const fileMonths = text.match(/\b\d{4}-\d{2}(?!-?\d)/g);
  if (on && !fileDates && fileMonths && !fileMonths.includes(on.slice(0, 7))) return 0;
  // Deeds are told apart by their numbers (street address, recording number).
  if (d.doc_type === "tod_deed" || d.doc_type === "easement") {
    const nums = words(d.title).filter((w) => /^\d{3,}[a-z]?$/.test(w));
    if (nums.length > 0 && !nums.some((n) => have.has(n))) return 0;
  }
  let s = headWords.length * 2 + [...new Set(words(tail))].filter((w) => have.has(w)).length;
  if (text.includes(LEGAL_COPY_TAG)) s += 5;
  if (/\b(signed|recorded|notarized)\b/i.test(text) && !/unsigned/i.test(text)) s += 1;
  if (["signed", "recorded"].includes(d.status) && /\b(draft|unsigned|loose|copies|page 1 only)\b/i.test(text)) s -= 1.5;
  // When a document was photographed page by page, open it at page 1.
  const page = /\bp\. ?(\d+)|\((\d+) of \d+\)/i.exec(text);
  if (page) s -= Number(page[1] ?? page[2]) * 0.01;
  return s;
}

/** The best digital copy for a document, or null when nothing is a confident match. */
export function scanFor<F extends ScanFile>(d: ScanDoc, files: F[]): F | null {
  let best: F | null = null; let top = 0;
  for (const f of files) { const s = score(d, f); if (s > top) { top = s; best = f; } }
  return best;
}

/** Document id → file id for every document that has a digital copy. */
export function scanMap(docs: ScanDoc[], files: ScanFile[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of docs) { const f = scanFor(d, files); if (f) out[d.id] = f.id; }
  return out;
}
