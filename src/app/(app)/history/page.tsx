import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Family History" };

export default async function Page() {
  await requireSection("family_history");
  return <ComingSoon title="Family History" phase="phase 6 (Family history archive)" />;
}
