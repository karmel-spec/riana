// Plain-language estate-planning glossary for executors and heirs. General education only:
// nothing here is about a particular person, and state law varies.

export type Comparison = { id: string; title: string; intro: string; rows: { name: string; text: string }[]; bottomLine: string };
export type Term = { term: string; also?: string; def: string };
export type TermGroup = { id: string; title: string; blurb: string; terms: Term[] };

const T = (term: string, def: string, also?: string): Term => ({ term, def, also });

/** Pairs and sets of words that people mix up, set side by side. */
export const COMPARISONS: Comparison[] = [
  {
    id: "signed-notarized-recorded", title: "Signed, witnessed, notarized and recorded",
    intro: "Four different steps. A document may need one, several, or all of them, and each does a different job.",
    rows: [
      { name: "Signed", text: "The person put their signature on it. For many documents that alone is not enough to make it legally effective." },
      { name: "Witnessed", text: "Other adults watched the signing and signed too, to say the person signed willingly and seemed of sound mind. Wills usually need two witnesses who do not inherit under it." },
      { name: "Notarized", text: "A notary public checked the signer's ID, watched them sign, and added a stamp and signature. It proves who signed and when. It does not prove the document is true, wise or fair, and it does not file the document anywhere." },
      { name: "Recorded", text: "The signed, notarized document was taken to the county recorder (or auditor) and entered in the public land records, with a recording number and date. This is what puts the world on notice. Only documents about real estate are recorded: deeds, transfer-on-death deeds, easements, deeds of trust." },
    ],
    bottomLine: "Notarizing is about the signature; recording is about the public record. A deed must be notarized before the county will record it, and a transfer-on-death deed does nothing unless it was recorded before the owner died. Wills, healthcare directives and powers of attorney are signed, witnessed or notarized, but never recorded.",
  },
  {
    id: "will-trust", title: "Will and trust",
    intro: "Both say who gets what. They differ in when they work, whether a court is involved, and what they cover.",
    rows: [
      { name: "Will", text: "Takes effect only at death. It names who inherits and who is in charge (the personal representative), and it is carried out through probate, a court-supervised process that is public record. It controls only property in the person's own name with no beneficiary or co-owner. It does nothing during incapacity." },
      { name: "Revocable living trust", text: "Takes effect as soon as it is signed and funded. The people who made it usually manage it while they can; a successor trustee takes over at incapacity or death, with no court. It is private. It controls only what has been retitled into it, so an unfunded trust is an empty box." },
      { name: "Used together", text: "Most trust plans still include a short \"pour-over\" will that sends anything left outside the trust into it. A will is also where guardians for minor children are named." },
    ],
    bottomLine: "A will is simpler and cheaper to set up but goes through probate. A trust costs more up front and takes work to fund, but avoids probate, which matters most with real estate in more than one state, and it covers incapacity as well as death.",
  },
  {
    id: "probate-nonprobate", title: "Probate and non-probate property",
    intro: "Not everything a person owns passes under the will. What matters is how each thing is titled.",
    rows: [
      { name: "Probate property", text: "Anything in the person's name alone with no beneficiary named: a house without a transfer-on-death deed, a solo bank account, a car, personal belongings. The will (or state law, if there is no will) decides who gets it, through the court." },
      { name: "Non-probate property", text: "Passes directly by its own paperwork, whatever the will says: life insurance, retirement accounts and annuities with a named beneficiary; bank accounts marked payable on death; property owned jointly with right of survivorship; real estate with a recorded transfer-on-death deed; anything in a trust." },
    ],
    bottomLine: "The beneficiary form beats the will. Check every account's beneficiary and every deed, because an outdated form sends the money to the wrong person no matter what the will says.",
  },
  {
    id: "roles", title: "Executor, trustee and agent",
    intro: "Three jobs, three sources of authority, three different time periods. One person can hold more than one.",
    rows: [
      { name: "Agent under a power of attorney", text: "Acts for a living person who cannot act for themselves, on money (financial power of attorney) or medical care (healthcare power of attorney). The authority ends the moment the person dies." },
      { name: "Executor / personal representative", text: "Named in the will and confirmed by the probate court after death. Gathers the property, pays debts and taxes, and distributes what is left. Has no authority until the court issues letters. \"Executrix\" is the older word for a woman in the role." },
      { name: "Trustee / successor trustee", text: "Manages what is in a trust under the trust's own terms. The successor trustee steps in at the maker's incapacity or death, without a court." },
    ],
    bottomLine: "Before death, the agent acts. After death, the executor handles what is in the estate and the trustee handles what is in the trust. A power of attorney cannot be used to settle an estate.",
  },
  {
    id: "directive-poa-dnr", title: "Healthcare directive, healthcare power of attorney and DNR",
    intro: "Three medical documents that work together. Having one does not replace the others.",
    rows: [
      { name: "Healthcare directive (living will)", text: "States the treatment a person does or does not want if they are dying or permanently unconscious. It speaks to doctors; it does not appoint anyone." },
      { name: "Healthcare power of attorney", text: "Appoints a person (the agent) to make medical decisions whenever the patient cannot, in any situation, not only at the end of life." },
      { name: "DNR / prehospital directive", text: "A doctor-signed order telling emergency crews not to attempt resuscitation. Paramedics will not follow a living will; they need this specific form, and only people who have decided against resuscitation should have one." },
      { name: "HIPAA authorization", text: "Lets named people get medical information. It gives access to information, not the power to decide." },
    ],
    bottomLine: "The directive says what, the power of attorney says who, the DNR tells paramedics, and the HIPAA form lets family be told what is going on.",
  },
  {
    id: "heir-beneficiary", title: "Heir and beneficiary",
    intro: "Often used as if they mean the same thing. They do not.",
    rows: [
      { name: "Heir", text: "A relative that state law says would inherit if there were no will: spouse, children, then more distant family." },
      { name: "Beneficiary", text: "Anyone actually named to receive something in a will, trust, deed, insurance policy or account. A beneficiary need not be a relative, and an heir who is not named may receive nothing." },
    ],
    bottomLine: "Heirs are set by law; beneficiaries are chosen. Courts still notify heirs of a probate even when the will leaves them nothing.",
  },
  {
    id: "community-separate", title: "Community property and separate property",
    intro: "Washington and Arizona are both community property states, which shapes what each spouse can give away.",
    rows: [
      { name: "Community property", text: "Most things either spouse earns or buys during the marriage. Each owns half, and each can leave only their own half by will." },
      { name: "Separate property", text: "What a spouse owned before marriage or received alone as a gift or inheritance, if kept separate. It can lose that status by being mixed in." },
      { name: "With right of survivorship", text: "A way of titling community property so the whole thing passes to the surviving spouse automatically, outside probate." },
    ],
    bottomLine: "At the first death the survivor already owns their half. Community property also generally gets a full step-up in tax basis at the first death, which can matter a great deal when property is later sold.",
  },
  {
    id: "stirpes-capita", title: "Per stirpes and per capita",
    intro: "Two ways a will or trust can handle a beneficiary who dies first.",
    rows: [
      { name: "Per stirpes (by right of representation)", text: "A deceased child's share goes down to that child's own children. Each branch of the family keeps its share." },
      { name: "Per capita", text: "The gift is divided equally among the people in the group who are still living. A deceased child's branch may get nothing, depending on the wording." },
    ],
    bottomLine: "If the documents do not say, state law fills in the answer. It is worth checking that the wording matches what the parents actually want for grandchildren.",
  },
];

