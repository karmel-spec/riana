import { redirect } from "next/navigation";

/** Household now lives on the Home page. */
export default function HouseholdPage() {
  redirect("/properties#household");
}
