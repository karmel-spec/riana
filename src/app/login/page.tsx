import { redirect } from "next/navigation";
import { isDemo } from "@/lib/env";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string }> }) {
  if (isDemo()) redirect("/");
  const { error, sent } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <div className="eyebrow">Private family site</div>
          <h1 className="text-[2.2rem] font-semibold leading-tight">The Greene Family Binder</h1>
          <p className="mt-2 text-ink-soft">Sign in with your password, or have a link emailed to you.</p>
        </div>
        <div className="card">
          {sent ? (
            <div className="flex flex-col gap-3 text-center">
              <p>{sent === "reset" ? "Check your email for a link from the binder. Open it on this device and you’ll be asked to choose a new password. It works for 10 minutes." : "Check your email for a link from the binder. It works for 10 minutes."}</p>
              <p className="text-[0.9rem] text-ink-soft">It can take a few minutes and sometimes lands in spam.</p>
              <a href="/login" className="font-semibold text-evergreen underline">Back to sign in</a>
            </div>
          ) : (
            <LoginForm />
          )}
          {error === "no-access" && (
            <div className="mt-4 rounded-xl bg-ember-tint px-4 py-3 text-ember">
              <p>That email signed in, but it isn’t on the family list yet. Ask Karmel or Heather to add you.</p>
              <form action="/logout" method="post" className="mt-2"><button className="min-h-0 underline">Sign out</button></form>
            </div>
          )}
          {error === "link" && (
            <p className="mt-4 rounded-xl bg-ember-tint px-4 py-3 text-ember">That link has expired or was already used. Request a new one.</p>
          )}
        </div>
      </div>
    </main>
  );
}
