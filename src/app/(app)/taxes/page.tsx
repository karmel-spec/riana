import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { listImportedFiles } from "@/lib/drive/service";
import { Empty, PageHeader } from "@/components/ui";
import { Lock } from "@/components/icons";
import { TaxYearCards, SourceChecklist } from "./taxes-client";
import { TaxEditor } from "../insurance/insurance-client";

export const metadata = { title: "Taxes" };

export default async function TaxesPage() {
  const v = await requireSuperAdmin();
  const [taxes, sources, people, imported] = await Promise.all([data.getTaxRecords(v), data.getTaxSourceItems(v), data.getPeople(v), listImportedFiles(v)]);
  await data.logView(v, "admin", "tax_records");
  const cpas = people.filter((p) => /cpa|accountant|tax/i.test(p.relationship ?? "")).map((p) => ({ id: p.id, name: p.full_name, phone: p.phone, email: p.email }));
  const returns = imported.filter((f) => f.target_section === "taxes").map((f) => ({ id: f.id, name: f.name, web_view_link: f.web_view_link, size_bytes: f.size_bytes }));
  const years = [...new Set(taxes.map((t) => t.tax_year))].sort((a, b) => b - a);

  return (
    <>
      <PageHeader eyebrow="Section 10 · Super Admin only" title="Taxes"
        intro="Federal returns by year with the CPA who prepared them, the 2024 amendment, property tax, and the disabled-veteran exemption. Identifiers are kept as last-4 only; every view and download of a return is logged."
        actions={<TaxEditor cpas={cpas} />} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rule bg-paper-warm px-5 py-4">
        <Lock className="mt-0.5 shrink-0 text-ember" />
        <p className="text-[0.95rem] text-ink-soft"><strong className="text-ink">Admins only.</strong> The return PDFs contain Social Security and bank numbers. The binder never stores those; it shows last-4 beside each year and streams the PDF from Drive to you, logging each view. Nobody outside the two super admins can reach this page or these files.</p>
      </div>

      {years.length === 0 ? <Empty>No tax records yet.</Empty> : <TaxYearCards years={years} taxes={taxes} returns={returns} cpas={cpas} />}

      <section className="card mt-6">
        <h2 className="text-[1.3rem] font-semibold">Where the rental tax forms live</h2>
        <p className="mb-3 text-[0.95rem] text-ink-soft">The 1099s and 1098s for the rentals are in the property-manager and lender portals, not stored here. Tick each one off as it arrives; the vault item name says where the portal login is.</p>
        <SourceChecklist items={sources} />
      </section>
    </>
  );
}
