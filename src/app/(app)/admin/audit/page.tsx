import { requireSuperAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { Empty, PageHeader } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/format";
import { SECTION_LABELS } from "@/lib/permissions";

export const metadata = { title: "Audit log" };

const ACTION_TONE: Record<string, string> = {
  view: "bg-rule-soft text-ink-soft", download: "bg-slate-tint text-slate", export: "bg-slate-tint text-slate",
  create: "bg-evergreen-tint text-evergreen", update: "bg-brass-tint text-brass-deep", delete: "bg-ember-tint text-ember",
  permission_change: "bg-ember-tint text-ember", break_glass: "bg-ember text-paper", approve: "bg-evergreen-tint text-evergreen",
  reject: "bg-rule-soft text-ink-soft", revert: "bg-brass-tint text-brass-deep", sign_in: "bg-rule-soft text-ink-soft", notify_send: "bg-plum-tint text-plum",
};

export default async function AuditPage() {
  const v = await requireSuperAdmin();
  const rows = await data.getAudit(v, 200);
  return (
    <>
      <PageHeader eyebrow="Admin" title="Audit log"
        intro="Every view, edit, download and permission change on sensitive sections. Entries can never be edited or deleted, not even by super admins." />
      {rows.length === 0 ? <Empty>No activity yet.</Empty> : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-[0.95rem]">
            <thead className="text-left text-[0.8rem] uppercase tracking-wide text-ink-soft">
              <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Details</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-rule-soft">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">{fmtDate(r.at)} {fmtTime(r.at)}</td>
                  <td className="px-4 py-2.5 font-semibold">{r.actor_name}{r.via === "riana" && <span className="pill ml-2 bg-plum-tint text-plum">via Riana</span>}</td>
                  <td className="px-4 py-2.5"><span className={`pill ${ACTION_TONE[r.action] ?? "bg-rule-soft"}`}>{r.action.replace("_", " ")}</span></td>
                  <td className="px-4 py-2.5">{r.section ? SECTION_LABELS[r.section] : "—"}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
