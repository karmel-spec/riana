import Link from "next/link";
import { redirect } from "next/navigation";
import { isDemo } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { MfaClient } from "./mfa-client";

export const metadata = { title: "2-step verification" };
export const dynamic = "force-dynamic";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (isDemo()) {
    return (
      <Frame>
        <p className="text-ink-soft">In the sample-data preview there is no sign-in, so there is nothing to verify. On the real site this screen asks for Face ID, a fingerprint, or a code from an authenticator app before health, money and legal sections open.</p>
        <Link href="/" className="btn-primary mt-4">Back to the binder</Link>
      </Frame>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect(safeNext);
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = (factors?.all ?? []).filter((f) => f.status === "verified").map((f) => ({ id: f.id, type: f.factor_type, name: f.friendly_name ?? "" }));

  return (
    <Frame>
      <MfaClient factors={verified} next={safeNext} />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-12">
      <div className="mb-6">
        <div className="eyebrow">One more step</div>
        <h1 className="text-[2.2rem] font-semibold leading-tight">2-step verification</h1>
        <p className="mt-2 text-ink-soft">Health, money and legal sections open only after a second check on this sign-in. It takes a few seconds.</p>
      </div>
      <div className="card">{children}</div>
    </main>
  );
}
