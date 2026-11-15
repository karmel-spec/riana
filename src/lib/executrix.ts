import type { LegalDocument, FinalWish } from "@/lib/types";

/** A document the step depends on: matched against filed Drive pages, Legal board records and wishes. Unmatched = "not filed". */
export type Need = { label: string; file?: RegExp; legal?: RegExp; wish?: RegExp; href?: string; app?: string };
export type Step = { id: string; text: string; needs: Need[] };
export type Phase = { key: string; title: string; when: string; color: string; steps: Step[] };

export const PHASES: Phase[] = [
  { key: "days", title: "First days", when: "Hours to one week", color: "#9a3412", steps: [
    { id: "funeral-home", text: "Call the funeral home named on the Funeral page: burial, basic casket (not fiberboard, one step up).", needs: [{ label: "Directive to Personal Representative", legal: /Directive to Personal Representative/i, href: "/legal" }, { label: "Funeral page", app: "/funeral" }] },
    { id: "cemetery", text: "Settle the cemetery in Lake Havasu: which cemetery, which plots, and what moved from Odd Fellows (opening/closing, headstone).", needs: [{ label: "Lake Haven Cemetery deed (one site)", file: /lake haven|lake havasu.*cemetery|cemetery deed/i }, { label: "Burial page", app: "/burial" }] },
    { id: "notify", text: "Text the bishop and Relief Society; work down the notify-first list.", needs: [{ label: "Contacts → Who to notify", app: "/contacts" }] },
    { id: "certificates", text: "Order ten certified death certificates (banks, VA, Social Security, insurers, the county recorder).", needs: [{ label: "Guides tab: what to do first", file: /guide|checklist|what to do/i, href: "/sources/widow-book" }] },
    { id: "safe", text: "Open the safe: the will, titles and cash are inside. The combination is in 1Password, not in the binder.", needs: [{ label: "The Safe page", app: "/safe" }] },
  ] },
  { key: "weeks", title: "First weeks", when: "Two to six weeks", color: "#c9a35a", steps: [
    { id: "will", text: "File the will with the county; Heather is executrix, Karmel the backup.", needs: [{ label: "Last Will & Testament (Rich)", legal: /Last Will.*Richard/i, href: "/legal" }, { label: "Last Will & Testament (Diana)", legal: /Last Will.*Diana/i, href: "/legal" }] },
    { id: "va", text: "Report the death to the VA; claim the burial allowance and survivor benefits; apply for CHAMPVA.", needs: [{ label: "DD-214", legal: /DD-214/i, href: "/legal" }, { label: "VA rating decision letter", file: /rating decision/i, legal: /rating decision/i }, { label: "Health · Rich (VA claims)", app: "/health/rich" }] },
    { id: "ss", text: "Report the death to Social Security and switch to the survivor benefit.", needs: [{ label: "Social Security letters", file: /social security|\bSSA\b/i }, { label: "Accounts page", app: "/money" }] },
    { id: "banks", text: "Navy Federal and Twin Star: the payable-on-death beneficiaries are on file; bring a death certificate.", needs: [{ label: "Account list (POD noted)", app: "/money" }, { label: "Navy Federal statements", file: /navy federal|NFCU/i }] },
    { id: "annuity", text: "Athene annuity: claim the survivor option.", needs: [{ label: "Athene annuity contract", file: /athene|annuity/i }] },
    { id: "bills", text: "Keep the autopays running; move the ones in the deceased’s name.", needs: [{ label: "Bills page", app: "/bills" }] },
  ] },
  { key: "months", title: "First months", when: "Two to twelve months", color: "#2f5141", steps: [
    { id: "deeds", text: "Record, re-record or revoke the transfer-on-death deeds; the 2431 deed and the Arizona beneficiary deed were never made.", needs: [{ label: "TOD Deed: 2429 Tyndell (No. 4857438)", legal: /TOD Deed: 2429/i, href: "/legal" }, { label: "TOD Deed: 2908 Solitude (No. 4857439)", legal: /TOD Deed: 2908/i, href: "/legal" }, { label: "TOD Deed: 2431 Tyndell", legal: /TOD Deed: 2431/i, href: "/legal" }, { label: "Arizona beneficiary deed: 3023 Aladdin", legal: /beneficiary deed/i, href: "/legal" }] },
    { id: "starlar", text: "StarLar: decide the balloon-on-first-death question, keep the notes paying, order mortgage payoffs.", needs: [{ label: "StarLar page", app: "/starlar" }, { label: "Truist payoff statements", file: /payoff/i }] },
    { id: "insurance", text: "Insurance: USAA, Hagerty, Medicare, the home warranty; cancel or retitle each.", needs: [{ label: "Insurance page", app: "/insurance" }] },
    { id: "vehicles", text: "Retitle the cars; the codicil on the collector cars was never signed, so the will governs.", needs: [{ label: "Vehicles page", app: "/vehicles" }, { label: "Codicil on personal vehicles", legal: /Codicil/i, href: "/legal" }] },
    { id: "taxes", text: "Final income tax returns with the family CPA (see Contacts); estate return if needed.", needs: [{ label: "Taxes page", app: "/taxes" }] },
    { id: "digital", text: "Close or memorialize the online accounts; the 1Password vault letter says how to get in.", needs: [{ label: "Digital assets / password-vault access letter", legal: /password-vault|Digital assets/i, href: "/legal" }, { label: "Logins page", app: "/digital" }] },
  ] },
];

export type NeedStatus = Omit<Need, "href"> & { status: "filed" | "app" | "missing"; href: string | null };

/** Resolve each need against what the binder actually holds. Signed/recorded legal records count as filed; drafts do not. */
export function resolve(step: Step, files: { name: string; target_note: string | null; web_view_link: string | null }[], legal: LegalDocument[], wishes: FinalWish[]): NeedStatus[] {
  return step.needs.map((n) => {
    if (n.app) return { ...n, status: "app", href: n.app };
    const f = n.file ? files.find((x) => n.file!.test(`${x.name} ${x.target_note ?? ""}`)) : undefined;
    if (f) return { ...n, status: "filed", href: n.href ?? f.web_view_link };
    const d = n.legal ? legal.find((x) => n.legal!.test(x.title) && (x.status === "signed" || x.status === "recorded")) : undefined;
    if (d) return { ...n, status: "filed", href: n.href ?? "/legal" };
    const w = n.wish ? wishes.find((x) => n.wish!.test(`${x.wish} ${x.detail ?? ""}`)) : undefined;
    if (w) return { ...n, status: "filed", href: n.href ?? "/wishes" };
    return { ...n, status: "missing", href: n.href ?? null };
  });
}
