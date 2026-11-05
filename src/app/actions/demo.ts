"use server";

import { cookies } from "next/headers";
import { isDemo } from "@/lib/env";
import { DEMO_COOKIE } from "@/lib/session";
import { DEMO_USERS } from "@/lib/demo/users";

export async function switchDemoUser(key: string) {
  if (!isDemo()) throw new Error("Not in demo mode.");
  if (!DEMO_USERS.some((u) => u.key === key)) throw new Error("Unknown demo user.");
  (await cookies()).set(DEMO_COOKIE, key, { httpOnly: true, sameSite: "lax", path: "/" });
}
