import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Health · Diana" };

export default async function Page() {
  await requireSection("health_diana");
  return <ComingSoon title="Health · Diana" phase="phase 2 (Binder) and phase 3 (lab charts)" />;
}
