import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { NAV } from "@/lib/nav";
import { ProposeContacts, ReviewButtons } from "./review-buttons";
import { DocSyncPanel } from "./doc-sync-panel";
import { driveSetup } from "@/lib/drive/service";
import { listDocSources } from "@/lib/riana/doc-sync";

export const metadata = { title: "Updates from Riana" };

export default async function RianaPage() {
  const v = await requireSuperAdmin();
  const [pending, keys, docs] = await Promise.all([data.getRianaPending(v), data.getRianaKeys(v), listDocSources(v)]);
  const setup = driveSetup(v);
  const sectionLabel = (s: string) => NAV.find((n) => n.section === s)?.label ?? s;
  return (
    <>
      <PageHeader eyebrow="Riana integration" title="Updates from Riana"
        intro="Anything Riana sends lands here first. Nothing touches the binder until one of you approves it, and everything approved is labeled “via Riana” and can be reverted." />
      {pending.length === 0 ? <Empty>Inbox is empty.</Empty> : (
        <ul className="flex flex-col gap-3">
          {pending.map((u) => (
            <li key={u.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="pill bg-plum-tint text-plum">{u.kind.replace("_", " ")}</span>
                <div className="mt-1 text-[1.1rem] font-semibold">{u.summary}</div>
                {u.kind === "contact" && u.payload && <div className="text-[0.95rem] text-ink-soft">{[u.payload.relationship, u.payload.phone, u.payload.email, [u.payload.city, u.payload.region].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}{u.payload.is_professional ? " · professional" : ""}{u.payload.notify_first ? " · tell first" : ""} → approving adds them to People (unconfirmed, via Riana)</div>}
                {u.kind === "album" && u.payload && <div className="text-[0.95rem] text-ink-soft">{String(u.payload.url ?? "")} → approving saves the link under Family History</div>}
                <div className="text-[0.9rem] text-ink-soft">Received {fmtDate(u.received_at)} at {fmtTime(u.received_at)}{u.external_ref?.startsWith("gdoc:") ? " · from the Binder doc" : ""}</div>
              </div>
              <ReviewButtons id={u.id} />
            </li>
          ))}
        </ul>
      )}
      <DocSyncPanel setup={setup} sources={docs} />
      <section className="card mt-8">
        <h2 className="text-[1.2rem] font-semibold">Propose Who-to-Notify additions</h2>
        <p className="mt-1 text-ink-soft">Type or paste the binder&rsquo;s additions, one person per line. Each becomes an item in the inbox above to approve or reject; nothing reaches People until approved. The names live only in the database.</p>
        <ProposeContacts />
      </section>
      <section className="card mt-8">
        <h2 className="text-[1.2rem] font-semibold">Agent keys</h2>
        <p className="mt-1 text-ink-soft">Each assistant gets its own key. Every key can send updates here. What a key may <em>read</em> through the export is chosen per key, and nothing lets an agent read logins, documents, or family history. Mint, revoke, and change read access from the SQL editor; see <code>docs/RIANA_INBOUND.md</code>.</p>
        {keys.length === 0 ? <p className="mt-3 text-ink-soft">No keys yet.</p> : (
          <ul className="mt-3 divide-y divide-line">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                <div>
                  <span className="font-semibold">{k.label}</span>
                  {k.revoked_at && <span className="pill ml-2 bg-ember-tint text-ember">revoked {fmtDate(k.revoked_at)}</span>}
                  <div className="text-[0.9rem] text-ink-soft">
                    Reads: {k.read_sections.length === 0 ? "nothing" : k.read_sections.map(sectionLabel).join(", ")}
                  </div>
                </div>
                <div className="text-[0.9rem] text-ink-soft">
                  {k.use_count} {k.use_count === 1 ? "call" : "calls"}{k.last_used_at ? `, last ${fmtDate(k.last_used_at)} ${fmtTime(k.last_used_at)}` : ", never used"} · added {fmtDate(k.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card mt-8">
        <h2 className="text-[1.2rem] font-semibold">How Riana connects</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
          <li><strong>Phase 1 — Drive sync (ready).</strong> The app reads the Greene Family Binder Google Doc (above) and proposes each new line here. The Legal Docs folder and the other shared folders are handled by <strong>Drive import</strong>, which files documents for review.</li>
          <li><strong>Phase 2 — Inbound endpoint (ready).</strong> Riana, a Grok or Claude assistant, or you pasting their output, posts structured updates to <code>/api/riana/inbound</code> with a key. Each one is logged and waits here for approval. Keys are minted and revoked by a super admin; see <code>docs/RIANA_INBOUND.md</code>.</li>
          <li><strong>Phase 3 — Outbound export (ready).</strong> <code>GET /api/riana/export</code> returns the latest data for the sections a key has been granted, so Riana&rsquo;s Monday update uses what is actually in the binder. Every export is in the audit log.</li>
        </ol>
      </section>
    </>
  );
}
