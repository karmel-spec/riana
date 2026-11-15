import Link from "next/link";
import { getViewer } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Change password" };
export const dynamic = "force-dynamic";

export default async function PasswordPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const v = await getViewer();
  const { reset } = await searchParams;
  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-12">
      <PageHeader title={reset ? "Choose a new password" : "Change your password"} intro={`${reset ? "You’re signed in" : "Signed in"} as ${v.name}. Pick something long and easy for you to remember, like a short sentence.`} />
      <div className="card">
        {v.demo ? <p className="text-ink-soft">The sample-data preview has no passwords.</p> : <PasswordForm />}
      </div>
      <p className="mt-4"><Link href="/">Back to the binder</Link></p>
    </main>
  );
}
