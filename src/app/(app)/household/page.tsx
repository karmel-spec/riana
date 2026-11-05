import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Pets & Household" };

export default async function Page() {
  await requireSection("household");
  return <ComingSoon title="Pets & Household" phase="phase 2 (Binder)" />;
}
