import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { ReviewButtons } from "./review-buttons";

export const metadata = { title: "Updates from Riana" };

export default async function RianaPage() {
  const v = await requireSuperAdmin();
  const pending = await data.getRianaPending(v);
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
                <div className="text-[0.9rem] text-ink-soft">Received {fmtDate(u.received_at)} at {fmtTime(u.received_at)}</div>
              </div>
              <ReviewButtons id={u.id} />
            </li>
          ))}
        </ul>
      )}
      <section className="card mt-8">
        <h2 className="text-[1.2rem] font-semibold">How Riana will connect</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
          <li><strong>Phase 1 — Drive sync.</strong> The app reads the Greene Family Binder Google Doc and the Legal Docs folder (read-only) and proposes changes here.</li>
          <li><strong>Phase 2 — Inbound endpoint (ready).</strong> Riana, a Grok or Claude assistant, or you pasting their output, posts structured updates to <code>/api/riana/inbound</code> with a key. Each one is logged and waits here for approval. Keys are minted and revoked by a super admin; see <code>docs/RIANA_INBOUND.md</code>.</li>
          <li><strong>Phase 3 — Outbound.</strong> A read-only, permission-scoped export Riana can read so her Monday update uses the latest data.</li>
        </ol>
      </section>
    </>
  );
}
