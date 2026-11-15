// Turns web addresses written out in a note into short, tappable links.

export type Piece = { text: string } | { href: string; label: string };

const WEB_ADDRESS = /https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?]/g;

/** A short name for a link: what it is when we can tell, otherwise the site it goes to. */
export function linkLabel(href: string): string {
  let host = "";
  try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { return "Open link"; }
  if (/^(drive|docs)\.google\.com$/.test(host)) return /\/(document|spreadsheets|presentation)\//.test(href) ? "Open the Google doc" : /\/folders\//.test(href) ? "Open the Drive folder" : "Open the Drive file";
  if (/^photos\.(app\.goo\.gl|google\.com)$/.test(host)) return "Open the photo album";
  if (/(^|\.)google\.[a-z.]+$/.test(host) && /\/maps/.test(href) || host === "maps.app.goo.gl") return "Open the map";
  return host;
}

/**
 * Splits a note into plain text and links. A label written just before the address
 * ("Drive file: https://…") is dropped, since the link now says what it is.
 */
export function linkify(text: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(WEB_ADDRESS)) {
    const before = text.slice(last, m.index).replace(/(?:Drive file|Drive folder|Link|File|Album|Map|Website|URL)\s*:\s*$/i, "");
    if (before) out.push({ text: before });
    out.push({ href: m[0], label: linkLabel(m[0]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
