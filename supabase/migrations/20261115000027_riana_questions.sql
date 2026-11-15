-- =============================================================================
-- Ask Riana: the home-page chat (Phase 4 of the Riana integration, web only).
--
-- Rich, Diana and the super admins type a question, or something new for
-- Riana to know, into a chat on the home page. The web app stores it here,
-- wakes Riana's routine with a webhook, and shows her answer in the thread.
--
--   * riana_questions holds one row per message and (once Riana replies) its
--     answer. Answers are DISPLAY ONLY: nothing in this file edits a binder
--     record, calls riana_apply, or approves anything.
--   * A "teach" message also queues a pending riana_updates row (kind 'teach'),
--     so it waits in Admin → Updates from Riana like every other proposal.
--   * Family submits go through ask_riana() (signed-in parent or super admin,
--     at most 8 per person per rolling hour). There are no insert/update/delete
--     grants on the table for anyone.
--   * The agent reads and answers through riana_questions_list() and
--     riana_question_answer(), which verify the same bearer key as
--     riana_inbound() / riana_export() against riana_inbound_keys. The web app
--     calls them as `anon` with only the publishable key.
--   * Texting (channel 'sms', from_phone, twilio_message_sid) is a later phase;
--     the columns exist so that phase needs no table change.
-- =============================================================================

-- --- Riana inbox: one more kind ----------------------------------------------------
alter table public.riana_updates drop constraint if exists riana_updates_kind_check;
alter table public.riana_updates add constraint riana_updates_kind_check
  check (kind in ('appointment', 'lab_result', 'bill', 'urgent_question', 'document', 'note', 'contact', 'album', 'teach'));

-- --- The thread ---------------------------------------------------------------------
create table public.riana_questions (
  id                 uuid primary key default gen_random_uuid(),
  public_id          integer generated always as identity unique,
  intent             text not null check (intent in ('question', 'teach')),
  channel            text not null default 'web' check (channel in ('web', 'sms', 'email')),
  asked_by           uuid references public.profiles (id),
  asker              text not null check (asker in ('rich', 'diana', 'karmel', 'heather')),
  on_behalf_of       text check (on_behalf_of in ('rich', 'diana')),
  from_phone         text check (from_phone is null or from_phone ~ '^\+[1-9][0-9]{6,14}$'),
  body               text not null check (length(body) between 1 and 2000),
  status             text not null default 'waiting' check (status in ('waiting', 'answered')),
  answer             text check (answer is null or length(answer) between 1 and 4000),
  answered_at        timestamptz,
  webhook_status     text not null default 'pending' check (webhook_status in ('pending', 'sent', 'failed', 'skipped')),
  inbound_update_id  uuid references public.riana_updates (id) on delete set null,
  twilio_message_sid text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint riana_questions_answered_has_answer
    check ((status = 'answered') = (answer is not null and answered_at is not null))
);
create index riana_questions_created_idx on public.riana_questions (created_at desc);
create index riana_questions_waiting_idx on public.riana_questions (created_at) where status = 'waiting';
create index riana_questions_asked_by_idx on public.riana_questions (asked_by, created_at desc);

alter table public.riana_questions enable row level security;
alter table public.riana_questions force row level security;

-- Super admins see everything. Parents see the household thread: what Rich or
-- Diana asked, anything asked on their behalf, and anything they sent
-- themselves. No policy for any other role; anon has no rights at all.
create policy rq_admin_read on public.riana_questions for select to authenticated
  using (app.is_super_admin());
create policy rq_parent_read on public.riana_questions for select to authenticated
  using (app.my_role() = 'parent'
         and (asker in ('rich', 'diana') or on_behalf_of is not null or asked_by = auth.uid()));

revoke all on public.riana_questions from public, anon, authenticated;
grant select on public.riana_questions to authenticated;

-- --- Secrets never belong in the chat -------------------------------------------------
-- The web app runs a fuller check (src/lib/riana/secret-check.ts) before it
-- calls these functions. This is the backstop for the plainest cases, so a
-- message that slips past the app is still refused here.
create or replace function app.riana_looks_secret(p_text text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_text, '') ~ '(^|[^0-9])[0-9]{3}[- .][0-9]{2}[- .][0-9]{4}($|[^0-9])'   -- 123-45-6789
      or coalesce(p_text, '') ~ '(^|[^0-9])([0-9][ -]?){12,18}[0-9]($|[^0-9])'             -- 13 to 19 digit card-like run
      or coalesce(p_text, '') ~* '\m(password|passcode|pin|ssn|social security( number)?|routing number|account number|card number)\s*(is|:|=)'
