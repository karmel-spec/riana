import Link from "next/link";
import type { LegalStatus, QuestionStatus, Source } from "@/lib/types";

export function PageHeader({ eyebrow, title, intro, actions }: {
  eyebrow?: string; title: string; intro?: string; actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="text-[2.1rem] font-semibold leading-tight sm:text-[2.5rem]">{title}</h1>
        {intro && <p className="mt-1 max-w-[62ch] text-ink-soft">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function SectionCard({ title, link, children, className = "" }: {
  title: string; link?: { href: string; label: string }; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`card flex flex-col gap-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[1.35rem] font-semibold">{title}</h2>
        {link && <Link href={link.href} className="shrink-0 font-semibold text-evergreen">{link.label}</Link>}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, note, tone = "ink", href }: {
  label: string; value: React.ReactNode; note?: React.ReactNode; tone?: "ink" | "ember" | "evergreen"; href?: string;
}) {
  const color = tone === "ember" ? "text-ember" : tone === "evergreen" ? "text-evergreen" : "text-ink";
  const body = (
    <>
      <div className="text-[0.9rem] font-semibold text-ink-soft">{label}</div>
      <div className={`font-serif text-[2rem] font-semibold leading-tight ${color}`}>{value}</div>
      {note && <div className={`text-[0.9rem] ${tone === "ember" ? "font-semibold text-ember" : "text-ink-soft"}`}>{note}</div>}
    </>
  );
  return href
    ? <Link href={href} className="card flex flex-col gap-0.5 no-underline hover:border-evergreen-mid">{body}</Link>
    : <div className="card flex flex-col gap-0.5">{body}</div>;
}

export function DateChip({ month, day }: { month: string; day: string }) {
  return (
    <div className="w-[62px] shrink-0 rounded-xl border border-rule bg-parchment py-1.5 text-center">
      <div className="text-[0.75rem] font-bold text-brass-deep">{month}</div>
      <div className="font-serif text-[1.4rem] font-semibold leading-none">{day}</div>
    </div>
  );
}

export function SourceTag({ source }: { source: Source }) {
  if (source === "app") return null;
  return (
    <span className={`pill ${source === "riana" ? "bg-plum-tint text-plum" : "bg-slate-tint text-slate"}`}>
      {source === "riana" ? "via Riana" : "imported"}
    </span>
  );
}

export function LegalStatusPill({ status }: { status: LegalStatus }) {
  const map: Record<LegalStatus, [string, string]> = {
    not_started: ["Not started", "bg-rule-soft text-ink-soft"],
    drafted: ["Drafted", "bg-brass-tint text-brass-deep"],
    signed: ["Signed", "bg-evergreen-tint text-evergreen"],
    recorded: ["Recorded", "bg-slate-tint text-slate"],
    superseded: ["Superseded", "bg-rule-soft text-ink-soft line-through"],
  };
  const [label, cls] = map[status];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function QuestionStatusPill({ status }: { status: QuestionStatus }) {
  const map: Record<QuestionStatus, [string, string]> = {
    open: ["Open", "bg-ember-tint text-ember"],
    asked: ["Asked", "bg-brass-tint text-brass-deep"],
    partly_answered: ["Partly answered", "bg-brass-tint text-brass-deep"],
    answered: ["Answered", "bg-evergreen-tint text-evergreen"],
    closed: ["Closed", "bg-rule-soft text-ink-soft"],
  };
  const [label, cls] = map[status];
  return <span className={`pill ${cls}`}>{label}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-rule px-4 py-6 text-center text-ink-soft">{children}</div>;
}

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="card">
        <p className="text-ink-soft">This section’s screens arrive in <strong>{phase}</strong> of the build plan. The database tables and permissions for it already exist.</p>
      </div>
    </>
  );
}
