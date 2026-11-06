"use client";

import { useTransition } from "react";
import { setViewMode } from "@/app/actions/view";
import type { ViewMode } from "@/lib/view-mode";

/**
 * Lets anyone flip between the full binder and the large-print, simpler frame.
 * The choice is saved in a cookie, so it sticks across pages and visits.
 * Reloads rather than router.refresh(): the text scale lives on <html>, outside
 * what a client-side refresh re-renders.
 */
export function ViewToggle({ mode, className = "" }: { mode: ViewMode; className?: string }) {
  const [pending, start] = useTransition();
  const next: ViewMode = mode === "simple" ? "full" : "simple";
  const label = mode === "simple" ? "Switch to full binder" : "Switch to large print";
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() => start(async () => { await setViewMode(next); window.location.reload(); })}
      className={`btn border border-mist/50 px-4 text-paper hover:bg-evergreen-mid/40 disabled:opacity-60 ${className}`}
    >
      {label}
    </button>
  );
}
