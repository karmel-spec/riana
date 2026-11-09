import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalDocument } from "@/lib/types";

/** What the linker can point at: filed Drive pages (by name/note) and Legal board records (by title). */
export type DocContext = { files: { name: string; target_note: string | null; web_view_link: string | null }[]; legal: LegalDocument[] };

type Rule = { re: RegExp; href: (ctx: DocContext) => string | null };
const file = (ctx: DocContext, re: RegExp) => ctx.files.find((f) => re.test(`${f.name} ${f.target_note ?? ""}`))?.web_view_link ?? null;
const legal = (ctx: DocContext, re: RegExp) => (ctx.legal.some((d) => re.test(d.title)) ? "/legal" : null);

/** Phrases that name a document, and where its original (or its record) lives. First match wins. */
const RULES: Rule[] = [
  { re: /DD-?214/i, href: (c) => file(c, /DD-?214/i) ?? legal(c, /DD-214/i) },
  { re: /Directive to Personal Representative/i, href: (c) => file(c, /Directive to Personal Rep/i) ?? legal(c, /Directive to Personal Representative/i) },
  { re: /Healthcare Directive/i, href: (c) => file(c, /Healthcare Directive/i) ?? legal(c, /Healthcare Directive/i) },
  { re: /(?:2021 |signed |his |her |the )?wills?\b(?! says)/i, href: (c) => legal(c, /Last Will/i) },
  { re: /rating decision letter/i, href: () => "/health/rich" },
  { re: /endowment care agreement/i, href: (c) => file(c, /endowment care/i) },
  { re: /opening\/closing(?: prepaid)?/i, href: (c) => file(c, /pre-need|open-close|opening/i) },
  { re: /headstone(?: invoice)?(?: plus setting)?/i, href: (c) => file(c, /headstone/i) },
  { re: /TOD deeds?|transfer-on-death deeds?/i, href: (c) => legal(c, /TOD Deed/i) },
  { re: /Codicil/i, href: (c) => legal(c, /Codicil/i) },
  { re: /Emergency Medical Summary/i, href: (c) => legal(c, /Emergency Medical Summary/i) },
  { re: /Widow Book/i, href: () => "/sources/widow-book" },
  { re: /Funeral & Burial folder/i, href: () => "/burial#documents" },
  { re: /StarLar(?: app)?/, href: () => "/starlar" },
  { re: /in the safe/i, href: () => "/safe" },
  { re: /1Password/, href: () => "/passwords" },
];

/** Renders text with every recognized document name linked to its original. Plain text when nothing matches. */
export function Linked({ text, ctx, className }: { text: string; ctx: DocContext; className?: string }) {
  const out: ReactNode[] = [];
  let rest = text; let k = 0;
  while (rest.length > 0) {
    let best: { index: number; len: number; href: string } | null = null;
    for (const r of RULES) {
      const m = r.re.exec(rest);
      if (!m) continue;
      const href = r.href(ctx);
      if (!href) continue;
      if (!best || m.index < best.index) best = { index: m.index, len: m[0].length, href };
    }
    if (!best) { out.push(rest); break; }
    if (best.index > 0) out.push(rest.slice(0, best.index));
    const label = rest.slice(best.index, best.index + best.len);
    out.push(best.href.startsWith("http")
      ? <a key={k++} href={best.href} target="_blank" rel="noreferrer" className="font-semibold text-evergreen underline decoration-evergreen/40 underline-offset-2">{label} ↗</a>
      : <Link key={k++} href={best.href} className="font-semibold text-evergreen underline decoration-evergreen/40 underline-offset-2">{label}</Link>);
    rest = rest.slice(best.index + best.len);
  }
  return <span className={className}>{out}</span>;
}
