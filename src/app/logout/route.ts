import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/env";

export async function POST(req: NextRequest) {
  if (!isDemo()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}
