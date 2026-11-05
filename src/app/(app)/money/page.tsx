import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Accounts, Bills & Loans" };

export default async function Page() {
  await requireSection("accounts");
  return <ComingSoon title="Accounts, Bills & Loans" phase="phase 2 (Binder) and phase 3 (bills dashboard)" />;
}
