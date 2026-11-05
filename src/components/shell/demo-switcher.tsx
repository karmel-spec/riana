"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { DEMO_USERS } from "@/lib/demo/users";
import { switchDemoUser } from "@/app/actions/demo";

export function DemoSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="mt-3 block">
      <span className="text-[0.8rem] font-bold uppercase tracking-wide text-brass">Demo · view as</span>
      <select
        className="mt-1 w-full rounded-xl border border-mist/50 bg-evergreen-deep px-3 text-paper"
        value={current}
        disabled={pending}
        onChange={(e) => start(async () => { await switchDemoUser(e.target.value); router.push("/"); router.refresh(); })}
      >
        {DEMO_USERS.map((u) => <option key={u.key} value={u.key}>{u.name} — {u.blurb}</option>)}
      </select>
    </label>
  );
}
