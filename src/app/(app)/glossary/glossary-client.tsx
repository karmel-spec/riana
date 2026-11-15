"use client";

import { useState } from "react";
import { Search } from "@/components/icons";
import { CollapsibleCard, Empty } from "@/components/ui";
import { COMPARISONS, TERM_GROUPS, haystack } from "@/lib/legal/glossary";
import { DOCUMENT_KINDS } from "@/lib/legal/explainers";

/** The whole glossary with one search box over it. Typing narrows every section at once. */
export function Glossary({ big }: { big: boolean }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const hit = (text: string) => !needle || text.includes(needle);

  const comparisons = COMPARISONS.filter((c) => hit(haystack(c.title, c.intro, c.bottomLine, ...c.rows.flatMap((r) => [r.name, r.text]))));
  const documents = DOCUMENT_KINDS.filter((e) => hit(haystack(e.kind, e.what, e.why, ...e.lookFor)));
  const groups = TERM_GROUPS.map((g) => ({ ...g, terms: g.terms.filter((t) => hit(haystack(t.term, t.also, t.def))).sort((a, b) => a.term.localeCompare(b.term)) })).filter((g) => g.terms.length > 0);
  const nothing = comparisons.length + documents.length + groups.length === 0;
  const body = big ? "text-[1.15rem]" : "";

  return (
    <div className={`flex flex-col gap-6 ${body}`}>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-rule bg-paper px-3">
          <Search size={20} className="text-ink-soft" />
          <span className="sr-only">Search the glossary</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a word: probate, notarized, trustee…" className="min-h-[48px] w-full bg-transparent outline-none" />
        </label>
        {!needle && (
          <nav aria-label="Sections" className="flex flex-wrap gap-2 text-[0.95rem]">
            <a href="#confused" className="pill border border-rule bg-paper px-3 text-ink-soft">Often confused</a>
            <a href="#documents" className="pill border border-rule bg-paper px-3 text-ink-soft">The documents</a>
            {TERM_GROUPS.map((g) => <a key={g.id} href={`#${g.id}`} className="pill border border-rule bg-paper px-3 text-ink-soft">{g.title}</a>)}
          </nav>
        )}
      </div>

      {nothing && <Empty>No entry matches “{q}”. Try a shorter word.</Empty>}

      {comparisons.length > 0 && (
        <CollapsibleCard id="confused" title="Often confused" count={comparisons.length}>
          <div className="flex flex-col gap-6">
            {comparisons.map((c) => (
              <section key={c.id} id={c.id} className="scroll-mt-4">
                <h3 className="font-serif text-[1.3rem] font-semibold">{c.title}</h3>
                <p className="mt-1 text-ink-soft">{c.intro}</p>
                <dl className="mt-3 grid gap-2 md:grid-cols-2">
                  {c.rows.map((r) => (
                    <div key={r.name} className="rounded-xl border border-rule-soft bg-paper px-4 py-3">
                      <dt className="font-semibold text-evergreen">{r.name}</dt>
                      <dd className="mt-1">{r.text}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 rounded-xl bg-parchment px-4 py-3"><strong>The short version.</strong> {c.bottomLine}</p>
              </section>
            ))}
          </div>
        </CollapsibleCard>
      )}

      {documents.length > 0 && (
        <CollapsibleCard id="documents" title="The legal documents" count={documents.length}>
          <p className="text-ink-soft">What each kind of document is, why an estate plan needs it, and what to check. The Legal board shows where this family’s own copy of each one stands.</p>
          <dl className="flex flex-col divide-y divide-rule-soft">
            {documents.map((e) => (
              <div key={e.kind} className="py-4 first:pt-0 last:pb-0">
                <dt className="font-serif text-[1.2rem] font-semibold">{e.kind}</dt>
                <dd className="mt-1"><strong>What it is.</strong> {e.what}</dd>
                <dd className="mt-1"><strong>Why it matters.</strong> {e.why}</dd>
                <dd className="mt-2"><span className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-soft">Check</span>
                  <ul className="mt-1 list-disc pl-5">{e.lookFor.map((x) => <li key={x}>{x}</li>)}</ul>
                </dd>
              </div>
            ))}
          </dl>
        </CollapsibleCard>
      )}

      {groups.map((g) => (
        <CollapsibleCard key={g.id} id={g.id} title={g.title} count={g.terms.length}>
          <p className="text-ink-soft">{g.blurb}</p>
          <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {g.terms.map((t) => (
              <div key={t.term}>
                <dt className="font-semibold">{t.term}{t.also && <span className="font-normal text-ink-soft"> · also: {t.also}</span>}</dt>
                <dd className="mt-0.5">{t.def}</dd>
              </div>
            ))}
          </dl>
        </CollapsibleCard>
      ))}
    </div>
  );
}
