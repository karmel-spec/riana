import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Insurance & Taxes" };

export default async function Page() {
  await requireSection("insurance");
  return <ComingSoon title="Insurance & Taxes" phase="phase 2 (Binder)" />;
}
