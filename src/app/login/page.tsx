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
          <p className="mt-2 text-ink-soft">We’ll email you a sign-in link. No password to remember.</p>
        </div>
        <div className="card">
          {sent ? (
            <p className="text-center">Check your email for a link from the binder. It works for 10 minutes.</p>
          ) : (
            <LoginForm />
          )}
          {error === "no-access" && (
            <p className="mt-4 rounded-xl bg-ember-tint px-4 py-3 text-ember">That email signed in, but it isn’t on the family list yet. Ask Karmel or Heather to add you.</p>
          )}
          {error === "link" && (
            <p className="mt-4 rounded-xl bg-ember-tint px-4 py-3 text-ember">That link has expired or was already used. Request a new one.</p>
          )}
        </div>
      </div>
    </main>
  );
}
