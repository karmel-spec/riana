import { getViewer } from "@/lib/session";
import { MainDashboard } from "@/components/dashboard/main-dashboard";
import { ParentHome } from "@/components/dashboard/parent-home";

export default async function HomePage() {
  const v = await getViewer();
  return v.brief ? <ParentHome viewer={v} /> : <MainDashboard viewer={v} />;
}
