import { PageHeader } from "@/components/ui";

export const metadata = { title: "2-step verification" };

export default function MfaPage() {
  return (
    <main className="mx-auto max-w-[560px] px-4 py-12">
      <PageHeader title="2-step verification" intro="Health, money and legal sections open only after a second check on this sign-in." />
      <div className="card">
        <p className="text-ink-soft">This screen will enroll and verify an authenticator app or passkey through Supabase Auth (MFA, AAL2). It is wired up when the real project is connected; the database already refuses sensitive data to any session without it.</p>
      </div>
    </main>
  );
}
