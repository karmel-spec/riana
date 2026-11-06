import Link from "next/link";
import { requireSection } from "@/lib/session";
import * as data from "@/lib/data";
import { PageHeader, SectionCard } from "@/components/ui";
import { Lock } from "@/components/icons";

export const metadata = { title: "Passwords" };

const STEPS = [
  { title: "Ask a super admin for an invitation", body: "Access is by invitation only. A super admin sends the invite from 1Password to the email address you sign in to the binder with." },
  { title: "Accept the invite and install 1Password", body: "Open the email, create your 1Password account, and install the app on your phone and computer (and the browser extension, so logins fill in automatically)." },
  { title: "Save your Emergency Kit", body: "1Password gives you a one-page Emergency Kit with your sign-in address and Secret Key. Print it or keep it somewhere safe that isn’t 1Password itself. Without it, no one can recover your access." },
  { title: "Find a login", body: "Every row in the Accounts Directory names the vault item that holds its password. Search 1Password for that item name." },
];

export default async function PasswordsPage() {
  const v = await requireSection("digital_accounts");
  await data.logView(v, "digital_accounts", "passwords");
  const parent = v.brief;

  return (
    <>
      <PageHeader eyebrow={parent ? undefined : "Section 13 · Passwords"} title={parent ? "Your passwords" : "Passwords and 1Password access"}
        intro={parent ? "All of your passwords are kept in the family's 1Password vault. This page explains how to get in and who can help." : "How the family's shared 1Password vault works: who has access, how to get it, and where to look when you need a login. The vault holds the passwords; the binder only ever points to them."} />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rule bg-paper-warm px-5 py-4">
        <Lock className="mt-0.5 shrink-0 text-evergreen" />
        <p className="text-[0.95rem] text-ink-soft"><strong className="text-ink">No passwords are stored in the binder.</strong> Never type a password, Secret Key or recovery code into this app, a question, a note or a Riana update. If one is needed, it belongs in 1Password.</p>
      </div>

      <div className={`grid gap-6 ${parent ? "" : "lg:grid-cols-2"}`}>
        <SectionCard title={parent ? "How it works" : "The shared vault"}>
          <p className="text-ink-soft">The family uses <strong className="text-ink">1Password</strong>, a password manager, with a shared family vault for Rich and Diana’s logins. Each person who is given access signs in with their own account and can see the shared vault from their phone, computer or web browser.</p>
          {!parent && (
            <ul className="list-disc pl-5 text-ink-soft">
              <li><strong className="text-ink">Super admins</strong> manage the 1Password family account: they invite people, remove access, and recover accounts.</li>
              <li><strong className="text-ink">Family members</strong> with access to this section can use the shared vault to sign in on Rich and Diana’s behalf when needed.</li>
              <li>Vault items are named the way the binder refers to them, for example <em>“Greene – Truist”</em>, so what you see in the <Link href="/digital">Accounts Directory</Link> is what you search for in 1Password.</li>
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Getting access">
          <ol className="flex flex-col gap-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-evergreen-tint font-bold text-evergreen">{i + 1}</span>
                <div><div className="font-semibold">{s.title}</div><p className="text-[0.95rem] text-ink-soft">{s.body}</p></div>
              </li>
            ))}
          </ol>
        </SectionCard>

        {!parent && (
          <SectionCard title="If something goes wrong">
            <ul className="list-disc pl-5 text-ink-soft">
              <li><strong className="text-ink">Locked out of 1Password?</strong> A super admin can start account recovery for you from the family account. You’ll need to set a new account password.</li>
              <li><strong className="text-ink">A login in the vault doesn’t work?</strong> Reset it on the website, update the item in 1Password, and leave a note in the Accounts Directory row so others know it changed.</li>
              <li><strong className="text-ink">Someone should no longer have access?</strong> A super admin removes them from the family account, and the binder’s own access is adjusted in People &amp; Access.</li>
            </ul>
          </SectionCard>
        )}

        <SectionCard title="Related" link={{ href: "/digital", label: "Accounts Directory" }}>
          <p className="text-ink-soft">The Accounts Directory lists every known online account and which vault item holds its password, and tracks which ones still need to be found. Tax portals and their vault items are listed under Taxes for admins.</p>
        </SectionCard>
      </div>
    </>
  );
}
