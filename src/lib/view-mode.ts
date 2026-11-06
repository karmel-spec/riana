import type { Viewer } from "./session";

/** "simple" = the large-print parent frame; "full" = the sidebar binder. */
export type ViewMode = "full" | "simple";

export const VIEW_COOKIE = "greene_view";

export const isViewMode = (s: unknown): s is ViewMode => s === "full" || s === "simple";

/** The frame a viewer sees: their saved choice, else the default for their role. */
export function resolveViewMode(v: Pick<Viewer, "role">, cookie: string | undefined): ViewMode {
  if (isViewMode(cookie)) return cookie;
  return v.role === "parent" ? "simple" : "full";
}
