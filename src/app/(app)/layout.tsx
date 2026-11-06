import { cookies } from "next/headers";
import { getViewer } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";
import { ParentShell } from "@/components/shell/parent-shell";
import { DEMO_COOKIE } from "@/lib/session";
import { resolveViewMode, VIEW_COOKIE } from "@/lib/view-mode";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const v = await getViewer();
  const jar = await cookies();
  // Parents land in the large-print frame; anyone can flip it with the view toggle.
  const mode = resolveViewMode(v, jar.get(VIEW_COOKIE)?.value);
  const simple = mode === "simple";
  // Keyed on identity + frame so switching either one re-renders the whole shell.
  const key = `${v.demo ? (jar.get(DEMO_COOKIE)?.value ?? "") : v.id}:${mode}`;
  return (
    <div key={key} data-text={simple ? "large" : undefined} className="contents">
      <TextScale large={simple} />
      {simple ? <ParentShell mode={mode}>{children}</ParentShell> : <AppShell mode={mode}>{children}</AppShell>}
    </div>
  );
}

/** Sets html[data-text] so the whole page scales, without a client component. */
function TextScale({ large }: { large: boolean }) {
  const js = large
    ? 'document.documentElement.setAttribute("data-text","large");'
    : 'document.documentElement.removeAttribute("data-text");';
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
