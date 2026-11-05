import { requireSuperAdmin } from "@/lib/session";
import { getGrants, getInvitations, getProfiles } from "@/lib/admin-data";
import { PageHeader } from "@/components/ui";
import { PeopleAdmin } from "./people-admin";

export const metadata = { title: "People & Access" };

export default async function PeoplePage() {
  const v = await requireSuperAdmin();
  const [profiles, invitations, grants] = await Promise.all([getProfiles(v), getInvitations(v), getGrants(v)]);
  return (
    <>
      <PageHeader eyebrow="Admin" title="People & access"
        intro="Who can sign in, what role they have, and any extra sections they’ve been given. Every change here is written to the audit log." />
      {v.demo && <p className="mb-5 rounded-xl bg-brass-tint px-4 py-3 text-brass-deep">Read-only in the sample-data preview. On the real site you can invite people and change access here.</p>}
      <PeopleAdmin profiles={profiles} invitations={invitations} grants={grants} selfId={v.id} readOnly={v.demo} />
    </>
  );
}
