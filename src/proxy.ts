import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Runs before every page: refreshes the Supabase session cookie and sends
 * signed-out visitors to /login. Real authorization happens in Postgres
 * (row-level security) and in each page's requireSection(); this is only
 * the front door.
 */
export async function proxy(request: NextRequest) {
  const demo = process.env.GREENE_DEMO === "1" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (demo) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  // /api/riana/ authenticates with its own bearer key (see src/app/api/riana/inbound/route.ts).
  const isPublic = path.startsWith("/login") || path.startsWith("/auth/") || path.startsWith("/api/riana/");
  if (!user && !isPublic) {
    const to = request.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webmanifest)$).*)"],
};
