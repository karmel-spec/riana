"use client";

import { Close } from "@/components/icons";

/** A form in a sheet (phone) or centered card (desktop). Pass the server action as `action`. */
export function FormDialog({ title, close, children, action, pending, error, submitLabel = "Save" }: {
  title: string; close: () => void; children: React.ReactNode;
  action: (f: FormData) => void; pending: boolean; error?: string; submitLabel?: string;
}) {
  return (
    <div role="dialog" aria-labelledby="fd-title" className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6">
      <form action={action} className="card flex max-h-[95dvh] w-full max-w-[600px] flex-col gap-4 overflow-y-auto rounded-b-none sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 id="fd-title" className="text-[1.4rem] font-semibold">{title}</h2>
          <button type="button" aria-label="Close" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-xl"><Close /></button>
        </div>
        {children}
        {error && <p className="text-ember">{error}</p>}
        <div className="flex gap-3">
          <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
          <button type="button" onClick={close} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export function Field({ id, label, children, span }: { id: string; label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="label">{label}</label>
      {children}
    </div>
  );
}
