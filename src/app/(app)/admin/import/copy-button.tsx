"use client";

import { useState, useTransition } from "react";
import { copyFilesToStorage } from "@/app/actions/files";

export function CopyToStorage({ remaining }: { remaining: number }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const go = () => start(async () => {
    const r = await copyFilesToStorage();
    setMsg(r.ok ? `Copied ${r.data!.copied}; ${r.data!.remaining} still to copy.${r.data!.errors.length ? ` Skipped: ${r.data!.errors.slice(0, 3).join("; ")}` : ""}` : r.error);
  });
  return (
    <section className="card mt-8">
      <h2 className="text-[1.2rem] font-semibold">Private storage</h2>
      <p className="mt-1 text-ink-soft">Copies approved Drive files into the app’s own private storage so family members can open them with just their binder login, on any device. Drive stays the source. Runs 25 files per click.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={go} disabled={pending || remaining === 0} className="btn-primary">{pending ? "Copying…" : remaining === 0 ? "Everything is copied" : `Copy the next 25 (${remaining} left)`}</button>
        {msg && <span className="text-[0.9rem] text-ink-soft">{msg}</span>}
      </div>
    </section>
  );
}
