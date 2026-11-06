"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, signInWithPassword } from "@/app/actions/auth";

export function LoginForm() {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [linkState, linkAction, linkPending] = useActionState(sendMagicLink, { error: "" });
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, { error: "" });

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 gap-1 rounded-xl bg-parchment p-1">
        <button type="button" role="tab" aria-selected={mode === "password"} onClick={() => setMode("password")} className={`min-h-[44px] rounded-lg font-semibold ${mode === "password" ? "bg-paper text-evergreen shadow-sm" : "text-ink-soft"}`}>Password</button>
        <button type="button" role="tab" aria-selected={mode === "link"} onClick={() => setMode("link")} className={`min-h-[44px] rounded-lg font-semibold ${mode === "link" ? "bg-paper text-evergreen shadow-sm" : "text-ink-soft"}`}>Email me a link</button>
      </div>

      {mode === "password" ? (
        <form action={pwAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="label">Your email</label>
            <input id="email" name="email" type="email" required autoComplete="username" inputMode="email" className="field" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
          </div>
          {pwState.error && <p className="rounded-xl bg-ember-tint px-4 py-3 text-ember">{pwState.error}</p>}
          <button className="btn-primary" disabled={pwPending}>{pwPending ? "Signing in…" : "Sign in"}</button>
          <p className="text-center text-[0.9rem] text-ink-soft">Karmel or Heather set your first password. You can change it inside the binder.</p>
        </form>
      ) : (
        <form action={linkAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email-link" className="label">Your email</label>
            <input id="email-link" name="email" type="email" required autoComplete="email" inputMode="email" className="field" placeholder="you@example.com" />
          </div>
          {linkState.error && <p className="rounded-xl bg-ember-tint px-4 py-3 text-ember">{linkState.error}</p>}
          <button className="btn-primary" disabled={linkPending}>{linkPending ? "Sending…" : "Email me a sign-in link"}</button>
          <p className="text-center text-[0.9rem] text-ink-soft">Links can take a few minutes and sometimes land in spam. If nothing arrives, use a password instead.</p>
        </form>
      )}
      <p className="text-center text-[0.9rem] text-ink-soft">Admins and anyone with health, money or legal access will also be asked for 2-step verification.</p>
    </div>
  );
}
