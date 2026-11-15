"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setView } from "@/app/actions/view";

/**
 * Shown across the top of the Brief view to anyone who can also use the Full view (everyone but Rich and Diana),
 * so the way back is always in sight and never tucked inside a menu.
 */
export function BackToFull() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="border-b border-rule bg-brass-tint text-ink">
      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-8">
        <span className="text-[0.85rem]">You are looking at the <strong>Brief view</strong>, the one Rich and Diana see.</span>
        <button type="button" disabled={pending} onClick={() => start(async () => { await setView("full"); router.refresh(); })}
          className="btn-primary min-h-[44px] px-4 text-[0.9rem]">{pending ? "Switching…" : "← Back to Full view"}</button>
      </div>
    </div>
  );
}
