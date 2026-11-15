import Link from "next/link";
import type { Person } from "@/lib/types";
import { Mail, Sparkle } from "@/components/icons";

/** The contact that holds Riana's address. Kept in Contacts, never in the code, so it can be changed there. */
export const RIANA_CONTACT = "Agent Riana";
export const findRiana = (people: Person[]) => people.find((p) => p.full_name.trim().toLowerCase() === RIANA_CONTACT.toLowerCase()) ?? null;

/**
 * "Agent Riana" on the home page: who she is and how to reach her.
 * `big` is the Brief view. `pending` and `canReview` add the admin's review link. `vaultHref` links "password vault" to the Passwords page for people who may open it.
 * `pageHref` adds a link to Riana's own page (left off on that page itself).
 */
export function AgentRiana({ riana, big = false, pending = 0, canReview = false, vaultHref, pageHref }: { riana: Person | null; big?: boolean; pending?: number; canReview?: boolean; vaultHref?: string; pageHref?: string }) {
  const sms = riana?.phone ? riana.phone.replace(/[^\d+]/g, "") : null;
  return (
    <section aria-labelledby="agent-riana" className={`card flex flex-col gap-3 ${big ? "mb-6" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-plum-tint text-plum"><Sparkle size={26} /></div>
        <div>
          <h2 id="agent-riana" className={`font-semibold leading-tight ${big ? "text-[1.6rem]" : "text-[1.35rem]"}`}>Agent Riana</h2>
          <div className="text-ink-soft">The family’s assistant</div>
        </div>
        {pageHref && <Link href={pageHref} className="ml-auto shrink-0 font-bold text-evergreen">About Riana</Link>}
      </div>
      <p className={big ? "text-[1.1rem]" : ""}>
        {big
          ? "Riana can answer a question or write down something new for the family. Send her an email, the same as you would to one of the kids."
          : "Riana is the family’s Grok Bot assistant. Email her a question or a new fact. Nothing she proposes changes the binder until Karmel or Heather approves it."}
      </p>
      {riana?.email ? (
        <div className="flex flex-wrap items-center gap-3">
          <a href={`mailto:${riana.email}`} className={`btn-primary no-underline ${big ? "min-h-[60px] px-6 text-[1.2rem]" : ""}`}><Mail size={big ? 24 : 20} /> Email Riana</a>
          {sms && <a href={`sms:${sms}`} className={`btn-secondary no-underline ${big ? "min-h-[60px] px-6 text-[1.2rem]" : ""}`}>Text Riana</a>}
          <a href={`mailto:${riana.email}`} className={`min-w-0 break-all font-semibold text-evergreen ${big ? "text-[1.15rem]" : ""}`}>{riana.email}</a>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-rule px-4 py-3 text-ink-soft">
          Riana’s email address isn’t saved yet. Add a contact named “{RIANA_CONTACT}” with her email on the <Link href="/contacts" className="font-semibold text-evergreen">Contacts</Link> page and it will show here.
        </p>
      )}
      <p className="text-[0.9rem] text-ink-soft">Please don’t send passwords, Social Security numbers or full account numbers. Those stay in the {vaultHref ? <Link href={vaultHref} className="font-semibold text-evergreen underline">password vault</Link> : "password vault"}.</p>
      {canReview && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule-soft pt-3">
          <span>{pending > 0 ? <><strong>{pending} update{pending === 1 ? "" : "s"} from Riana</strong> waiting for your approval.</> : "No updates from Riana are waiting."}</span>
          <Link href="/admin/riana" className="font-bold text-evergreen">{pending > 0 ? "Review" : "Open the inbox"}</Link>
        </div>
      )}
    </section>
  );
}
