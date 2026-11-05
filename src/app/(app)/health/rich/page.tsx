import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Health · Rich" };

export default async function Page() {
  await requireSection("health_rich");
  return <ComingSoon title="Health · Rich" phase="phase 2 (Binder) and phase 3 (lab charts)" />;
}
