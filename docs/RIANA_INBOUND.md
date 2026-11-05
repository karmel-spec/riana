# Riana and other assistants: sending updates in, reading data out

Two endpoints, one key per assistant:

- **Inbound** (`POST /api/riana/inbound`): the assistant sends an update. Nothing it sends changes a binder record; every update lands in **Admin → Updates from Riana** and waits for a super admin to approve or reject it. Approved updates are labeled "via Riana" and can be reverted.
- **Export** (`GET /api/riana/export`): the assistant reads the latest data for the sections a super admin has granted to its key, so a Monday update reflects what is actually in the binder. Every export is in the audit log.

Keys, usage, and read grants are listed on the Updates from Riana screen.

## 1. Mint a key (super admin, once per agent)

Sign in to Supabase, open **SQL Editor**, and run as yourself (you must be a 2-step-verified super admin, so run it through the app's database session or set `request.jwt.claims` the way the Supabase SQL editor does when you choose *Run as authenticated user*):

```sql
select public.riana_inbound_key_create('Grok assistant for Mom and Dad');
```

It returns the key **once**. Put it in 1Password and give it to the agent. Only a hash is stored, so it cannot be read back. Use one key per agent so each can be revoked on its own:

```sql
select id, label, created_at, last_used_at, use_count, revoked_at from public.riana_inbound_keys;
select public.riana_inbound_key_revoke('<id>');
```

Minting and revoking are written to the audit log (label only, never the hash).

## 2. Post an update

```
POST https://<your site>/api/riana/inbound
Authorization: Bearer <key>
Content-Type: application/json
```

```json
{
  "kind": "lab_result",
  "summary": "New A1C result for Diana: 6.1 %",
  "payload": { "patient": "diana", "test": "A1C", "value": 6.1, "unit": "%", "taken_on": "2026-11-04" },
  "external_ref": "grok-2026-11-05-0001"
}
```

| Field | Required | Notes |
|---|---|---|
| `kind` | yes | One of `appointment`, `lab_result`, `bill`, `urgent_question`, `document`, `note`. |
| `summary` | yes | One line, up to 500 characters. This is what the reviewer sees first. |
| `payload` | no | Any JSON object up to 20 KB with the structured details. |
| `external_ref` | no | The agent's own id for this update. A retry with the same value is accepted once and returns the same id. |

Replies:

| Status | Meaning |
|---|---|
| `201` | Recorded, `{ "id": "...", "status": "pending" }`. A retry with a known `external_ref` also returns 201 with the original id. |
| `400` | Bad JSON or a field failed validation. The body says which. |
| `401` | Missing, malformed, wrong, or revoked key. |
| `413` | Body over 32 KB. |
| `503` | The site is not connected to a database yet, or the Riana migrations have not been applied to it (the message says which). |

Example from a terminal:

```bash
curl -sS -X POST "https://greene-binder.netlify.app/api/riana/inbound" \
  -H "Authorization: Bearer $RIANA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"urgent_question","summary":"Mom asked where the 2019 trust binder is","payload":{"asked_of":"diana"}}'
```

## 2b. Read data out (export)

By default a key can only send. To let it read, a super admin grants sections to that key:

```sql
select id, label, read_sections from public.riana_inbound_keys;
select public.riana_key_set_read_sections('<id>', '{urgent_questions,calendar,final_wishes,health_diana}');
-- take it away again:
select public.riana_key_set_read_sections('<id>', '{}');
```

Sections that can be granted: `urgent_questions`, `calendar`, `contacts`, `health_diana`, `health_rich`, `properties`, `accounts`, `bills`, `insurance`, `taxes`, `legal`, `final_wishes`, `household`, `next_steps`. Logins (`digital_accounts`), family history (documents, journals, media), the notify lists, and admin data can **never** be exported; the database refuses the grant.

Health, money, and legal sections normally require a 2-step-verified person. Granting one of them to a key is a deliberate decision to let that assistant see it without that. Keep the grant to what the assistant's job needs.

```
GET https://<your site>/api/riana/export?sections=urgent_questions,calendar
Authorization: Bearer <key>
```

Omit `sections` for everything the key may read. The reply:

```json
{
  "generated_at": "2026-11-05T06:00:00Z",
  "key_label": "Grok assistant",
  "sections": {
    "urgent_questions": [ { "question": "...", "asked_of": "both", "status": "open", "due_on": "2026-11-09", ... } ],
    "calendar": [ { "title": "Cardiology follow-up", "about": "rich", "starts_at": "...", ... } ]
  },
  "not_permitted": ["legal"],
  "never_exported": ["digital_accounts", "family_history", "documents", "notify", "admin"]
}
```

What each section contains:

| Section | Contents |
|---|---|
| `urgent_questions` | Open, asked, partly answered and answered questions (closed ones are left out). |
| `calendar` | Events from 7 days ago to 120 days ahead. Appointments that belong to a health, tax or insurance section appear only if that section is also granted. |
| `contacts` | People with relationship, contact details, closeness, groups, and notify-first flag. |
| `health_diana`, `health_rich` | Providers, medications, conditions and allergies, lab results from the last 24 months, visit notes from the last 12 months, and VA claims for Rich. |
| `properties` | Properties with succession plan and manager, plus loans owed by the estate. |
| `accounts` | Accounts (institution, kind, purpose, last 4 digits only) plus loans owed to the estate. |
| `bills` | Bills with amount, due date, autopay, status, and which account pays them (last 4 only). |
| `insurance` | Policies with carrier, renewal, premium, agent (last 4 of the policy number only). |
| `taxes` | Tax records by year and status. |
| `legal` | Current legal documents and their status, open issues, and where the original is. |
| `final_wishes` | Each wish and whether it is confirmed. |
| `household` | Pets, vehicles, heirlooms, services. |
| `next_steps` | The checklist with owner, due date, and done flag. |

Replies: `200` export, `400` unknown section, `401` bad or revoked key, `503` no database yet or the Riana migrations not applied yet (the message says which).

```bash
curl -sS "https://greene-binder.netlify.app/api/riana/export?sections=urgent_questions,calendar" \
  -H "Authorization: Bearer $RIANA_KEY"
```

## 3. Review it

The update appears at the top of **Admin → Updates from Riana** with its kind and summary. Approve or reject. The receipt, the decision, and who made it are all in **Admin → Audit Log**, where the sender shows as "Riana".

## Giving the endpoint to a Grok or Claude agent

Describe it to the agent as two tools:

- *post_binder_update(kind, summary, payload, external_ref)*: POST to the inbound URL with the bearer key.
- *read_binder(sections)*: GET the export URL with the same key.

For Grok, that can be a custom MCP server registered in its connector settings; for Claude, a tool definition or MCP server likewise. The agent only ever needs this one key. It reads only what its key is granted and cannot approve anything.

## How it is protected

- The route forwards the key to a Postgres function (`public.riana_inbound`) that runs with elevated rights only inside the database. The web app never holds the Supabase service-role secret.
- The anonymous database role cannot read or insert into the inbox directly; only the function can, and only with a valid, unrevoked key.
- Keys are stored as SHA-256 hashes and are never shown through the API, not even to super admins.
- Bodies are validated twice (in the route and in the database) and capped in size.
- Export returns only granted sections, lists the rest as not permitted, never includes logins, documents, or family history, and writes one audit entry per call naming the sections and the key.
- Covered by `npm run test:db`: wrong key, revoked key, bad kind, empty summary, non-object payload, idempotent retry, anonymous read and insert both refused, audit attribution to Riana, family still unable to see the inbox; for export: ungranted sections withheld, forbidden sections cannot be granted, only super admins can grant, calendar hides appointments from ungranted sections, read access can be revoked, every call audited.

## Trying it locally with fake data

With `GREENE_DEMO=1` and no Supabase URL, any bearer key of 32+ characters is accepted. An update goes into the in-memory demo inbox, so you can see it on the Updates from Riana screen immediately, and the export returns every exportable section of the fake data:

```bash
curl -sS -X POST http://localhost:3000/api/riana/inbound \
  -H "Authorization: Bearer demo-demo-demo-demo-demo-demo-demo-demo" \
  -H "Content-Type: application/json" \
  -d '{"kind":"note","summary":"Hello from the demo"}'
```

```bash
curl -sS "http://localhost:3000/api/riana/export?sections=urgent_questions,final_wishes" \
  -H "Authorization: Bearer demo-demo-demo-demo-demo-demo-demo-demo"
```
