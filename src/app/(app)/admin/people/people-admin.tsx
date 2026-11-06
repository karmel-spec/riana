"use client";

import { useActionState, useState, useTransition } from "react";
import type { GrantRow, InvitationRow, ProfileRow } from "@/lib/admin-data";
import { GRANTABLE, SECTION_LABELS } from "@/lib/permissions";
import { addGrant, addInvitation, changeRole, removeGrant, removeInvitation, setUserPassword } from "@/app/actions/admin";
import { fmtDate } from "@/lib/format";
import { Empty } from "@/components/ui";

const ROLE: Record<string, string> = {
  super_admin: "Super Admin", parent: "Parent", family: "Family member", posterity: "Grandchild / posterity", professional: "Professional",
};
const ROLE_HELP: Record<string, string> = {
  super_admin: "Everything, plus this page and the audit log. Requires 2-step verification.",
  parent: "Their whole binder, in the large simplified view. Edits wishes, stories, answers and contacts.",
  family: "Health, calendar, final wishes, contacts and family history. No money or legal unless granted.",
  posterity: "Family history, journals, photos and final wishes only.",
  professional: "Nothing by default. Give specific sections below, always with an end date.",
};

type Props = { profiles: ProfileRow[]; invitations: InvitationRow[]; grants: GrantRow[]; selfId: string; readOnly: boolean };

