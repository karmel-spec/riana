"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "@/app/actions/auth";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="password" className="label">New password</label>
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Type it again</label>
        <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field" />
      </div>
      {state && <p className={`rounded-xl px-4 py-3 ${state.ok ? "bg-evergreen-tint text-evergreen" : "bg-ember-tint text-ember"}`}>{state.message}</p>}
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Change password"}</button>
    </form>
  );
}
