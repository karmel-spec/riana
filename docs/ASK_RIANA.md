# Ask Riana: the home-page chat

Rich, Diana, Karmel and Heather can type to Riana on the home page. The web app
stores each message, wakes Riana's routine with a webhook, and shows her answer
in the same thread. Nobody else sees or can use the chat.

**Answers are display only.** Posting an answer never changes a binder record.
A "tell Riana something new" message also lands in **Admin → Updates from
Riana** as a pending *Teach Riana* item; approving it marks it seen and changes
nothing else.

This is phase 1 (the web chat). Texting Riana's number is a later phase.

## How a message travels

1. A signed-in parent or super admin sends a message. The server action
   `askRiana` checks it for secrets, then calls `public.ask_riana()`, which
   stores it in `public.riana_questions` with status `waiting` (at most 8
   messages per person per rolling hour).
2. The server (never the browser) POSTs the message to Riana's routine:

   ```
   POST $RIANA_WEBHOOK_URL
   Authorization: Bearer $RIANA_WEBHOOK_KEY
   Content-Type: application/json
   ```

   ```json
   {
     "question_id": "<uuid>",
     "asker": "rich|diana|karmel|heather",
     "text": "…",
     "created_at": "<ISO-8601>",
     "recent_thread": [
       { "role": "user|riana", "asker": "diana", "text": "…", "created_at": "…" }
     ],
     "public_id": 42,
     "intent": "question|teach",
     "channel": "web",
     "on_behalf_of": null
   }
   ```

   `recent_thread` is the last six or so messages, oldest first, ending with
   the new one. `public_id`, `intent`, `channel` and `on_behalf_of` are extras
   on top of the original shape.
3. Riana answers with `POST /api/riana/questions/<id>/answer` (below). The chat
   re-reads the thread every few seconds while a message is waiting, so the
   answer appears without reloading the page.
4. If the webhook call fails, the message stays stored and waiting, the row's
   `webhook_status` is `failed`, and the server log gets one line with the
   question id and an HTTP status (never the key, the address or the message).
   Riana's catch-up poll (`GET /api/riana/questions?status=open`) finds it.

`webhook_status` is `sent`, `failed`, or `skipped` (either variable unset, or
demo mode).

## Setup

| Variable | Where | Notes |
| --- | --- | --- |
| `RIANA_WEBHOOK_URL` | Netlify environment variables | From Riana's "Ask Riana live chat (webapp)" routine panel. Must start with `https://`. |
| `RIANA_WEBHOOK_KEY` | Netlify environment variables | Same panel. Sent as `Authorization: Bearer`. |

Both are server-only. Never commit them, never prefix them `NEXT_PUBLIC_`, and
never paste them into a doc or a chat. Until both are set the chat still works:
messages are stored and Riana picks them up with the catch-up poll.

The agent routes below use the **same bearer key as `/api/riana/inbound`**
(see `docs/RIANA_INBOUND.md` for minting and revoking keys). In the examples it
is the shell variable `$RIANA_KEY`; set it from 1Password, never type it into a
file.

The database needs migration `20261115000027_riana_questions.sql`. Until it is
applied the chat shows "not switched on yet" and the routes reply 503.

## GET /api/riana/questions

The catch-up list. `status` is `open` (the default; the same as `waiting`),
`waiting`, `answered` or `all`. Oldest first, 200 at most.

```bash
curl -s "https://<site>/api/riana/questions?status=open" \
  -H "Authorization: Bearer $RIANA_KEY"
```

```json
{
  "questions": [
    {
      "id": "<uuid>", "public_id": 42, "intent": "question", "channel": "web",
      "asker": "diana", "on_behalf_of": null, "body": "…", "status": "waiting",
      "answer": null, "created_at": "…", "answered_at": null
    }
  ],
  "generated_at": "…"
}
```

| Reply | Meaning |
| --- | --- |
| 200 | The list. |
| 400 | Unknown `status`. |
| 401 | Missing, malformed, wrong or revoked key. |
| 503 | The site has no database configured, or the migration is not applied. |

Each call stamps the key's `last_used_at` / `use_count` and is written to the
audit log as an export by Riana.

## POST /api/riana/questions/&lt;id&gt;/answer

```bash
curl -s -X POST "https://<site>/api/riana/questions/$QUESTION_ID/answer" \
  -H "Authorization: Bearer $RIANA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"answer": "Your next appointment is Thursday at 10:30 with Dr. Sample."}'
```

```json
{ "id": "<uuid>", "status": "answered" }
```

The answer is trimmed and must be 1 to 4,000 characters.

| Reply | Meaning |
| --- | --- |
| 200 | Stored. Sending the same answer again also replies 200 (with `"duplicate": true`) and changes nothing. |
| 400 | The body is not JSON, the answer is empty or too long, or it looks like it contains a secret. |
| 401 | Missing, malformed, wrong or revoked key. |
| 404 | No message with that id. |
| 409 | The message already has a different answer. |
| 413 | Body over 32,000 bytes. |
| 503 | The site has no database configured, or the migration is not applied. |

Each answer is written to the audit log (via Riana) without its text.

## What is refused

Family messages and Riana's answers both go through
`src/lib/riana/secret-check.ts` before anything is stored, sent or shown:

- Social Security number shapes (`123-45-6789`, or "SSN" followed by digits)
- 13 to 19 digit runs: card numbers and full account numbers
- "password is …", "PIN is …", "account number is …", "routing number", access and recovery codes
- a date of birth

The database repeats the plainest of these (`app.riana_looks_secret`). Refer to
a login by the **name of its 1Password item**, never by the credential.

## Trying it locally (fake data)

With `GREENE_DEMO=1` and no Supabase variables, the chat runs on the in-memory
sample data. The webhook is skipped, any bearer key of 32 or more characters is
accepted, and a waiting message answers itself after about twelve seconds if
nothing posts an answer first.

```bash
export RIANA_KEY="demo-key-0123456789-0123456789-0123456789"
curl -s "http://localhost:3000/api/riana/questions?status=all" -H "Authorization: Bearer $RIANA_KEY"
```
