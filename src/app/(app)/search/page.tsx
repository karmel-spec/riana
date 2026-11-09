import Link from "next/link";
import { getViewer } from "@/lib/session";
import { searchBinder, type SearchHit } from "@/lib/search";
import { PageHeader, Empty } from "@/components/ui";

export const metadata = { title: "Search" };

/** Bolds the query inside a snippet. */
function Mark({ text, q }: { text: string; q: string }) {
  if (!text) return null;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded bg-brass-tint px-0.5 text-ink">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const v = await getViewer();
  const { q = "" } = await searchParams;
  const query = q.trim();
  const hits = query ? await searchBinder(v, query) : [];

  const groups = new Map<string, SearchHit[]>();
  for (const h of hits) groups.set(h.group, [...(groups.get(h.group) ?? []), h]);

  return (
    <>
      <PageHeader eyebrow="Search" title={query ? `Results for “${query}”` : "Search the binder"}
        intro={query ? `${hits.length} match${hits.length === 1 ? "" : "es"} across ${groups.size} section${groups.size === 1 ? "" : "s"}. Only the sections you can see are searched.` : "Type a name, a company, a medication, an address or any word, and every section you can see is searched at once."} />

      <form action="/search" role="search" className="mb-7 flex max-w-[640px] gap-3">
        <input type="search" name="q" defaultValue={query} placeholder="Search names, accounts, medications, documents…" autoFocus={!query}
          className="min-h-[48px] flex-1 rounded-xl border border-rule bg-paper px-4 text-[1.05rem]" aria-label="Search the binder" />
        <button className="btn-primary min-h-[48px]">Search</button>
      </form>

      {query.length > 0 && query.length < 2 && <Empty>Type at least two letters.</Empty>}
      {query.length >= 2 && hits.length === 0 && <Empty>Nothing matched “{query}”. Try a shorter word, a last name, or a company name.</Empty>}

      <div className="flex flex-col gap-5">
        {[...groups.entries()].map(([group, list]) => (
          <section key={group} className="card">
            <h2 className="mb-3 text-[1.25rem] font-semibold">{group} <span className="text-[0.95rem] font-normal text-ink-soft">{list.length}</span></h2>
            <ul className="divide-y divide-rule-soft">
              {list.map((h, i) => (
                <li key={i} className="py-3 first:pt-0 last:pb-0">
                  <Link href={h.href} className="font-semibold text-evergreen"><Mark text={h.title} q={query} /></Link>
                  {h.detail && <div className="text-[0.9rem] text-ink-soft">{h.detail}</div>}
                  {h.matched && <div className="mt-0.5 text-[0.95rem]"><Mark text={h.matched} q={query} /></div>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
