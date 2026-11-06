"use server";

import { cookies } from "next/headers";
import { VIEW_COOKIE } from "@/lib/session";

/** Full = the complete binder; Brief = the simplified large-text version parents see. */
export async function setView(view: "full" | "brief") {
  (await cookies()).set(VIEW_COOKIE, view, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
}
