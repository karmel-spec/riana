"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setView } from "@/app/actions/view";

/** Full / Brief switch. Lives above "Home" in the sidebar and in the Brief header. */
export function ViewToggle({ current, className = "" }: { current: "full" | "brief"; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const pick = (view: "full" | "brief") => { if (view !== current) start(async () => { await setView(view); router.refresh(); }); };
  const btn = (view: "full" | "brief", label: string) => (
    <button type="button" onClick={() => pick(view)} disabled={pending} aria-pressed={current === view}
      className={`min-h-[36px] flex-1 rounded-full px-3 text-[0.85rem] font-bold ${current === view ? "bg-parchment text-evergreen" : "text-paper hover:bg-evergreen-mid/40"}`}>{label}</button>
  );
  return (
    <div role="group" aria-label="Version" className={`flex rounded-full border border-mist/50 p-0.5 ${className}`}>
      {btn("full", "Full")}{btn("brief", "Brief")}
    </div>
  );
}
