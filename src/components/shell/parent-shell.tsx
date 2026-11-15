import Link from "next/link";
import { getViewer } from "@/lib/session";
import { SampleBanner } from "./sample-banner";
import { ParentNav } from "./parent-nav";
import { ViewToggle } from "./view-toggle";

/**
 * The parent frame. Same colors and type as the main binder, but:
 * larger base text, a short row of big buttons instead of the long sidebar,
 * and nothing about money, bills, or admin.
 */
export async function ParentShell({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="on-dark bg-evergreen text-paper">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link href="/" className="font-serif text-[1.3rem] font-bold leading-tight text-paper no-underline sm:text-[1.5rem]">
            The Greene Family Binder
          </Link>
          <div className="flex items-center gap-4">
          {v.role !== "parent" && <ViewToggle current="brief" className="on-dark" />}
          <div className="text-right text-[0.85rem] text-mist">
            <div className="font-semibold text-paper">{v.name}</div>
            {!v.demo && (
              <div className="flex gap-3 justify-end">
                <Link href="/account/password" className="text-mist underline">Password</Link>
                <form action="/logout" method="post"><button className="min-h-0 underline">Sign out</button></form>
              </div>
            )}
          </div>
          </div>
        </div>
        <ParentNav />
      </header>
      <SampleBanner demo={v.demo} />
      <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
