import { requireSection } from "@/lib/session";
import { ComingSoon } from "@/components/ui";

export const metadata = { title: "Digital Accounts" };

export default async function Page() {
  await requireSection("digital_accounts");
  return <ComingSoon title="Digital Accounts" phase="phase 2 (Binder)" />;
}
