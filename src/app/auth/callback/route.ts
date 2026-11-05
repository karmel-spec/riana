import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Magic-link landing: exchanges the code for a session, then goes home. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await supabase.rpc("log_view", { p_section: null, p_entity: "sign_in" }).then(() => {}, () => {});
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", req.url));
}
