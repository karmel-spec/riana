import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RESET_COOKIE } from "@/lib/auth-reset";

/** Magic-link landing: exchanges the code for a session, then goes home, or to the new-password page when the link was a "forgot my password" one. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await supabase.rpc("log_view", { p_section: null, p_entity: "sign_in" }).then(() => {}, () => {});
      const reset = req.cookies.get(RESET_COOKIE)?.value === "1";
      const res = NextResponse.redirect(new URL(reset ? "/account/password?reset=1" : "/", req.url));
      if (reset) res.cookies.delete(RESET_COOKIE);
      return res;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", req.url));
}
