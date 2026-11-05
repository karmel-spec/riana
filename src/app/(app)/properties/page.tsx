import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Properties" };

export default async function Page() {
  await requireSection("properties");
  return <ComingSoon title="Properties" phase="phase 2 (Binder)" />;
}
