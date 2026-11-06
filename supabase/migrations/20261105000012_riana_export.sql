-- =============================================================================
-- Riana outbound export (Phase 3 of the Riana integration).
--
-- A read-only, permission-scoped snapshot an agent can fetch so its weekly
-- update uses the latest binder data. GET /api/riana/export with the same
-- bearer key as the inbound endpoint.
--
--   * Each key carries read_sections: the sections a super admin has chosen
--     to let that agent read. Default none. Sending (inbound) and reading
--     (export) are separate: a key can do either or both.
--   * Some sections can never be exported, whatever a key is granted:
--     digital_accounts (vault item names), family_history (documents, journals,
--     media), taxes (super-admin-only since migration 0007), notify and admin.
--     The check constraint enforces it.
--   * riana_export() runs as the function owner, verifies the key, and builds
--     JSON only for the granted sections. Anything else the agent asked for is
--     listed under not_permitted. Each call writes ONE audit_log row (action
--     'export', via 'riana', the sections and key label), so Admin → Audit Log
--     shows exactly what left the binder and when.
--   * Export never includes: full account or policy numbers (the tables only
--     hold last-4 anyway), document files, or anyone's login.
-- =============================================================================

create or replace function app.exportable_sections() returns public.section[]
language sql immutable set search_path = '' as $$
  select array['urgent_questions', 'calendar', 'contacts', 'health_diana', 'health_rich',
               'properties', 'accounts', 'bills', 'insurance', 'legal',
               'final_wishes', 'household', 'next_steps']::public.section[]
$$;

alter table public.riana_inbound_keys
  add column read_sections public.section[] not null default '{}',
  add constraint rik_read_sections_exportable check (read_sections <@ app.exportable_sections());
grant select (read_sections) on public.riana_inbound_keys to authenticated;

-- Audit key changes (label, revoked, read sections), still never the hash.
create or replace function app.track_inbound_key_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.riana_inbound_keys := coalesce(new, old);
begin
  insert into public.audit_log (actor, action, section, entity, entity_id, details)
  values (auth.uid(), 'permission_change', 'admin', tg_table_name, r.id,
          jsonb_build_object('op', tg_op, 'label', r.label, 'revoked', r.revoked_at is not null,
                             'read_sections', to_jsonb(r.read_sections)));
  return coalesce(new, old);
end $$;

-- Choose what a key may read. Super admins only (2-step verified, like every
-- permission change). Pass '{}' to take reading away again.
--   select public.riana_key_set_read_sections('<key id>', '{urgent_questions,calendar,final_wishes}');
create or replace function public.riana_key_set_read_sections(p_id uuid, p_sections public.section[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_super_admin() then
    raise exception 'only a super admin can change what a key may read';
  end if;
  if not (coalesce(p_sections, '{}') <@ app.exportable_sections()) then
    raise exception 'those sections cannot be exported to an agent' using errcode = '22023';
  end if;
  update public.riana_inbound_keys
     set read_sections = (select coalesce(array_agg(distinct s order by s), '{}') from unnest(coalesce(p_sections, '{}')) s)
   where id = p_id and revoked_at is null;
  if not found then
    raise exception 'no such active key';
  end if;
end $$;

create or replace function app.export_health(p_patient public.subject) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'patient', p_patient,
    'providers', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', v.id, 'name', v.name, 'specialty', v.specialty, 'practice', v.practice, 'phone', v.phone,
        'portal_name', v.portal_name, 'is_va', v.is_va, 'notes', v.notes) order by v.name), '[]'::jsonb)
      from public.providers v where v.patient = p_patient),
    'medications', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name, 'dose', m.dose, 'schedule', m.schedule, 'purpose', m.purpose,
        'prescriber', v.name, 'started_on', m.started_on, 'stopped_on', m.stopped_on, 'active', m.active, 'notes', m.notes) order by m.active desc, m.name), '[]'::jsonb)
      from public.medications m left join public.providers v on v.id = m.prescriber_id where m.patient = p_patient),
    'conditions', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'kind', c.kind, 'name', c.name, 'detail', c.detail, 'since', c.since) order by c.kind, c.name), '[]'::jsonb)
      from public.health_conditions c where c.patient = p_patient),
    'lab_results', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'test_name', l.test_name, 'value', l.value, 'unit', l.unit, 'ref_low', l.ref_low, 'ref_high', l.ref_high,
        'flag', l.flag, 'taken_on', l.taken_on, 'provider', v.name, 'notes', l.notes) order by l.taken_on desc, l.test_name), '[]'::jsonb)
      from public.lab_results l left join public.providers v on v.id = l.provider_id
      where l.patient = p_patient and l.taken_on >= current_date - interval '24 months'),
    'visit_notes', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', n.id, 'visit_on', n.visit_on, 'provider', v.name, 'summary', n.summary, 'follow_up', n.follow_up, 'author', n.author_name) order by n.visit_on desc), '[]'::jsonb)
      from public.visit_notes n left join public.providers v on v.id = n.provider_id
      where n.patient = p_patient and n.visit_on >= current_date - interval '12 months'),
    'va_claims', case when p_patient = 'rich' then (select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'kind', c.kind, 'title', c.title, 'status', c.status, 'filed_on', c.filed_on, 'decided_on', c.decided_on,
        'rating_pct', c.rating_pct, 'next_step', c.next_step, 'notes', c.notes) order by c.filed_on desc nulls last), '[]'::jsonb)
      from public.va_claims c) else '[]'::jsonb end
  )
