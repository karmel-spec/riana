"use client";

import { useState, useTransition } from "react";
import { setQuestionStatus } from "@/app/actions/records";

/** Closes a question from the dashboard without an answer, so it stops showing as open. */
export function DismissQuestion({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Dismiss this question? It moves to the answered list without an answer.")) return;
          start(async () => {
            const r = await setQuestionStatus(id, "closed");
            setError(r.ok ? null : r.error);
          });
        }}
        className="rounded-lg px-2 py-0.5 text-[0.9rem] font-semibold text-ink-soft underline-offset-2 hover:bg-parchment hover:text-ink disabled:opacity-50"
      >
        {pending ? "Dismissing…" : "Dismiss"}
      </button>
      {error && <span className="text-[0.85rem] text-ember">{error}</span>}
    </span>
  );
}
