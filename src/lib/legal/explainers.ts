// "Learn more" on the Legal board: plain-language background on each kind of document, and a
// reading of one family's own record of it. General information only; nothing here is about a
// particular person, and none of it is legal advice.

export type Explainer = { kind: string; what: string; why: string; lookFor: string[] };
export type LearnDoc = {
  title: string; doc_type: string; status: string; needs_recording: boolean; prepared_by: string | null;
  drafted_on: string | null; signed_on: string | null; recorded_on: string | null;
  original_location: string | null; open_issue: string | null; notes: string | null;
};

const E = (kind: string, what: string, why: string, lookFor: string[]): Explainer => ({ kind, what, why, lookFor });

/** Matched top to bottom against the title first, then the document type. */
const RULES: { title?: RegExp; type?: string; e: Explainer }[] = [
  { title: /codicil|addendum to the last will/i, e: E("Codicil or addendum to a will",
    "A short signed document that changes or adds to a will without rewriting the whole thing. To count, it has to be signed with the same formalities as the will itself (in most states, two witnesses).",
    "It lets a couple fix one thing, such as who gets the cars, without redoing everything. The risk is the opposite: an unsigned or unwitnessed codicil changes nothing, and the old will still controls.",
    ["Is it signed and witnessed, or only a draft?", "Does it say clearly which will it amends?", "Does it contradict the will, a trust or a deed anywhere?"]) },
  { title: /directive to personal representative/i, e: E("Directive (letter of instruction) to the personal representative",
    "A private letter to the person who will settle the estate: where things are, account and safe details, who to call, and personal wishes that do not belong in a public will.",
    "A will says who gets what; this says how to actually find and handle everything. It saves the executor weeks of searching. It is usually not legally binding, and because it can hold passwords and combinations it should be kept locked away.",
    ["Is the information still current (accounts, passwords, contacts)?", "Does the named personal representative know it exists and where it is?", "Is it stored somewhere only the right people can open?"]) },
  { title: /comfort|end-of-life wishes|emergency medical summary/i, e: E("Personal statement of medical wishes",
    "A signed statement in the person's own words about the care they want: comfort, treatments to accept or refuse, and what matters most to them. An emergency medical summary lists diagnoses, medicines, allergies and doctors on one page.",
    "It guides family and doctors when the person cannot speak, and it backs up the formal directive and power of attorney. On its own it may not be legally binding, so it works best alongside those.",
    ["Is it dated and signed?", "Does it agree with the healthcare directive and the power of attorney?", "Do the doctors and the hospital have a copy?"]) },
  { title: /prehospital|\bDNR\b/i, e: E("Prehospital medical care directive (DNR)",
    "A doctor-signed form telling paramedics not to attempt resuscitation if the heart or breathing stops. In Arizona it is printed on orange paper and must be where responders can see it.",
    "Without it, emergency crews are required to attempt resuscitation, whatever a living will says. It is only for someone who has decided, with their doctor, that they do not want that.",
    ["Has the person decided they want one? Many people do not.", "Is it signed by the person and a licensed provider?", "Is it posted where paramedics will find it?"]) },
  { title: /HIPAA/i, e: E("HIPAA authorization",
    "A signed permission for named people to talk to doctors, hospitals and insurers and to see medical records.",
    "Privacy law stops providers from sharing details even with adult children. This form lets the helpers get answers before any power of attorney is needed.",
    ["Does it name everyone who needs to call on their behalf?", "Is a copy on file with each main provider?", "Does it have an expiry date that has passed?"]) },
  { title: /authorized-representative|VA \/ SSA|Medicare/i, e: E("Agency representative forms (VA, Social Security, Medicare)",
    "Each federal agency has its own form for naming someone to act or speak for a person. A general power of attorney is often not accepted in its place.",
    "Benefits questions, claims and address changes stall when the agency will only talk to the beneficiary. These forms let a helper handle them.",
    ["Is there a separate form on file with each agency?", "Does Social Security need a representative payee (it does not honor powers of attorney)?"]) },
  { title: /digital assets|password/i, e: E("Digital assets and password access letter",
    "Written permission, and practical instructions, for a trusted person to get into email, phones, online accounts and the password vault.",
    "Most accounts lock out even family after a death or incapacity. Bills, photos and records all sit behind logins now.",
    ["Does someone know the password-vault master password or emergency access?", "Do the will and powers of attorney mention digital assets?", "Is the list of accounts current?"]) },
  { title: /final disposition/i, e: E("Declaration and authorization for final disposition",
    "A signed statement of what should happen to a person's body (burial or cremation, where) and who has the authority to carry it out.",
    "It removes doubt and disagreement at the hardest moment, and it gives the funeral home the authority it needs to act without waiting on every relative.",
    ["Is it signed and, if the state asks for it, witnessed or notarized?", "Does it agree with the prepaid cemetery and funeral arrangements?", "Does the funeral home have a copy?"]) },
  { title: /community property agreement/i, e: E("Community property agreement",
    "An agreement between spouses that everything they own is community property and passes straight to the survivor when the first one dies. Washington has a specific statute for these.",
    "It can let the surviving spouse take title without a probate. It only covers the first death, and it can clash with other papers that name a different taker, such as a transfer-on-death deed.",
    ["Is it notarized, and for real estate, recorded?", "Do the couple still live in a state that honors it?", "Does it conflict with any deed, beneficiary form or trust?"]) },
  { title: /DD-?214/i, e: E("DD-214 (military discharge)",
    "The certificate of release from active duty. It proves service, dates and character of discharge.",
    "It is the key to veterans' burial benefits, a flag, a headstone or marker, military honors, and survivor benefits. Funeral homes and the VA ask for it first.",
    ["Is there a certified copy somewhere easy to reach?", "Does the funeral home have a copy on file?", "Has it been recorded with the county (many counties do this free)?"]) },
  { title: /questionnaire/i, e: E("Estate planning questionnaire",
    "The intake form an attorney or trust service uses to gather names, assets, wishes and choices of people to serve.",
    "Filling it in is the first step toward new documents. It is not a legal document itself and has no effect until the documents are drawn up and signed.",
    ["Is it complete and sent in?", "Do the answers match the latest family decisions?"]) },
  { title: /memorandum|design summary/i, e: E("Estate planning memorandum or design summary",
    "A written summary of the plan: what the couple decided, who gets what, and how the pieces fit together. Sometimes a signed family memo, sometimes the attorney's blueprint for documents still to come.",
    "It records intent while everyone can still explain it. It usually does not move property by itself; the will, trust and deeds have to carry it out.",
    ["Is it signed, and by whom?", "Have the will, trust and deeds been updated to match it?", "Does it conflict with any older signed document?"]) },
  { title: /beneficiary deed|TOD deed|transfer.on.death/i, type: "tod_deed", e: E("Transfer-on-death (beneficiary) deed",
    "A deed that names who receives a property when the owner, or the last owner, dies. The owner keeps full control meanwhile and can revoke it. Washington calls it a transfer on death deed; Arizona calls it a beneficiary deed.",
    "The property passes outside probate, directly to the people named. It only works if it was signed, notarized and recorded with the county before death, with a correct legal description.",
    ["Has it been recorded, and is the legal description right?", "Are the named beneficiaries still the right people?", "Does it conflict with a community property agreement, will or trust?", "Is there a deed for every property?"]) },
  { type: "will", e: E("Last will and testament",
    "The document that says who receives a person's property, who is in charge of settling the estate (the personal representative or executor), and any final instructions. It takes effect only at death and is carried out through the court process called probate.",
    "Without a will, state law decides who inherits and a court picks who is in charge. A will does not control everything: accounts with beneficiaries, jointly held property, deeds that transfer on death and trust assets pass outside it.",
    ["Is it signed and witnessed the way the state requires?", "Are the personal representative and the alternate still the right people, and willing?", "Has anything big changed since it was signed: a move to another state, a death, a marriage or divorce, new property?", "Does anyone know where the signed original is? Courts want the original."]) },
  { title: /living will|health ?care directive/i, type: "directive", e: E("Healthcare directive (living will)",
    "A statement of the medical treatment a person does or does not want if they are dying or permanently unconscious and cannot speak for themselves, such as life support and tube feeding.",
    "It spares the family from guessing and gives doctors clear authority to follow the person's wishes. A directive states wishes; it does not by itself appoint anyone to make decisions. That takes a healthcare power of attorney.",
    ["Does it name a healthcare agent, or is a separate power of attorney needed?", "Was it signed in another state? It is usually honored, but a local form avoids questions.", "Do the doctors and hospital have a copy?", "Does it still say what the person wants?"]) },
  { type: "healthcare_poa", e: E("Healthcare power of attorney",
    "Names a person (the agent) to make medical decisions when someone cannot make them. It can also cover mental-health treatment if written to.",
    "Doctors need one person with clear authority. Without it, the family may have to agree among themselves or go to court for a guardianship.",
    ["Is there a first choice and a backup agent?", "Is it signed, and witnessed or notarized as the state form requires?", "Do the agents and the doctors have copies?"]) },
  { type: "financial_poa", e: E("Financial (durable) power of attorney",
    "Gives a trusted person the legal power to handle money and property for someone: banking, bills, taxes, real estate. \"Durable\" means it keeps working if the person becomes incapacitated. A limited one covers a single task or business.",
    "If someone can no longer manage their affairs and there is no power of attorney, the family must ask a court to appoint a guardian or conservator, which is slow and costly. It ends at death; the will takes over then.",
    ["Is it actually signed and notarized? A draft gives no authority.", "Is it durable, and does it take effect now or only on incapacity?", "Will the banks accept it? Some want their own form or a recent date.", "Are the agent and backup still the right people?"]) },
  { type: "trust", e: E("Revocable living trust",
    "A legal container that holds property during life, managed by the people who made it, and passes it on at death under the trust's terms, managed by a successor trustee.",
    "Property in the trust avoids probate, which matters most when there is real estate in more than one state. It also lets a successor step in during incapacity. It only covers what has been retitled into it (called funding).",
    ["Has it been signed, and have the properties and accounts been moved into it?", "Who is the successor trustee, and the backup?", "Is there a pour-over will to catch anything left out?", "Do the deeds and beneficiary forms now point to the trust?"]) },
  { type: "promissory_note", e: E("Promissory note",
    "A written promise to repay a loan: the amount, interest, payment schedule and what happens on default. A deed of trust alongside it secures the loan against a property.",
    "A family loan with no paper becomes an argument later. The note is an asset of the estate, and the plan needs to say whether what is still owed is collected, forgiven, or counted against that person's inheritance.",
    ["Is it signed by the borrowers?", "Is the balance being tracked, with a payment record?", "Does the will or trust say what happens to the unpaid balance?", "If it is meant to be secured, was the deed of trust recorded?"]) },
  { type: "easement", e: E("Easement",
    "A recorded right for one property to use part of another, for example a shared driveway or utility line. It stays with the land when the property changes hands.",
    "It affects what each property is worth and how it can be sold or divided among heirs. Changes only bind future owners if they are signed, notarized and recorded.",
    ["Is the latest version signed by every owner and recorded?", "Does it match how the properties are actually used?"]) },
  { type: "court_filing", e: E("Court filing",
    "A document filed in a court case, such as a sworn declaration. It is part of that case's record.",
    "It is kept with the estate papers because statements made under oath, and any orders in the case, can bear on family finances or later disputes.",
    ["Is the case closed or still open?", "Did it produce any order the family has to follow?"]) },
];