$$;

-- One section's rows as JSON. Internal; the export function decides access.
create or replace function app.export_section(p_section public.section, p_allowed public.section[]) returns jsonb
language sql stable set search_path = '' as $$
  select case p_section
    when 'urgent_questions' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', q.id, 'question', q.question, 'topic', q.topic, 'asked_of', q.asked_of,
        'owner', coalesce(p.display_name, q.owner_name), 'priority', q.priority, 'status', q.status,
        'answer', q.answer, 'answered_by', q.answered_by, 'answered_at', q.answered_at,
        'due_on', q.due_on, 'updated_at', q.updated_at) order by q.sort_order, q.due_on), '[]'::jsonb)
      from public.urgent_questions q left join public.profiles p on p.id = q.owner_id
      where q.status <> 'closed')
    when 'calendar' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'title', e.title, 'kind', e.kind, 'about', e.about, 'section', e.section,
        'starts_at', e.starts_at, 'ends_at', e.ends_at, 'all_day', e.all_day,
        'location', e.location, 'driver', e.driver, 'notes', e.notes) order by e.starts_at), '[]'::jsonb)
      from public.calendar_events e
      where e.starts_at between now() - interval '7 days' and now() + interval '120 days'
        and (e.section = 'calendar' or e.section = any (p_allowed)))
    when 'contacts' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'relationship', p.relationship, 'connected_to', p.connected_to,
        'email', p.email, 'phone', p.phone, 'city', p.city, 'region', p.region, 'closeness', p.closeness,
        'last_contact_on', p.last_contact_on, 'preferred_method', p.preferred_method,
        'notify_first', p.notify_first, 'confirmed', p.confirmed, 'is_professional', p.is_professional,
        'groups', (select coalesce(jsonb_agg(g.name order by g.name), '[]'::jsonb)
                   from public.person_groups pg join public.contact_groups g on g.id = pg.group_id where pg.person_id = p.id),
        'notes', p.notes) order by p.closeness nulls last, p.full_name), '[]'::jsonb)
      from public.people p)
    when 'health_diana' then app.export_health('diana')
    when 'health_rich'  then app.export_health('rich')
    when 'properties' then jsonb_build_object(
      'properties', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pr.id, 'name', pr.name, 'kind', pr.kind, 'address', pr.address, 'held_by', pr.held_by,
        'succession_plan', pr.succession_plan, 'manager', m.full_name, 'hoa_name', pr.hoa_name, 'notes', pr.notes) order by pr.name), '[]'::jsonb)
        from public.properties pr left join public.people m on m.id = pr.manager_person_id),
      'loans_owed_by_estate', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'counterparty', l.counterparty, 'property', pr.name, 'principal', l.principal, 'rate_pct', l.rate_pct,
        'started_on', l.started_on, 'status', l.status, 'note_signed', l.note_signed, 'balance_note', l.balance_note, 'notes', l.notes) order by l.counterparty), '[]'::jsonb)
        from public.loans l left join public.properties pr on pr.id = l.property_id where l.direction = 'owed_by_estate'))
    when 'accounts' then jsonb_build_object(
      'accounts', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'institution', a.institution, 'kind', a.kind, 'purpose', a.purpose, 'last4', a.last4,
        'held_by', a.held_by, 'beneficiary_notes', a.beneficiary_notes, 'notes', a.notes) order by a.institution), '[]'::jsonb)
        from public.accounts a),
      'loans_owed_to_estate', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'counterparty', l.counterparty, 'principal', l.principal, 'rate_pct', l.rate_pct,
        'started_on', l.started_on, 'status', l.status, 'note_signed', l.note_signed, 'balance_note', l.balance_note, 'notes', l.notes) order by l.counterparty), '[]'::jsonb)
        from public.loans l where l.direction = 'owed_to_estate'))
    when 'bills' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', b.id, 'payee', b.payee, 'category', b.category, 'property', pr.name, 'amount', b.amount,
        'frequency', b.frequency, 'next_due_on', b.next_due_on, 'autopay', b.autopay,
        'paid_from', case when a.id is null then null else a.institution || ' …' || coalesce(a.last4, '') end,
        'status', b.status, 'last_paid_on', b.last_paid_on, 'notes', b.notes) order by b.next_due_on nulls last, b.payee), '[]'::jsonb)
      from public.bills b left join public.properties pr on pr.id = b.property_id
           left join public.accounts a on a.id = b.paid_from_account_id)
    when 'insurance' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'kind', i.kind, 'carrier', i.carrier, 'insured', i.insured, 'policy_last4', i.policy_last4,
        'premium', i.premium, 'renews_on', i.renews_on, 'agent', ag.full_name, 'agent_phone', ag.phone, 'notes', i.notes) order by i.renews_on nulls last, i.carrier), '[]'::jsonb)
      from public.insurance_policies i left join public.people ag on ag.id = i.agent_person_id)
    when 'legal' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'doc_type', d.doc_type, 'title', d.title, 'principal', d.principal, 'status', d.status,
        'needs_recording', d.needs_recording, 'prepared_by', d.prepared_by, 'drafted_on', d.drafted_on,
        'signed_on', d.signed_on, 'recorded_on', d.recorded_on, 'original_location', d.original_location,
        'open_issue', d.open_issue, 'notes', d.notes) order by d.sort_order), '[]'::jsonb)
      from public.legal_documents d where d.status <> 'superseded')
    when 'final_wishes' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', w.id, 'person', w.person, 'topic', w.topic, 'wish', w.wish,
        'confirmed', w.confirmed, 'confirmed_on', w.confirmed_on) order by w.person, w.topic), '[]'::jsonb)
      from public.final_wishes w)
    when 'household' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', h.id, 'kind', h.kind, 'name', h.name, 'details', h.details) order by h.kind, h.name), '[]'::jsonb)
      from public.household_items h)
    when 'next_steps' then (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', n.id, 'title', n.title, 'owner', n.owner_name, 'due_on', n.due_on, 'done', n.done) order by n.done, n.sort_order), '[]'::jsonb)
      from public.next_steps n)
    else '[]'::jsonb
  end
