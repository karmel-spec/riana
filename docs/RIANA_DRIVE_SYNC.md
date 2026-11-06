# Riana Drive sync: reading the Binder doc

Riana keeps the family's running notes in a Google Doc (the "Greene Family Binder" doc). This sync reads that doc and turns each new line into a pending update on **Admin → Updates from Riana**. Nothing changes in the binder until a super admin approves it there, the same as updates that arrive through the inbound endpoint.

The sync is read-only. It uses the same Google service account as the Drive import (see `docs/DRIVE_IMPORT.md`), which only sees what has been shared with it.

## One-time setup

1. **Have the service account.** If the Drive import is already connected, you are done with this step. Otherwise follow steps 1 and 2 of `docs/DRIVE_IMPORT.md` to create the service account and put its key in Netlify as `GOOGLE_SERVICE_ACCOUNT_JSON`.
2. **Share the doc.** In Google Docs, open the Binder doc → **Share** → paste the service account's email (shown at the top of Admin → Drive import, looks like `binder-import@….iam.gserviceaccount.com`) → **Viewer** → uncheck "Notify people" → Share.
3. **Register it.** On **Admin → Updates from Riana**, under *Binder doc sync*, give it a name and paste the doc's link, then **Add doc**. The app checks it can read the doc before saving. Up to ten docs can be registered; each can be paused or removed later.

## Running it

- **Preview** reads every enabled doc and shows what would be proposed, without writing anything.
- **Sync now** reads the docs and adds each new line to the inbox as a pending update, labeled "from the Binder doc". The run is recorded with the other Drive runs.

Re-running is safe. A line is proposed once: the app remembers each line by a fingerprint of its heading and text, so unchanged lines are skipped and a line that was rejected does not come back. Editing a line produces a fresh proposal for the new wording.

## How the doc is read

There is no fixed template; Riana writes the doc however she likes, and the app is forgiving. The rules:

- **Headings** are short lines with no bullet: `APPOINTMENTS`, `Lab results:`, `# Notes`, or a title that starts with a section word such as `Questions for Mom and Dad`.
- **Every other non-empty line** under a heading is one update. Bullets and numbering are stripped. Lines under eight characters are ignored.
- **The kind of update** comes from the heading, then from words in the line, then falls back to "note":

  | Words | Kind |
  |---|---|
  | appointment, visit, calendar, schedule, follow-up, surgery, procedure | appointment |
  | lab, A1C, blood, result, cholesterol, glucose, blood pressure, vitals | lab result |
  | bill, payment, invoice, due, autopay, premium, statement | bill |
  | question, ask, decide, decision, unknown | urgent question |
  | document, paperwork, form, will, trust, deed, policy, letter, scan | document |
  | anything else | note |

- **A date** in the line (`2026-11-12`, `11/12`, `Nov 12`) is kept with the update so the reviewer can see it.
- The doc's title line is skipped. Other text before the first heading is proposed as notes. A doc over 2 MB of text, or one that is not a Google Doc or plain-text file, is reported as unreadable.

A doc that works well looks like this:

```
APPOINTMENTS
- Dad cardiology follow-up Nov 12 at 10:30 with Dr. Sample; Karmel driving.

Lab results
- Diana A1C 6.1 % on 2026-11-03 (was 6.4 in July).

Questions for Mom and Dad
- Where is the original signed healthcare power of attorney kept?
```

## What the reviewer sees

Each proposal shows its kind, the heading and the line as written, and "from the Binder doc". Approving or rejecting works as for any Riana update. The stored update also keeps the doc's name, link, last-edited time and the line number, so the source can always be found.

## Safety

- Read-only: the service account has Viewer access and the app never writes to Drive.
- Super admins only can register docs, run the sync, and see the doc list; the database enforces this, and both actions are in the audit log.
- Proposals are stamped "via Riana" and never touch a binder record until approved.
- Covered by `npm test` (the parser: headings, kinds, dates, stable fingerprints, link parsing) and `npm run test:db` (doc list access, no duplicate proposals, audit attribution).

## Until the key exists

Without `GOOGLE_SERVICE_ACCOUNT_JSON`, the panel reads a stand-in sample doc so the whole flow can be tried. The banner says which mode it is in.
