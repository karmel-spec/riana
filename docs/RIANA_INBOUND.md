# Sending updates into the binder (Riana inbound endpoint)

This is how Riana, a Grok or Claude assistant, or a person pasting an assistant's output gets an update into the family binder. Nothing sent here changes a binder record. Every update lands in **Admin → Updates from Riana** and waits for a super admin to approve or reject it. Approved updates are labeled "via Riana" and can be reverted.

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
| `503` | The site is not connected to a database yet. |

Example from a terminal:

```bash
curl -sS -X POST "https://greene-binder.netlify.app/api/riana/inbound" \
  -H "Authorization: Bearer $RIANA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"kind":"urgent_question","summary":"Mom asked where the 2019 trust binder is","payload":{"asked_of":"diana"}}'
```

## 3. Review it

The update appears at the top of **Admin → Updates from Riana** with its kind and summary. Approve or reject. The receipt, the decision, and who made it are all in **Admin → Audit Log**, where the sender shows as "Riana".

## Giving the endpoint to a Grok or Claude agent

Describe it to the agent as one tool: *"post_binder_update(kind, summary, payload, external_ref) → POST to the URL above with the bearer key."* For Grok, that can be a custom MCP server registered in its connector settings; for Claude, a tool definition or MCP server likewise. The agent only ever needs this one key. It gets no read access to the binder and cannot approve anything.

## How it is protected

- The route forwards the key to a Postgres function (`public.riana_inbound`) that runs with elevated rights only inside the database. The web app never holds the Supabase service-role secret.
- The anonymous database role cannot read or insert into the inbox directly; only the function can, and only with a valid, unrevoked key.
- Keys are stored as SHA-256 hashes and are never shown through the API, not even to super admins.
- Bodies are validated twice (in the route and in the database) and capped in size.
- Covered by `npm run test:db`: wrong key, revoked key, bad kind, empty summary, non-object payload, idempotent retry, anonymous read and insert both refused, audit attribution to Riana, family still unable to see the inbox.

## Trying it locally with fake data

With `GREENE_DEMO=1` and no Supabase URL, any bearer key of 32+ characters is accepted and the update goes into the in-memory demo inbox, so you can see it on the Updates from Riana screen immediately:

```bash
curl -sS -X POST http://localhost:3000/api/riana/inbound \
  -H "Authorization: Bearer demo-demo-demo-demo-demo-demo-demo-demo" \
  -H "Content-Type: application/json" \
  -d '{"kind":"note","summary":"Hello from the demo"}'
```
