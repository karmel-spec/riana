"use client";

import { useMemo, useState } from "react";
import { Lock } from "@/components/icons";

export type BinderPage = { id: string; name: string; web_view_link: string | null; note: string; section: string; taken_at: string | null; vault: boolean; media_kind: string };
export type BinderTab = { key: string; blurb: string; color: string; pages: BinderPage[] };

const thumb = (u: string | null) => (u ?? "").replace(/=w\d+$/, "=w480");

export function Binder({ tabs, albumUrl }: { tabs: BinderTab[]; albumUrl: string }) {
  const [current, setCurrent] = useState(tabs.find((t) => t.key !== "Album")?.key ?? tabs[0]?.key ?? "");
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const hits = useMemo(() => (query ? tabs.flatMap((t) => t.pages.filter((p) => `${p.name} ${p.note}`.toLowerCase().includes(query)).map((p) => ({ ...p, tab: t.key }))) : []), [tabs, query]);
  const tab = tabs.find((t) => t.key === current) ?? tabs[0];
  if (!tab) return null;

  return (
    <div>
      <label className="mb-4 flex min-h-[44px] items-center gap-2 rounded-xl border border-rule bg-paper px-3 focus-within:border-evergreen">
        <span aria-hidden>🔍</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inside the book… (“Navy Federal”, “DD-214”, “Odd Fellows”)" aria-label="Search the Widow Book" className="min-w-0 flex-1 bg-transparent py-2 focus:outline-none" />
      </label>
      {query ? (
        <div className="card">
          <h2 className="text-[1.2rem] font-semibold">{hits.length} {hits.length === 1 ? "page matches" : "pages match"} “{q.trim()}”</h2>
          {hits.length === 0 ? <p className="mt-2 text-ink-soft">Nothing in the book mentions that. Try a shorter word.</p> : (
            <ul className="mt-2 divide-y divide-rule-soft">
              {hits.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="min-w-0"><span className="pill mr-2 bg-parchment text-ink-soft">{p.tab}</span><span className="font-semibold">{p.name.replace(/\.(pdf|jpe?g|png|heic)$/i, "")}</span>{p.note && <div className="text-[0.9rem] text-ink-soft">{p.note}</div>}</div>
                  <PageOpen p={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-2xl border border-rule bg-paper md:grid-cols-[230px_1fr]">
          <nav aria-label="Binder tabs" className="border-b border-rule-soft bg-paper-warm py-2 md:border-b-0 md:border-r">
            <ul className="flex overflow-x-auto md:flex-col">
              {tabs.map((t) => {
                const on = t.key === tab.key;
                return (
                  <li key={t.key} className="shrink-0">
                    <button type="button" onClick={() => setCurrent(t.key)} aria-current={on ? "page" : undefined}
                      className={`flex min-h-[46px] w-full items-center justify-between gap-3 whitespace-nowrap border-l-8 py-2 pl-4 pr-4 text-left font-semibold ${on ? "bg-paper text-ink" : "text-ink-soft hover:bg-paper"}`} style={{ borderLeftColor: t.color }}>
                      <span className="flex items-center gap-2">{t.key === "Vault" && <Lock size={16} />}{t.key}</span>
                      <span className="text-[0.85rem] font-semibold text-ink-soft">{t.pages.length}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <section className="min-w-0 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="text-[1.4rem] font-semibold">{tab.key}</h2><p className="text-[0.95rem] text-ink-soft">{tab.blurb}</p></div>
              {tab.key === "Album" && <a href={albumUrl} target="_blank" rel="noreferrer" className="btn-secondary px-4 text-[0.95rem]">Open the album ↗</a>}
            </div>
            {tab.key === "Album" ? (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {tab.pages.map((p, n) => (
                  <li key={p.id} className="overflow-hidden rounded-xl border border-rule-soft bg-paper">
                    <a href={p.web_view_link ?? albumUrl} target="_blank" rel="noreferrer" className="block no-underline">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb(p.web_view_link)} alt={`Widow Book page ${n + 1}`} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                    </a>
                    <div className="px-2 py-1 text-[0.8rem] text-ink-soft">Page {n + 1}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {tab.pages.map((p, n) => (
                  <li key={p.id} className={`relative flex min-h-[150px] flex-col rounded-xl border p-3 text-[0.85rem] shadow-sm ${p.vault ? "border-ember/40 bg-ember-tint" : "border-rule bg-white"}`}>
                    <div className="font-semibold leading-snug text-ink">{p.name.replace(/\.(pdf|jpe?g|png|heic|docx?)$/i, "")}</div>
                    {p.note && <div className="mt-1 line-clamp-4 text-ink-soft">{p.note}</div>}
                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      {p.vault ? <span className="flex items-center gap-1 text-[0.75rem] font-bold uppercase tracking-wide text-ember"><Lock size={12} /> vault only</span> : <span className="text-[0.75rem] text-ink-soft">{p.taken_at ? p.taken_at.slice(0, 10) : ""}</span>}
                      <PageOpen p={p} />
                    </div>
                    <span className="absolute right-2 top-2 text-[0.7rem] text-ink-soft">{n + 1}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PageOpen({ p }: { p: BinderPage }) {
  return <a href={`/files/${p.id}`} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1 text-[0.85rem]">Open ↗</a>;
}
