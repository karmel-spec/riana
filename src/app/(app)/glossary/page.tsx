import Link from "next/link";
import { getViewer, canRead } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { Glossary } from "./glossary-client";

export const metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  const v = await getViewer();
  const parent = v.brief;
  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 11 · Reference"} title={parent ? "What the words mean" : "Estate planning glossary"}
        intro={parent ? "Plain explanations of the legal words in the family papers." : "Plain-language explanations for executors and heirs: the terms that get mixed up, each kind of legal document and why it matters, and the words the court, the attorney and the bank will use."}
        actions={canRead(v, "legal") && !parent ? <><Link href="/legal" className="btn-secondary">Legal board →</Link><Link href="/executrix" className="btn-secondary">Executrix checklist →</Link></> : undefined} />
      <Glossary big={parent} />
      <p className="mt-6 text-[0.85rem] text-ink-soft">General education, not legal advice. Rules differ from state to state and change over time; the estate attorney has the final word on what applies to this family.</p>
    </>
  );
}