$$;

-- The export. Called by the web app as `anon` with the bearer key.
-- p_sections null = everything the key may read.
create or replace function public.riana_export(p_key text, p_sections public.section[] default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  k         public.riana_inbound_keys;
  v_wanted  public.section[];
  v_allowed public.section[];
  v_denied  public.section[];
  v_out     jsonb := '{}'::jsonb;
  s         public.section;
begin
  select * into k from public.riana_inbound_keys
  where key_hash = app.hash_inbound_key(coalesce(p_key, '')) and revoked_at is null;
  if k.id is null then
    raise exception 'invalid inbound key' using errcode = '28000';
  end if;
  if p_sections is not null and not (p_sections <@ enum_range(null::public.section)) then
    raise exception 'unknown section' using errcode = '22023';
  end if;

  v_wanted  := coalesce(p_sections, k.read_sections);
  select coalesce(array_agg(x order by x), '{}') into v_allowed from unnest(v_wanted) x where x = any (k.read_sections);
  select coalesce(array_agg(x order by x), '{}') into v_denied  from unnest(v_wanted) x where not (x = any (k.read_sections));

  foreach s in array v_allowed loop
    v_out := v_out || jsonb_build_object(s::text, app.export_section(s, v_allowed));
  end loop;

  update public.riana_inbound_keys set last_used_at = now(), use_count = use_count + 1 where id = k.id;
  insert into public.audit_log (actor, action, section, entity, entity_id, via, details)
  values (null, 'export', null, 'riana_export', k.id, 'riana',
          jsonb_build_object('key_label', k.label, 'sections', to_jsonb(v_allowed), 'not_permitted', to_jsonb(v_denied)));

  return jsonb_build_object(
    'generated_at', now(),
    'key_label', k.label,
    'sections', v_out,
    'not_permitted', to_jsonb(v_denied),
    'never_exported', '["digital_accounts","family_history","documents","taxes","notify","admin"]'::jsonb);
end $$;

revoke all on function public.riana_export(text, public.section[]),
  public.riana_key_set_read_sections(uuid, public.section[]),
  app.export_section(public.section, public.section[]), app.export_health(public.subject) from public;
grant execute on function public.riana_export(text, public.section[]) to anon, authenticated;
grant execute on function public.riana_key_set_read_sections(uuid, public.section[]) to authenticated;
