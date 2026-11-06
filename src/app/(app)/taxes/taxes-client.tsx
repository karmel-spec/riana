"use client";

import { useState, useTransition } from "react";
import type { TaxRecord, TaxSourceItem } from "@/lib/types";
import { setTaxSourceReceived } from "@/app/actions/property";
import { TaxEditor } from "../insurance/insurance-client";
import { fmtDate } from "@/lib/format";
import { SourceTag } from "@/components/ui";
import { Check, Phone, Mail } from "@/components/icons";

type Cpa = { id: string; name: string; phone: string | null; email: string | null };
type Ret = { id: string; name: string; web_view_link: string | null; size_bytes: number | null };
const KIND: Record<string, string> = { federal: "Federal return", state: "State return", property: "Property tax", exemption: "Exemption", other: "Other" };
const mask = (v: string | null) => (v ? `•••-••-${v}` : "—");

export function TaxYearCards({ years, taxes, returns, cpas }: { years: number[]; taxes: TaxRecord[]; returns: Ret[]; cpas: Cpa[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-4">
      {years.map((y) => {
        const rows = taxes.filter((t) => t.tax_year === y);
        const fed = rows.find((t) => t.kind === "federal");
        const pdf = returns.find((r) => new RegExp(`^${y}\\b`).test(r.name)) ?? null;
        const cpa = fed?.cpa_person_id ? cpas.find((c) => c.id === fed.cpa_person_id) : null;
        return (
          <li key={y} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[1.6rem] font-semibold leading-tight">{y}{fed?.amended && <span className="pill ml-3 bg-ember-tint text-ember">Amended ({fed.amended_form ?? "1040-X"})</span>}</h2>
                {fed && <div className="text-ink-soft">{fed.status}{fed.filed_on && ` · filed ${fmtDate(fed.filed_on, { year: "numeric" })}`}{fed.preparer && ` · ${fed.preparer}`}</div>}
              </div>
              {fed && <TaxEditor record={fed} cpas={cpas} />}
            </div>

            {fed && (
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-[0.95rem] sm:grid-cols-3">
                <div><dt className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Rich SSN</dt><dd className="font-mono">{mask(fed.ssn_last4_rich)}</dd></div>
                <div><dt className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Diana SSN</dt><dd className="font-mono">{mask(fed.ssn_last4_diana)}</dd></div>
                <div><dt className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Refund account</dt><dd className="font-mono">{fed.refund_bank_last4 ? `····${fed.refund_bank_last4}` : "—"}</dd></div>
              </dl>
            )}
            {fed?.notes && <p className="mt-2 text-[0.95rem] text-ink-soft">{fed.notes}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {pdf ? (
                <>
                  <button type="button" onClick={() => setOpen(open === pdf.id ? null : pdf.id)} className="btn-primary px-4 text-[0.95rem]">{open === pdf.id ? "Hide the return" : "View the return"}</button>
                  <a href={`/api/files/${pdf.id}?download=1`} className="btn-secondary px-4 text-[0.95rem]">Download (logged)</a>
                  {pdf.web_view_link && <a href={pdf.web_view_link} target="_blank" rel="noreferrer" className="text-[0.9rem] text-evergreen">Open in Drive</a>}
                </>
              ) : (
                <span className="rounded-xl bg-brass-tint px-3 py-1.5 text-[0.9rem] text-brass-deep">{fed ? "Return PDF not imported yet — run Drive Import, then approve the file." : "No federal return recorded for this year."}</span>
              )}
              {cpa && (
                <span className="flex flex-wrap items-center gap-3 text-[0.9rem]">
                  <span className="font-semibold">{cpa.name}</span>
                  {cpa.phone && <a href={`tel:${cpa.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 text-evergreen"><Phone size={14} /> {cpa.phone}</a>}
                  {cpa.email && <a href={`mailto:${cpa.email}`} className="flex items-center gap-1 text-evergreen"><Mail size={14} /> {cpa.email}</a>}
                </span>
              )}
            </div>

            {pdf && open === pdf.id && (
              <div className="mt-3 overflow-hidden rounded-xl border border-rule bg-paper-warm">
                <iframe title={`${y} federal return`} src={`/api/files/${pdf.id}#toolbar=0`} className="h-[70vh] w-full" />
                <p className="px-3 py-2 text-[0.85rem] text-ink-soft">This view was recorded in the audit log. The PDF shows the original document; the last-4 values above are what the binder keeps.</p>
              </div>
            )}

            {rows.filter((t) => t.kind !== "federal").length > 0 && (
              <ul className="mt-4 divide-y divide-rule-soft border-t border-rule-soft pt-2">
                {rows.filter((t) => t.kind !== "federal").map((t) => (
                  <li key={t.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-[0.95rem]">
                    <div><span className="font-semibold">{KIND[t.kind]}</span> <span className="text-ink-soft">· {t.status}{t.filed_on && ` · filed ${fmtDate(t.filed_on, { year: "numeric" })}`}</span>{t.notes && <div className="text-[0.9rem] text-ink-soft">{t.notes}</div>}<SourceTag source={t.source} /></div>
                    <TaxEditor record={t} cpas={cpas} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SourceChecklist({ items }: { items: TaxSourceItem[] }) {
  const [, start] = useTransition();
  const years = [...new Set(items.map((i) => i.tax_year))].sort((a, b) => b - a);
  if (items.length === 0) return <p className="text-ink-soft">Nothing listed yet.</p>;
  return (
    <div className="flex flex-col gap-4">
      {years.map((y) => {
        const list = items.filter((i) => i.tax_year === y);
        const got = list.filter((i) => i.received).length;
        return (
          <div key={y}>
            <div className="mb-1 flex items-center justify-between"><h3 className="font-sans text-[1rem] font-bold text-brass-deep">Tax year {y}</h3><span className="text-[0.9rem] text-ink-soft">{got} of {list.length} received</span></div>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-rule-soft"><div className="h-2 bg-evergreen" style={{ width: `${(got / list.length) * 100}%` }} /></div>
            <ul className="divide-y divide-rule-soft">
              {list.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <label className="flex min-h-[44px] items-center gap-3">
                    <input type="checkbox" checked={i.received} onChange={(e) => start(() => { setTaxSourceReceived(i.id, e.target.checked); })} className="h-5 w-5 accent-evergreen" />
                    <span><span className="font-semibold">{i.label}</span>{i.received && i.received_on && <span className="ml-2 text-[0.85rem] text-evergreen"><Check size={12} className="inline" /> {fmtDate(i.received_on)}</span>}
                      <div className="text-[0.85rem] text-ink-soft">{i.provider}{i.where_to_find && ` · ${i.where_to_find}`}{i.vault_item && <> · login: <span className="font-mono">{i.vault_item}</span></>}{i.notes && ` · ${i.notes}`}</div></span>
                  </label>
                  {i.portal_url && <a href={i.portal_url} target="_blank" rel="noreferrer" className="btn-secondary px-3 text-[0.85rem]">Open portal</a>}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
