"use server";

import { cookies } from "next/headers";
import { isViewMode, VIEW_COOKIE, type ViewMode } from "@/lib/view-mode";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Remembers whether this browser wants the large-print frame or the full binder. */
export async function setViewMode(mode: ViewMode) {
  if (!isViewMode(mode)) throw new Error("Unknown view mode.");
  (await cookies()).set(VIEW_COOKIE, mode, { httpOnly: true, sameSite: "lax", path: "/", maxAge: ONE_YEAR });
}