/** Single terms, grouped the way an executor meets them. */
export const TERM_GROUPS: TermGroup[] = [
  {
    id: "people", title: "People and roles", blurb: "Who is who in the documents.",
    terms: [
      T("Testator", "The person who makes a will.", "testatrix"),
      T("Personal representative", "The person the court puts in charge of settling an estate. Called an executor when named in the will and an administrator when there is no will.", "executor, executrix, administrator"),
      T("Grantor", "The person who creates and funds a trust.", "settlor, trustor, trustmaker"),
      T("Trustee", "The person or company that holds and manages trust property for the beneficiaries."),
      T("Successor trustee", "The person named to take over a trust when the original trustee dies or can no longer serve."),
      T("Beneficiary", "A person or organization named to receive something."),
      T("Contingent beneficiary", "The backup who receives if the first-named (primary) beneficiary has died or declines.", "secondary beneficiary"),
      T("Heir", "A relative entitled to inherit under state law when there is no will.", "heir at law"),
      T("Principal", "The person who gives someone else authority under a power of attorney."),
      T("Agent", "The person given authority under a power of attorney. Despite the old name, they need not be a lawyer.", "attorney-in-fact"),
      T("Guardian", "Someone a court appoints to make personal and medical decisions for an adult who cannot, or to raise a minor child."),
      T("Conservator", "Someone a court appoints to manage the money and property of a person who cannot."),
      T("Representative payee", "The person Social Security appoints to receive and manage someone's benefits. Social Security does not accept a power of attorney for this."),
      T("Notary public", "An official who verifies identity and witnesses signatures. A notary does not give legal advice or vouch for what a document says."),
      T("Fiduciary", "Anyone legally bound to act in another person's interest and not their own: executors, trustees and agents all are."),
      T("Surviving spouse", "The husband or wife who outlives the other. Many rules and benefits turn on this status."),
    ],
  },
  {
    id: "process", title: "Settling an estate", blurb: "Words an executor will hear from the court, the attorney and the bank.",
    terms: [
      T("Probate", "The court process that proves a will, appoints the personal representative, sees debts paid and transfers what is left."),
      T("Intestate", "Dying without a valid will. State law then decides who inherits and the court picks who is in charge.", "intestacy"),
      T("Letters testamentary", "The court paper that proves the personal representative's authority. Banks, title companies and agencies ask for it.", "letters of administration, letters"),
      T("Small estate affidavit", "A sworn form that lets heirs collect a modest estate without a full probate. Each state sets its own dollar limits and waiting period."),
      T("Ancillary probate", "A second probate in another state, needed when the person owned real estate there in their own name."),
      T("Certified death certificate", "An official copy with a raised or colored seal. Most institutions want their own certified copy, so executors usually order ten or more."),
      T("Inventory", "The list of everything the person owned, with values as of the date of death."),
      T("Date-of-death value", "What each asset was worth on the day the person died. It sets the starting point for taxes and for dividing the estate."),
      T("Step-up in basis", "For tax purposes, inherited property is generally treated as if bought at its date-of-death value, which can erase the taxable gain built up during the owner's life."),
      T("Notice to creditors", "The published and mailed notice that starts a deadline for anyone owed money to make a claim against the estate."),
      T("Estate account", "A bank account opened in the estate's name, with its own tax ID number (EIN), to collect money and pay bills during probate."),
      T("Residuary estate", "Whatever is left after specific gifts, debts, taxes and costs. The will's residuary clause says who gets it.", "residue, remainder"),
      T("Bequest", "A gift made in a will. A specific bequest names a particular item or amount.", "devise, legacy"),
      T("Disclaimer", "A formal written refusal of an inheritance, so that it passes to the next person in line. There is a strict deadline."),
      T("Final accounting", "The personal representative's report of what came in, what was paid out and what is being distributed, given to the court or the beneficiaries before closing."),
      T("Estate tax", "A tax on very large estates, paid by the estate before distribution. The federal threshold is high; a few states, including Washington, have their own with lower thresholds. Arizona has none."),
      T("Incapacity", "Being unable to manage one's own affairs or make informed decisions, usually as certified by one or two doctors. It is the trigger for an agent or successor trustee to act."),
    ],
  },
  {
    id: "property", title: "Property, title and accounts", blurb: "How something is owned decides how it passes.",
    terms: [
      T("Title", "Legal ownership, and the way the owners' names are written on the deed or account."),
      T("Deed", "The signed document that transfers ownership of real estate. Recorded with the county."),
      T("Legal description", "The official description of a parcel used in deeds (lot, block, plat, or metes and bounds). A street address is not enough, and an error here can make a deed fail."),
      T("Joint tenancy with right of survivorship", "Co-ownership in which a deceased owner's share passes automatically to the surviving owners, outside probate.", "JTWROS"),
      T("Tenancy in common", "Co-ownership in which each owner's share is their own to leave by will. There is no automatic survivorship."),
      T("Payable on death", "A bank account instruction naming who receives the balance at death, without probate.", "POD"),
      T("Transfer on death", "The same idea for investment accounts, vehicles in some states, and real estate by deed.", "TOD"),
      T("Beneficiary designation", "The form on file with an insurer, retirement plan or bank naming who receives that asset. It overrides the will."),
      T("Funding a trust", "Retitling property and accounts into the trust's name. Assets left out may still need probate."),
      T("Deed of trust", "A recorded document that secures a loan against real estate, used in Washington and Arizona in place of a mortgage. It is not a trust in the estate-planning sense."),
      T("Lien", "A recorded claim against property for a debt. It must usually be paid off before the property can be sold or passed on cleanly."),
      T("Easement", "A recorded right for someone else to use part of a property, such as a shared driveway. It stays with the land."),
      T("Life estate", "The right to live in or use a property for life, after which it passes to someone else named in the deed."),
      T("Annuity", "A contract with an insurance company that pays out over time. It passes by its beneficiary designation."),
      T("Survivor benefit", "A continuing payment to a spouse after death, from Social Security, a pension, the VA or an annuity. Each has its own application."),
    ],
  },
];

/** Lower-cased text of everything about one entry, for the page's search box. */
export const haystack = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ").toLowerCase();