export function PeopleAdmin({ profiles, invitations, grants, selfId, readOnly }: Props) {
  const pending = invitations.filter((i) => !i.accepted_at);
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 text-[1.5rem] font-semibold">People with access ({profiles.length})</h2>
        <ul className="flex flex-col gap-3">
          {profiles.map((p) => <PersonCard key={p.id} p={p} grants={grants.filter((g) => g.user_id === p.id)} isSelf={p.id === selfId} readOnly={readOnly} />)}
        </ul>
      </section>

      <section>
        <h2 className="mb-1 text-[1.5rem] font-semibold">Invitations</h2>
        <p className="mb-3 text-ink-soft">Add someone here, then tell them to go to the site and enter their email. The first sign-in creates their account with this role. Nobody can get in without an invitation.</p>
        {!readOnly && <InviteForm />}
        {pending.length === 0 ? <Empty>No invitations waiting.</Empty> : (
          <ul className="mt-4 flex flex-col gap-2">
            {pending.map((i) => <InviteRow key={i.id} i={i} readOnly={readOnly} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

function RoleFields({ defaults, prefix }: { defaults?: Partial<ProfileRow & InvitationRow>; prefix: string }) {
  const [role, setRole] = useState(defaults?.app_role ?? "family");
  return (
    <>
      <div>
        <label htmlFor={`${prefix}-role`} className="label">Role</label>
        <select id={`${prefix}-role`} name="app_role" value={role} onChange={(e) => setRole(e.target.value as ProfileRow["app_role"])} className="field">
          {Object.entries(ROLE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <p className="mt-1 text-[0.85rem] text-ink-soft">{ROLE_HELP[role]}</p>
      </div>
      {role === "parent" && (
        <div>
          <label htmlFor={`${prefix}-subj`} className="label">Which parent</label>
          <select id={`${prefix}-subj`} name="is_subject" defaultValue={defaults?.is_subject ?? ""} className="field">
            <option value="">—</option><option value="rich">Rich</option><option value="diana">Diana</option>
          </select>
        </div>
      )}
      {role === "professional" && (
        <div>
          <label htmlFor={`${prefix}-exp`} className="label">Access ends on</label>
          <input id={`${prefix}-exp`} type="date" name="access_expires_at" defaultValue={defaults?.access_expires_at?.slice(0, 10) ?? ""} className="field" required />
        </div>
      )}
    </>
  );
}

function PersonCard({ p, grants, isSelf, readOnly }: { p: ProfileRow; grants: GrantRow[]; isSelf: boolean; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const [granting, setGranting] = useState(false);
  const [pw, setPw] = useState(false);
  const [pwState, pwAction, pwPending] = useActionState(setUserPassword, null);
  const [lastPw, setLastPw] = useState(pwState);
  if (pwState !== lastPw) { setLastPw(pwState); if (pwState?.ok) setPw(false); }
  const [roleState, roleAction, rolePending] = useActionState(changeRole, null);
  const [grantState, grantAction, grantPending] = useActionState(addGrant, null);
  const [, start] = useTransition();
  const [lastRole, setLastRole] = useState(roleState);
  if (roleState !== lastRole) { setLastRole(roleState); if (roleState?.ok) setEditing(false); }
  const [lastGrant, setLastGrant] = useState(grantState);
  if (grantState !== lastGrant) { setLastGrant(grantState); if (grantState?.ok) setGranting(false); }
  const expired = p.access_expires_at && new Date(p.access_expires_at) < new Date();

  return (
    <li className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[1.15rem] font-semibold">{p.display_name}{isSelf && <span className="ml-2 text-[0.85rem] font-normal text-ink-soft">(you)</span>}</div>
          <div className="text-ink-soft">
            {ROLE[p.app_role]}{p.is_subject && ` · ${p.is_subject === "rich" ? "Rich" : "Diana"}`}
            {p.access_expires_at && <span className={expired ? " font-semibold text-ember" : ""}> · {expired ? "expired" : "until"} {fmtDate(p.access_expires_at, { year: "numeric" })}</span>}
            {" · "}joined {fmtDate(p.created_at, { year: "numeric" })}
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing((e) => !e)} className="btn-secondary px-4 text-[0.95rem]">Change role</button>
            <button type="button" onClick={() => setGranting((g) => !g)} className="btn-secondary px-4 text-[0.95rem]">Give a section</button>
            <button type="button" onClick={() => setPw((p) => !p)} className="btn-secondary px-4 text-[0.95rem]">Set password</button>
          </div>
        )}
      </div>

      {grants.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {grants.map((g) => (
            <li key={g.id} className={`flex items-center gap-2 rounded-lg px-3 py-1 text-[0.9rem] ${g.break_glass ? "bg-ember-tint text-ember" : "bg-evergreen-tint text-evergreen"}`}>
              <span><strong>{SECTION_LABELS[g.section]}</strong> · {g.level}{g.expires_at && ` until ${fmtDate(g.expires_at)}`}{g.break_glass && " · break-glass"}</span>
              {!readOnly && <button type="button" aria-label={`Remove ${SECTION_LABELS[g.section]} grant`} onClick={() => start(() => { removeGrant(g.id); })} className="min-h-0 font-bold">×</button>}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <form action={roleAction} className="mt-4 grid gap-3 border-t border-rule-soft pt-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <RoleFields defaults={p} prefix={`r-${p.id}`} />
          {roleState && !roleState.ok && <p className="text-ember sm:col-span-2">{roleState.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary px-4" disabled={rolePending}>{rolePending ? "Saving…" : "Save role"}</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </form>
      )}

      {pw && (
        <form action={pwAction} className="mt-4 grid gap-3 border-t border-rule-soft pt-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={p.id} />
          <div className="sm:col-span-2">
            <label htmlFor={`pw-${p.id}`} className="label">New password for {p.display_name}</label>
            <input id={`pw-${p.id}`} name="password" type="text" autoComplete="off" minLength={10} required className="field" placeholder="10+ characters; a short sentence works well" />
            <p className="mt-1 text-[0.85rem] text-ink-soft">Tell them in person or by phone, never by email. They can change it afterwards.</p>
          </div>
          {pwState && !pwState.ok && <p className="text-ember sm:col-span-2">{pwState.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary px-4" disabled={pwPending}>{pwPending ? "Saving…" : "Set password"}</button>
            <button type="button" onClick={() => setPw(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </form>
      )}

      {granting && (
        <form action={grantAction} className="mt-4 grid gap-3 border-t border-rule-soft pt-4 sm:grid-cols-2">
          <input type="hidden" name="user_id" value={p.id} />
          <div>
            <label htmlFor={`g-s-${p.id}`} className="label">Section</label>
            <select id={`g-s-${p.id}`} name="section" className="field">{GRANTABLE.map((s) => <option key={s} value={s}>{SECTION_LABELS[s]}</option>)}</select>
          </div>
          <div>
            <label htmlFor={`g-l-${p.id}`} className="label">Level</label>
            <select id={`g-l-${p.id}`} name="level" className="field"><option value="read">Read only</option><option value="write">Read and edit</option></select>
          </div>
          <div>
            <label htmlFor={`g-e-${p.id}`} className="label">Ends on (optional)</label>
            <input id={`g-e-${p.id}`} type="date" name="expires_at" className="field" />
          </div>
          <div>
            <label htmlFor={`g-r-${p.id}`} className="label">Why</label>
            <input id={`g-r-${p.id}`} name="reason" className="field" placeholder="e.g. helping with Dad's VA claim" />
          </div>
          {grantState && !grantState.ok && <p className="text-ember sm:col-span-2">{grantState.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary px-4" disabled={grantPending}>{grantPending ? "Saving…" : "Give access"}</button>
            <button type="button" onClick={() => setGranting(false)} className="btn-secondary px-4">Cancel</button>
          </div>
        </form>
      )}
    </li>
  );
}

function InviteForm() {
  const [state, action, pending] = useActionState(addInvitation, null);
  const [key, setKey] = useState(0);
  const [last, setLast] = useState(state);
  if (state !== last) { setLast(state); if (state?.ok) setKey((k) => k + 1); }
  return (
    <form key={key} action={action} className="card grid gap-3 sm:grid-cols-2">
      <div><label htmlFor="inv-name" className="label">Name</label><input id="inv-name" name="display_name" required className="field" placeholder="As they like to be called" /></div>
      <div><label htmlFor="inv-email" className="label">Email</label><input id="inv-email" name="email" type="email" required className="field" /></div>
      <RoleFields prefix="inv" />
      <div className="sm:col-span-2">
        <label htmlFor="inv-pw" className="label">Starter password (optional, recommended)</label>
        <input id="inv-pw" name="starter_password" type="text" autoComplete="off" minLength={10} className="field" placeholder="A short sentence they can remember, 10+ characters" />
        <p className="mt-1 text-[0.85rem] text-ink-soft">With a starter password the account is created now and they can sign in today, no email needed. Tell them the password in person or by phone, and ask them to change it inside the binder.</p>
      </div>
      {state && !state.ok && <p className="text-ember sm:col-span-2">{state.error}</p>}
      {state?.ok && <p className="text-evergreen sm:col-span-2">Invitation added. They can sign in now.</p>}
      <div className="sm:col-span-2"><button className="btn-primary" disabled={pending}>{pending ? "Adding…" : "Add invitation"}</button></div>
    </form>
  );
}

function InviteRow({ i, readOnly }: { i: InvitationRow; readOnly: boolean }) {
  const [, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rule bg-paper px-4 py-3">
      <div><strong>{i.display_name}</strong> <span className="text-ink-soft">· {i.email} · {ROLE[i.app_role]}{i.is_subject && ` (${i.is_subject})`}</span></div>
      {!readOnly && <button type="button" onClick={() => start(() => { removeInvitation(i.id); })} className="btn text-[0.9rem] text-ink-soft">Remove</button>}
    </li>
  );
}
