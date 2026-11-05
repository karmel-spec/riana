import { cookies } from "next/headers";
import { getViewer } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { ParentShell } from "@/components/shell/parent-shell";
import { DEMO_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  const parent = v.role === "parent";
  // Keyed on the demo identity so switching roles re-renders the frame.
  const key = v.demo ? ((await cookies()).get(DEMO_COOKIE)?.value ?? "") : v.id;
  return (
    <div key={key} data-text={parent ? "large" : undefined} className="contents">
      <TextScale large={parent} />
      {parent ? <ParentShell>{children}</ParentShell> : <AppShell>{children}</AppShell>}
    </div>
  );
}

/** Sets html[data-text] so the whole page scales, without a client component. */
function TextScale({ large }: { large: boolean }) {
  const js = `document.documentElement.dataset.text=${JSON.stringify(large ? "large" : "")};`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
