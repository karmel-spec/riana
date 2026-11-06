import { cookies } from "next/headers";
import { getViewer } from "@/lib/session";
import { ADMIN_NAV, NAV, visibleNav } from "@/lib/nav";
import { DEMO_COOKIE } from "@/lib/session";
import { Sidebar } from "./sidebar";
import { DemoSwitcher } from "./demo-switcher";
import { SampleBanner } from "./sample-banner";
import { ViewToggle } from "./view-toggle";
import type { ViewMode } from "@/lib/view-mode";

const ROLE_BLURB = {
  super_admin: "Co-executor · Super Admin",
  parent: "Parent",
  family: "Family member",
  posterity: "Family history & wishes",
  professional: "Professional · limited access",
} as const;

/** The main binder frame: evergreen sidebar + parchment content. */
export async function AppShell({ children, mode }: { children: React.ReactNode; mode: ViewMode }) {
  const v = await getViewer();
  const strip = (items: typeof NAV) => visibleNav(v, items).map((i) => ({ href: i.href, label: i.label, section: i.section, built: i.built }));
  const demoKey = v.demo ? ((await cookies()).get(DEMO_COOKIE)?.value ?? "karmel") : "";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar
        items={strip(NAV)}
        adminItems={v.role === "super_admin" ? strip(ADMIN_NAV) : []}
        viewerName={v.name}
        viewerBlurb={ROLE_BLURB[v.role]}
        demo={v.demo}
      >
        {v.demo && <DemoSwitcher current={demoKey} />}
        <ViewToggle mode={mode} className="mt-3 text-[0.9rem]" />
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <SampleBanner demo={v.demo} />
        <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-8 sm:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