$$;

-- --- Family submit ----------------------------------------------------------------------
-- Called by the web app with the signed-in person's session.
-- Error codes the app turns into plain words:
--   28000 not signed in · 42501 not allowed · 22023 bad input
--   RQSEC looks like a secret · RQ429 more than 8 in the last hour
create or replace function public.ask_riana(
  p_intent text, p_body text, p_asker text default null, p_on_behalf_of text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid     uuid := auth.uid();
  v_role    public.app_role;
  v_subject public.subject;
  v_name    text;
  v_body    text := trim(coalesce(p_body, ''));
  v_asker   text;
  v_behalf  text;
  v_id      uuid := gen_random_uuid();
  v_pid     integer;
  v_at      timestamptz;
  v_update  uuid;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  v_role := app.my_role();
  if v_role is null or not (v_role = 'parent' or app.is_super_admin()) then
    raise exception 'only Rich, Diana and the super admins can ask Riana' using errcode = '42501';
  end if;
  if p_intent is null or p_intent not in ('question', 'teach') then
    raise exception 'intent must be question or teach' using errcode = '22023';
  end if;
  if length(v_body) not between 3 and 2000 then
    raise exception 'the message must be between 3 and 2000 characters' using errcode = '22023';
  end if;
  if app.riana_looks_secret(v_body) then
    raise exception 'that looks like a password or an account number' using errcode = 'RQSEC';
  end if;

  select is_subject, display_name into v_subject, v_name from public.profiles where id = v_uid;
  if v_role = 'parent' then
    -- Either parent may type on a shared sign-in, so the choice is theirs.
    v_asker := coalesce(nullif(lower(trim(p_asker)), ''), v_subject::text);
    if v_asker is null or v_asker not in ('rich', 'diana') then
      raise exception 'asker must be rich or diana' using errcode = '22023';
    end if;
    v_behalf := null;
  else
    -- A super admin is always themself; they may add a note on a parent's behalf.
    v_asker := lower(split_part(trim(coalesce(v_name, '')), ' ', 1));
    if v_asker not in ('karmel', 'heather') then
      raise exception 'this profile is not one of the people who can ask Riana' using errcode = '22023';
    end if;
    v_behalf := nullif(lower(trim(coalesce(p_on_behalf_of, ''))), '');
    if v_behalf is not null and v_behalf not in ('rich', 'diana') then
      raise exception 'on_behalf_of must be rich or diana' using errcode = '22023';
    end if;
  end if;

  -- One submit at a time per person, so two quick taps cannot both slip under the limit.
  perform pg_advisory_xact_lock(hashtext('ask_riana:' || v_uid::text));
  if (select count(*) from public.riana_questions
       where asked_by = v_uid and created_at > now() - interval '1 hour') >= 8 then
    raise exception 'too many messages in the last hour' using errcode = 'RQ429';
  end if;

  insert into public.riana_questions (id, intent, channel, asked_by, asker, on_behalf_of, body)
  values (v_id, p_intent, 'web', v_uid, v_asker, v_behalf, v_body)
  returning public_id, created_at into v_pid, v_at;

  if p_intent = 'teach' then
    insert into public.riana_updates (kind, summary, payload, source)
    values ('teach',
            left(v_body, 100) || case when length(v_body) > 100 then '…' else '' end,
            jsonb_build_object('text', v_body, 'from', v_name, 'from_id', v_uid, 'asker', v_asker,
                               'on_behalf_of', v_behalf, 'question_id', v_id, 'question_public_id', v_pid),
            'app')
    returning id into v_update;
    update public.riana_questions set inbound_update_id = v_update where id = v_id;
  end if;

  -- Audited without the message text.
  insert into public.audit_log (actor, action, section, entity, entity_id, via, details)
  values (v_uid, 'create', 'admin', 'riana_questions', v_id, 'app',
          jsonb_build_object('public_id', v_pid, 'intent', p_intent, 'channel', 'web', 'asker', v_asker, 'on_behalf_of', v_behalf));

  return jsonb_build_object('id', v_id, 'public_id', v_pid, 'status', 'waiting', 'created_at', v_at,
                            'asker', v_asker, 'on_behalf_of', v_behalf, 'inbound_update_id', v_update);
end $$;

-- The web app records what happened when it called Riana's webhook. Only the
-- person who sent the message (or a super admin) may set it, and only to an outcome.
create or replace function public.riana_question_set_webhook(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p_status is null or p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'webhook status must be sent, failed or skipped' using errcode = '22023';
  end if;
  update public.riana_questions set webhook_status = p_status, updated_at = now()
   where id = p_id and (asked_by = auth.uid() or app.is_super_admin());
end $$;

-- --- Agent: verify the bearer key (same rule as riana_inbound / riana_export) -------------
create or replace function app.riana_key_check(p_key text) returns public.riana_inbound_keys
language plpgsql security definer set search_path = '' as $$
declare k public.riana_inbound_keys;
begin
  select * into k from public.riana_inbound_keys
  where key_hash = app.hash_inbound_key(coalesce(p_key, '')) and revoked_at is null;
  if k.id is null then
    raise exception 'invalid inbound key' using errcode = '28000';   -- invalid_authorization_specification
  end if;
  -- Every authenticated call counts, retries included.
  update public.riana_inbound_keys set last_used_at = now(), use_count = use_count + 1 where id = k.id;
  return k;
end $$;

-- --- Agent: list questions (catch-up poll) ------------------------------------------------
-- p_status: open (alias of waiting), waiting, answered, all. Oldest first, 200 at most.
create or replace function public.riana_questions_list(p_key text, p_status text default 'open')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  k        public.riana_inbound_keys;
  v_status text := lower(coalesce(nullif(trim(p_status), ''), 'open'));
  v_rows   jsonb;
begin
  k := app.riana_key_check(p_key);
  if v_status = 'open' then v_status := 'waiting'; end if;
  if v_status not in ('waiting', 'answered', 'all') then
    raise exception 'status must be open, waiting, answered or all' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at), '[]'::jsonb) into v_rows
  from (
    select q.id, q.public_id, q.intent, q.channel, q.asker, q.on_behalf_of, q.body, q.status,
           q.answer, q.created_at, q.answered_at
    from public.riana_questions q
    where v_status = 'all' or q.status = v_status
    order by q.created_at desc
    limit 200
  ) t;

  insert into public.audit_log (actor, action, section, entity, entity_id, via, details)
  values (null, 'export', 'admin', 'riana_questions', k.id, 'riana',
          jsonb_build_object('key_label', k.label, 'status', v_status, 'count', jsonb_array_length(v_rows)));

  return jsonb_build_object('questions', v_rows, 'generated_at', now());
