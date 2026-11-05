"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, { error: "" });
  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="label">Your email</label>
        <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="field" placeholder="you@example.com" />
      </div>
      {state.error && <p className="rounded-xl bg-ember-tint px-4 py-3 text-ember">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
      <p className="text-center text-[0.9rem] text-ink-soft">Admins and anyone with health, money or legal access will also be asked for a 2-step verification code.</p>
    </form>
  );
}
