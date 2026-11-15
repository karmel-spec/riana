import Link from "next/link";
import { getViewer } from "@/lib/session";
import { SampleBanner } from "./sample-banner";
import { ParentNav } from "./parent-nav";
import { ViewToggle } from "./view-toggle";

/**
 * The parent frame. Same colors and type as the main binder, but:
 * larger base text, a few big buttons instead of the long sidebar,
 * and nothing about money, bills, or admin.
 * On a phone: one slim bar on top and the main places as tabs along the bottom.
 */
export async function ParentShell({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  return (
    <div className="flex min-h-dvh w-full max-w-[100vw] flex-col overflow-x-clip">
      <header className="on-dark bg-evergreen text-paper">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <Link href="/" className="min-w-0 truncate font-serif text-[1rem] font-bold leading-tight text-paper no-underline sm:text-[1.5rem]">
            Rich &amp; Diana Greene
          </Link>
          <details className="group relative shrink-0">
            <summary aria-label={`Account: ${v.name}`} className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full bg-paper font-bold text-evergreen [&::-webkit-details-marker]:hidden">
              {v.name.trim().charAt(0).toUpperCase() || "?"}
            </summary>
            <div className="absolute right-0 top-[52px] z-50 flex w-[240px] flex-col gap-3 rounded-2xl border border-rule bg-paper p-4 text-ink shadow-lg">
              <div className="font-semibold">{v.name}</div>
              {v.role !== "parent" && (
                <div>
                  <div className="mb-1 text-[0.8rem] text-ink-soft">Version</div>
                  <div className="rounded-full bg-evergreen"><ViewToggle current="brief" /></div>
                </div>
              )}
              {!v.demo && <Link href="/account/password" className="flex min-h-[44px] items-center font-semibold text-evergreen">Change password</Link>}
              {!v.demo && <form action="/logout" method="post"><button className="btn-secondary w-full">Sign out</button></form>}
            </div>
          </details>
        </div>
        <ParentNav />
      </header>
      <SampleBanner demo={v.demo} />
      <main id="main" className="mx-auto w-full min-w-0 max-w-[1100px] flex-1 px-4 pb-28 pt-6 sm:px-8 sm:pt-10 md:pb-10">
        {children}
      </main>
    </div>
  );
}
