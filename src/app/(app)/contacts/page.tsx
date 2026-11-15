import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { Directory } from "./directory";
import { AddPersonForm } from "./add-person-form";
import { todayIn } from "@/lib/people/birthdays";

export const metadata = { title: "Contacts & Who to Notify" };

export default async function ContactsPage() {
  const v = await requireSection("contacts");
  const [people, groups, lists] = await Promise.all([data.getPeople(v), data.getGroups(v), data.getNotificationLists(v)]);
  await data.logView(v, "contacts", "people");
  const parent = v.brief;
  // Rich and Diana each see their own people plus the shared ones; anyone else looking at the Brief view sees everyone.
  const mine = parent && v.isSubject ? people.filter((p) => p.connected_to === v.isSubject || p.connected_to === "both") : people;
  const unconfirmed = mine.filter((p) => !p.confirmed).length;

  return (
    <>
      <PageHeader
        eyebrow={parent ? undefined : "Sections 3 & 16"}
        title={parent ? "Your contacts" : "Contacts & who to notify"}
        intro={parent
          ? `Tap Call or Text to reach someone. Tap Edit to fix a number or address, or add someone who is missing.${unconfirmed ? ` ${unconfirmed} still to check.` : ""}`
          : "Family, friends, church, clubs, neighbors, veterans and professionals, grouped so the right people hear the right news."}
        actions={
          <>
            {!parent && canRead(v, "notify") && <Link href="/contacts/notify" className="btn-secondary">Notification lists ({lists.length})</Link>}
            {canWrite(v, "contacts") && <AddPersonForm groups={groups} parent={parent} />}
          </>
        }
      />
      <Directory people={mine} groups={groups} canEdit={canWrite(v, "contacts")} parent={parent} today={todayIn()} />
    </>
  );
}