const FALLBACK = E("Estate document",
  "One of the papers that make up the estate plan.",
  "Each document covers a gap the others leave: who decides, who inherits, and how property actually changes hands.",
  ["Is it signed and dated?", "Does it agree with the other documents?", "Does someone know where the original is?"]);

/** The general explainer for a document, picked by its title, then its type. */
export function explainerFor(d: { title: string; doc_type: string }): Explainer {
  return RULES.find((r) => r.title?.test(d.title))?.e ?? RULES.find((r) => r.type === d.doc_type)?.e ?? FALLBACK;
}

const yearsSince = (iso: string, today: string) => (new Date(today).getTime() - new Date(iso).getTime()) / (365.25 * 86_400_000);

/**
 * What the record itself shows is missing or due for a look. `today` is a YYYY-MM-DD day.
 * These come only from the facts on file; the open issue and notes are shown separately.
 */
export function gapsFor(d: LearnDoc, hasScan: boolean, today: string): string[] {
  const out: string[] = [];
  const done = d.status === "signed" || d.status === "recorded";
  if (d.status === "not_started") out.push("It has not been started. Decide whether it is needed, and if so who will prepare it.");
  if (d.status === "drafted") out.push("It is only a draft. Until it is signed (and witnessed or notarized as required) it has no legal effect.");
  if (d.status === "signed" && (d.needs_recording || d.doc_type === "tod_deed")) out.push("It is signed but not recorded with the county. A deed like this must be recorded before death to work.");
  if (done && !d.signed_on) out.push("No signing date is on file.");
  if (done && !d.original_location) out.push("Nobody has noted where the signed original is kept.");
  if (done && !hasScan) out.push("No digital copy is filed in the binder yet.");
  if (done && d.signed_on && yearsSince(d.signed_on, today) >= 5) out.push(`It was signed ${Math.floor(yearsSince(d.signed_on, today))} years ago. Attorneys suggest a review every three to five years, and after a move to another state, a death, or a big change in property.`);
  return out;
}
