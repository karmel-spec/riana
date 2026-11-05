# Connecting the real database and sign-in

> **Status (5 Nov 2026):** steps 1, 3 and 4 are done. The project `greene-binder`
> exists in the Brigham Larson Pianos organization (ref `aqroduvxsbdwysriuizu`,
> region us-west-1), all four migrations are applied and recorded, and Karmel's
> super-admin invitation is in. **Still to do by hand:** step 2 (Authentication
> settings), Heather's invitation in step 4, step 5 (Netlify variables), and
> the "before any real data" items. The values for step 5 are:
>
> - `NEXT_PUBLIC_SUPABASE_URL` = `https://aqroduvxsbdwysriuizu.supabase.co`
> - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_qxrRkzArY32Kf7uns1q28A_yToJJWhV`
>
> The security advisor reports `public.is_invited` as a SECURITY DEFINER function
> callable by `anon`. That is intentional: it returns only true/false so the
> login page can refuse uninvited addresses, and never lists emails.

Everything below happens once, in your Supabase account and in Netlify. Allow about 30 minutes. Nothing here puts family data anywhere; it only creates the empty, locked-down database and turns on sign-in.

## 1. Create the project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Name: `greene-binder`. Region: **West US (Oregon)** or the closest option. Plan: Free is fine to start; Pro adds daily backups and is worth it before real data goes in.
3. Set a strong **database password** and save it in 1Password. You need it once, in step 3.
4. Wait for the project to finish provisioning (a minute or two).

## 2. Turn on sign-in the way the app expects

In the left sidebar, **Authentication**:

- **Sign In / Providers → Email**: turn **on** *Enable Email provider*. Turn **off** *Allow new users to sign up*? **No, leave it on.** The app only lets invited emails through, and the database refuses a profile to anyone else. (If you turn sign-ups off, invited people can't create their account from the magic link.)
- **Sign In / Providers → Email**: *Confirm email* can stay on. Set the **OTP expiry** to 600 seconds (10 minutes) so the link doesn't expire while someone finds their reading glasses.
- **Multi-Factor**: enable **TOTP** and **WebAuthn**. (WebAuthn is what makes Face ID / Touch ID work.)
- **URL Configuration**: *Site URL* = your Netlify address, e.g. `https://greene-binder.netlify.app`. Under *Redirect URLs* add `https://greene-binder.netlify.app/auth/callback` and, for local testing, `http://localhost:3000/auth/callback`.
- **Email Templates → Magic Link**: optional, but a warmer message helps. Keep `{{ .ConfirmationURL }}` in it.
- **Rate Limits**: defaults are fine.

## 3. Create the tables and security rules

You need the project's connection string: **Project Settings → Database → Connection string → URI**, choose **Session** mode, and paste your database password into it.

From a terminal in this repo:

```bash
DATABASE_URL='postgresql://postgres.xxxx:YOUR-PASSWORD@aws-0-us-west-1.pooler.supabase.com:5432/postgres' ./scripts/apply-migrations.sh
```

It applies the four migration files in order and remembers which ran, so it's safe to run again later when there are new ones. If you'd rather not use a terminal, paste each file from `supabase/migrations/` into **SQL Editor** in order and run it.

**Do not** run anything from `supabase/tests/` or `supabase/seed.sql` against this project. Those are fake data for local testing.

## 4. Invite yourself

The first super admin has to be added by hand, because nobody is signed in yet to do it from the app. In **SQL Editor** run (with your real name and email):

```sql
insert into public.invitations (email, display_name, app_role)
values ('karmel@example.com', 'Karmel', 'super_admin'),
       ('heather@example.com', 'Heather', 'super_admin');
```

Everyone after that, including Mom and Dad, you invite from **Admin → People & Access** inside the app.

## 5. Point the app at the project

**Project Settings → API** has two values:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **Publishable key** (starts `sb_publishable_`; on older projects it's called the *anon* key) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

In Netlify: **Site configuration → Environment variables**. Add those two, add `NEXT_PUBLIC_SITE_URL` = your Netlify address, and **delete `GREENE_DEMO`**. Then **Deploys → Trigger deploy**.

The publishable key is safe to expose; it can only do what the row-level-security rules allow, which for a stranger is nothing. The **secret / service_role key** is different: the app doesn't use it, so don't put it anywhere.

## 6. First sign-in

1. Open the site. Enter your email. Click the link in the email.
2. You'll land on **2-step verification**. On an iPad or iPhone choose *Use this device* (Face ID); on a computer either option works.
3. You're in, as Super Admin. Go to **People & Access** and invite Heather, then Mom and Dad (role *Parent*, choose which), then siblings.

## What to expect

- Signing in on a new device asks for the magic link again, then 2-step verification again. Sessions last a week by default.
- A sibling without 2-step verification can still sign in and see the calendar, wishes and history; health and legal stay locked until they verify.
- Everything anyone does in a sensitive section shows in **Admin → Audit Log**.

## Before any real data goes in

- Switch to the **Pro** plan for daily backups and point-in-time recovery.
- Turn on **Project Settings → Database → Enforce SSL**.
- Keep the database password and the connection string only in 1Password.
