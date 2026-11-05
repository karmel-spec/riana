# Greene Family Binder

A private, role-based web app for the Greene family: a living "I'm dead, now what" binder plus a family history archive, with Riana (the family's AI assistant) feeding updates through an approval queue.

**Status: Phase 1 (foundation) + first screens.** Everything runs on clearly fake sample data. No real family data, credentials, or documents are in this repository, and none should ever be committed.

## What's here

| Area | State |
|---|---|
| Database schema for all 16 binder sections | Done (`supabase/migrations`) |
| Roles, per-section + per-document permissions, 2-step-verification rule | Done, enforced by Postgres row-level security |
| Append-only audit log and change history ("what changed, when, by whom, via Riana?") | Done |
| Break-glass emergency access, two-admin approval for bulk sends | Done |
| 90 automated permission tests | Done (`npm run test:db`) |
| Dashboard (admins/family) and simplified large-text Parent view | Done |
| Urgent Questions, Legal & Estate status board, Contacts & Who to Notify, Calendar, Final Wishes | Done (read + core edits) |
| Riana approval inbox, Audit log screen | Done |
| Riana inbound endpoint (`POST /api/riana/inbound`, per-agent keys, idempotent, audited) | Done (`docs/RIANA_INBOUND.md`) |
| Magic-link sign-in (Supabase Auth) | Wired; 2FA enrollment screen is a placeholder until a Supabase project exists |
| Health, Properties, Money, Insurance, Digital, Household, Family History | Tables + permissions done; screens are "coming soon" (phases 2–6) |

## Run it locally with fake data

```bash
npm install
npm run dev
```

`.env.local` sets `GREENE_DEMO=1`, which serves the fake fixtures with a **"View as"** switcher in the sidebar (Karmel, Heather, Diana, Rich, David, a grandchild). No login, no database. Demo mode can only turn on when no Supabase URL is configured, so a real deployment can't fall into it by accident.

## Test the database security rules

```bash
npm run test:db
```

Spins up a throwaway local Postgres, applies the migrations and fake seed, and runs `supabase/tests/10_rls_test.sql`: anonymous access, every role, 2FA gating, break-glass, audit immutability, last-4-only account numbers, and the two-admin send approval.

## Connect a real Supabase project (when ready)

1. Create a Supabase project. In **Authentication**, enable Email (magic link) with *Allow new users to sign up* **off**, and enable MFA (TOTP).
2. Run the migrations in order (`supabase db push` or paste them into the SQL editor). **Do not** run `supabase/tests/*` or `supabase/seed.sql` against the real project unless you want the fake data there.
3. Invite each family member by email in Authentication → Users, then insert their row into `public.profiles` with the right `app_role` (and `is_subject` for Rich and Diana). An admin UI for this is in phase 1 hardening.
4. Set the environment variables listed in `.env.example` and **remove** `GREENE_DEMO`.

## Security notes

- No SSNs, birthdates, passwords, or full account numbers have columns. Account and policy numbers are last-4 only and checked at the database.
- Logins are referenced by the *name* of a password-vault item (e.g. 1Password), never the credential.
- Every sensitive page view, edit, download, approval, and permission change is written to `audit_log`, which no role can edit or delete.
- Health, money, legal, and admin sections refuse any session that hasn't completed 2-step verification (`aal2`), including super admins.
- Responses are sent with `Cache-Control: private, no-store`, `X-Frame-Options: DENY`, and `noindex`.

## Layout

```
supabase/migrations/   schema, permissions, triggers, RPCs
supabase/tests/        local-only Supabase stand-in + RLS tests
supabase/seed.sql      GENERATED fake data (scripts/gen-seed.mts)
src/lib/demo/          the fake fixtures and demo identities
src/lib/session.ts     who is signed in + what they may see
src/lib/data.ts        all reads (real DB or demo store)
src/app/actions/       all writes (re-check permissions, then DB or demo store)
src/app/(app)/         the binder screens
src/components/shell/  main sidebar frame and the simplified parent frame
```
