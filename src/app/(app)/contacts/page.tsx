import Link from "next/link";
import { requireSection, canRead, canWrite } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { Directory } from "./directory";
import { AddPersonForm } from "./add-person-form";

export const metadata = { title: "Contacts & Who to Notify" };

export default async function ContactsPage() {
  const v = await requireSection("contacts");
  const [people, groups, lists] = await Promise.all([data.getPeople(v), data.getGroups(v), data.getNotificationLists(v)]);
  await data.logView(v, "contacts", "people");
  const parent = v.brief;
  const mine = parent ? people.filter((p) => p.connected_to === v.isSubject || p.connected_to === "both") : people;
  const unconfirmed = mine.filter((p) => !p.confirmed).length;

  return (
    <>
      <PageHeader
        eyebrow={parent ? undefined : "Sections 3 & 16"}
        title={parent ? "People in your life" : "Contacts & who to notify"}
        intro={parent
          ? `Is this list right? Tap “Yes, that's right” on each person, or tell us who's missing.${unconfirmed ? ` ${unconfirmed} still to check.` : ""}`
          : "Family, friends, church, clubs, neighbors, veterans and professionals, grouped so the right people hear the right news."}
        actions={
          <>
            {!parent && canRead(v, "notify") && <Link href="/contacts/notify" className="btn-secondary">Notification lists ({lists.length})</Link>}
            {canWrite(v, "contacts") && <AddPersonForm groups={groups} parent={parent} />}
          </>
        }
      />
      <Directory people={mine} groups={groups} canEdit={canWrite(v, "contacts")} parent={parent} />
    </>
  );
}
