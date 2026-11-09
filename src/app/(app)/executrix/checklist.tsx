"use client";

import { useEffect, useState } from "react";

const KEY = "greene_executrix_done";

/** Per-device check-off (what Heather has already done). Kept in the browser only, so it never writes to the binder. */
export function DoneBox({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}"); if (saved[id]) queueMicrotask(() => setDone(true)); } catch { /* storage unavailable */ }
  }, [id]);
  const toggle = () => {
    const next = !done; setDone(next);
    try { const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}"); saved[id] = next; localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* storage unavailable */ }
  };
  return (
    <button type="button" role="checkbox" aria-checked={done} onClick={toggle} aria-label={done ? "Done" : "Not done yet"}
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${done ? "border-evergreen bg-evergreen text-paper" : "border-rule bg-paper"}`}>
      {done ? "✓" : ""}
    </button>
  );
}