end $$;

-- --- Agent: post an answer (display only) ----------------------------------------------------
-- Error codes: 28000 bad key · 22023 bad answer · RQSEC looks like a secret
--              P0002 no such question · RQ409 already answered with different text.
-- Sending the same answer again is accepted and changes nothing.
create or replace function public.riana_question_answer(p_key text, p_id uuid, p_answer text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  k        public.riana_inbound_keys;
  q        public.riana_questions;
  v_answer text := trim(coalesce(p_answer, ''));
begin
  k := app.riana_key_check(p_key);
  if length(v_answer) not between 1 and 4000 then
    raise exception 'the answer must be between 1 and 4000 characters' using errcode = '22023';
  end if;
  if app.riana_looks_secret(v_answer) then
    raise exception 'that answer looks like it contains a password or an account number' using errcode = 'RQSEC';
  end if;

  select * into q from public.riana_questions where id = p_id for update;
  if q.id is null then
    raise exception 'no such question' using errcode = 'P0002';   -- no_data_found
  end if;
  if q.status = 'answered' then
    if q.answer = v_answer then
      return jsonb_build_object('id', q.id, 'status', 'answered', 'duplicate', true);
    end if;
    raise exception 'that question already has a different answer' using errcode = 'RQ409';
  end if;

  update public.riana_questions
     set status = 'answered', answer = v_answer, answered_at = now(), updated_at = now()
   where id = q.id;

  insert into public.audit_log (actor, action, section, entity, entity_id, via, details)
  values (null, 'update', 'admin', 'riana_questions', q.id, 'riana',
          jsonb_build_object('key_label', k.label, 'public_id', q.public_id, 'answered', true));

  return jsonb_build_object('id', q.id, 'status', 'answered');
end $$;

revoke all on function public.ask_riana(text, text, text, text),
  public.riana_question_set_webhook(uuid, text),
  public.riana_questions_list(text, text),
  public.riana_question_answer(text, uuid, text),
  app.riana_key_check(text), app.riana_looks_secret(text) from public, anon;
grant execute on function public.ask_riana(text, text, text, text),
  public.riana_question_set_webhook(uuid, text) to authenticated;
grant execute on function public.riana_questions_list(text, text),
  public.riana_question_answer(text, uuid, text) to anon, authenticated;

-- PostgREST caches the schema; tell it about the new table and functions.
notify pgrst, 'reload schema';
