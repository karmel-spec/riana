import Link from "next/link";
import { getViewer, canRead } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader, SectionCard } from "@/components/ui";
import { AgentRiana, findRiana } from "@/components/dashboard/agent-riana";

export const metadata = { title: "Agent Riana" };

/** Riana's own page: the same card as the dashboard, plus how her updates reach the binder. */
export default async function AgentRianaPage() {
  const v = await getViewer();
  const [people, pending] = await Promise.all([data.getPeople(v), data.getRianaPending(v)]);
  const parent = v.brief;
  const admin = canRead(v, "admin");
  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "The family’s assistant"} title="Agent Riana"
        intro={parent ? "How to reach Riana, and what happens with what you tell her." : "How to reach Riana, what to send her, and how anything she proposes gets into the binder."}
        actions={admin && !parent ? <><Link href="/admin/riana" className="btn-secondary">Updates from Riana →</Link><Link href="/admin/import" className="btn-secondary">Drive import →</Link></> : undefined} />

      <AgentRiana riana={findRiana(people)} big={parent} pending={pending.length} canReview={admin && !parent}
        vaultHref={canRead(v, "digital_accounts") ? "/passwords" : undefined} />

      <div className={`grid gap-6 lg:grid-cols-2 ${parent ? "text-[1.1rem]" : "mt-6"}`}>
        <SectionCard title="What to send her">
          <ul className="list-disc space-y-2 pl-5">
            <li>A question about something in the binder.</li>
            <li>A new fact: an appointment, a new doctor, a change of address or phone number.</li>
            <li>Someone who should be added to the contacts.</li>
          </ul>
          <p className="text-[0.9rem] text-ink-soft">Leave out passwords, Social Security numbers and full account numbers.</p>
        </SectionCard>

        <SectionCard title="What happens next">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Riana writes up what you sent as a proposed update.</li>
            <li>It waits in an inbox. Nothing changes in the binder yet.</li>
            <li>Karmel or Heather reads it and approves or rejects it.</li>
            <li>Approved updates are labeled “via Riana” and can be reverted.</li>
          </ol>
        </SectionCard>
      </div>
    </>
  );
}
