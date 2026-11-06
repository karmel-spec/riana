// =============================================================================
// Turn the plain text of a Riana Google Doc into proposed binder updates.
//
// Pure and dependency-free so it can be unit tested (node --test). The doc
// has no fixed template; the rules below are forgiving:
//
//   * A HEADING is a short line with no bullet marker that is either
//     markdown-style ("# Appointments"), ALL CAPS, Title Case ending in ":",
//     or a line that is only a known section word ("Bills", "Lab results").
//   * The first line, when it comes before any heading and is short, is the
//     doc's title and is skipped.
//   * Every other non-empty line is an ITEM under the current heading.
//     Bullet markers (-, *, •, 1., 1)) are stripped. Lines shorter than
//     MIN_ITEM characters are ignored (stray punctuation, "n/a").
//   * The item's KIND comes from the heading's words, else from the line
//     itself, else "note". Kinds are the ones riana_updates accepts.
//   * Each item gets a stable ref: gdoc:<doc id>:<hash(heading | line)>, so
//     a re-sync skips lines already proposed, and edits to a line produce a
//     fresh proposal (the old one keeps its review decision).
// =============================================================================

export type ProposalKind = "appointment" | "lab_result" | "bill" | "urgent_question" | "document" | "note";

export type Proposal = {
  external_ref: string;
  kind: ProposalKind;
  summary: string;
  payload: {
    heading: string | null;
    line: string;
    line_no: number;
    date?: string;            // ISO date if one was found in the line
    doc: { id: string; name: string; modified_at: string | null; link: string | null };
  };
};

export type ParsedDoc = { headings: string[]; proposals: Proposal[]; skipped: number };

const MIN_ITEM = 8;
const MAX_SUMMARY = 500;
const MAX_ITEMS = 200;

const KIND_WORDS: [RegExp, ProposalKind][] = [
  [/\b(appointments?|appts?|visits?|calendar|schedules?|follow[- ]?ups?|surgery|procedures?)\b/i, "appointment"],
  [/\b(labs?|a1c|blood|results?|cholesterol|glucose|bp|blood pressure|vitals)\b/i, "lab_result"],
  [/\b(bills?|payments?|invoices?|due|autopay|premiums?|statements?)\b/i, "bill"],
  [/\b(questions?|ask|decide|decisions?|unknown)\b/i, "urgent_question"],
  [/\b(documents?|paperwork|forms?|will|trust|deeds?|policy|policies|letters?|scans?)\b/i, "document"],
];

const BULLET = /^\s*(?:[-*•◦▪]|\d{1,3}[.)]|[a-z][.)])\s+/i;

export function kindFor(heading: string | null, line: string): ProposalKind {
  for (const [re, kind] of KIND_WORDS) if (heading && re.test(heading)) return kind;
  for (const [re, kind] of KIND_WORDS) if (re.test(line)) return kind;
  return "note";
}

export function isHeading(raw: string): boolean {
  const s = raw.trim();
  if (!s || BULLET.test(raw)) return false;
  if (/^#{1,6}\s+\S/.test(s)) return true;
  if (s.length > 60) return false;
  if (/^[A-Z0-9][A-Z0-9 &/'’\-]+:?$/.test(s) && /[A-Z]/.test(s)) return true;                 // ALL CAPS
  if (/^[A-Z][^.!?]{1,58}:$/.test(s)) return true;                                           // Title ending in colon
  if (/^(appointments?|calendar|labs?|lab results?|bills?|payments?|questions?|urgent questions?|documents?|notes?|updates?|health|money|legal|to[- ]?do|this week|next week|follow[- ]?ups?)$/i.test(s)) return true;
  // "Questions for Mom and Dad", "Appointments this month": a short title that starts
  // with a section word and has no sentence punctuation.
  if (s.length <= 40 && !/[.!?,;$]/.test(s) && !/\d/.test(s)
      && /^(appointments?|calendar|labs?|lab results?|bills?|payments?|questions?|documents?|notes?|updates?|follow[- ]?ups?|to[- ]?do)\b/i.test(s)) return true;
  return false;
}

export function cleanHeading(raw: string): string {
  return raw.trim().replace(/^#{1,6}\s+/, "").replace(/:$/, "").trim();
}

/** First date-like thing in the line, as YYYY-MM-DD, or undefined. Year defaults to the doc's year. */
export function findDate(line: string, docModified: string | null): string | undefined {
  const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(line);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = /\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}|\d{2}))?\b/.exec(line);
  const baseYear = docModified ? new Date(docModified).getUTCFullYear() : new Date().getUTCFullYear();
  if (us) {
    const y = us[3] ? (us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3])) : baseYear;
    return `${y}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const named = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/i.exec(line);
  if (named) {
    const m = months.indexOf(named[1].slice(0, 3).toLowerCase()) + 1;
    const y = named[3] ? Number(named[3]) : baseYear;
    return `${y}-${String(m).padStart(2, "0")}-${named[2].padStart(2, "0")}`;
  }
  return undefined;
}

/** Small stable hash (FNV-1a, 52 bits as 13 hex chars). Not security; just a stable id. */
export function stableHash(s: string): string {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).slice(0, 13);
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export function parseDoc(text: string, doc: { id: string; name: string; modified_at: string | null; link: string | null }): ParsedDoc {
  const headings: string[] = [];
  const proposals: Proposal[] = [];
  const seen = new Set<string>();
  let heading: string | null = null;
  let skipped = 0;
  let sawText = false;

  const lines = text.replace(/\r\n?/g, "\n").replace(/ /g, " ").split("\n");
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    if (isHeading(raw)) { heading = cleanHeading(raw); headings.push(heading); sawText = true; return; }
    // The doc's title: the first line, before any heading, not a bullet, short.
    if (!sawText && heading === null && !BULLET.test(raw) && line.length <= 80) { sawText = true; skipped++; return; }
    sawText = true;
    const item = line.replace(BULLET, "").trim();
    if (item.length < MIN_ITEM) { skipped++; return; }
    if (proposals.length >= MAX_ITEMS) { skipped++; return; }
    const ref = `gdoc:${doc.id}:${stableHash(`${normalize(heading ?? "")}|${normalize(item)}`)}`;
    if (seen.has(ref)) { skipped++; return; }
    seen.add(ref);
    const summary = (heading ? `${heading}: ${item}` : item).slice(0, MAX_SUMMARY);
    const date = findDate(item, doc.modified_at);
    proposals.push({
      external_ref: ref, kind: kindFor(heading, item), summary,
      payload: { heading, line: item, line_no: i + 1, ...(date ? { date } : {}), doc },
    });
  });
  return { headings, proposals, skipped };
}

/** Pull a Google Doc / Drive file id out of a pasted link, or return the input if it already looks like an id. */
export function driveIdFromLink(input: string): string | null {
  const s = input.trim();
  const m = /\/d\/([A-Za-z0-9_-]{10,})/.exec(s) ?? /[?&]id=([A-Za-z0-9_-]{10,})/.exec(s);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  return null;
}
