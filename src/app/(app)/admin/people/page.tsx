import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "People & Access" };

export default async function Page() {
  await requireSection("admin");
  return <ComingSoon title="People & Access" phase="phase 1 hardening (admin UI for roles and grants)" />;
}
