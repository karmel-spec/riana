import { redirect } from "next/navigation";
import { canRead, getViewer } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { AgentRiana, findRiana } from "@/components/dashboard/agent-riana";
import { AskRianaPanel } from "@/components/dashboard/ask-riana-panel";
import { canAskRiana } from "@/lib/riana/questions";

export const metadata = { title: "Riana" };

/** Riana's own page: who she is, how to reach her, and the chat. Rich, Diana and the super admins only. */
export default async function RianaChatPage() {
  const v = await getViewer();
  if (!canAskRiana(v)) redirect("/");
  const [people, pending] = await Promise.all([data.getPeople(v), data.getRianaPending(v)]);
  const admin = v.role === "super_admin";
  return (
    <>
      <PageHeader title="Riana" intro={v.brief ? "Ask Riana a question, or tell her something new." : "The family’s chat with Riana, and how to reach her."} />
      <div className="flex flex-col gap-6">
        <AskRianaPanel viewer={v} big={v.brief} admin={admin && !v.brief} />
        <AgentRiana riana={findRiana(people)} big={v.brief} pending={pending.length} canReview={admin && canRead(v, "admin")} vaultHref={canRead(v, "digital_accounts") ? "/passwords" : undefined} />
      </div>
    </>
  );
}
