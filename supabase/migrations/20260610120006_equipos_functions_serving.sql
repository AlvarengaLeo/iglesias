-- =====================================================================
-- EQUIPOS · 06 — Functions: membership sync, notifications, seed, serving RPCs
-- =====================================================================
-- Todas SECURITY DEFINER (bypassean RLS) y validan rol con user_role_in_church.
-- Las _sync_* son set-based e idempotentes (ON CONFLICT) para evitar tormentas
-- de locks en equipos grandes; las llaman los triggers (archivo 08).

-- ---------- helper: login (auth.users) de una persona ----------
CREATE OR REPLACE FUNCTION _person_login_user_id(p_church_id UUID, p_person_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM church_users
  WHERE church_id = p_church_id AND person_id = p_person_id AND is_active = true
  LIMIT 1;
$$;

-- ---------- _emit_notification: ÚNICO escritor de service_notifications ----------
CREATE OR REPLACE FUNCTION _emit_notification(
  p_church_id UUID, p_recipient_user_id UUID, p_type TEXT, p_title_key TEXT,
  p_params JSONB DEFAULT '{}'::jsonb, p_collapse_key TEXT DEFAULT NULL,
  p_dedupe_key TEXT DEFAULT NULL, p_service_event_id UUID DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL, p_channel_id UUID DEFAULT NULL, p_deep_link TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF p_recipient_user_id IS NULL THEN RETURN NULL; END IF;

  IF p_dedupe_key IS NOT NULL THEN
    INSERT INTO service_notifications (church_id, recipient_user_id, type, title_key, params, dedupe_key,
                                       service_event_id, assignment_id, channel_id, deep_link)
    VALUES (p_church_id, p_recipient_user_id, p_type, p_title_key, p_params, p_dedupe_key,
            p_service_event_id, p_assignment_id, p_channel_id, p_deep_link)
    ON CONFLICT (recipient_user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  IF p_collapse_key IS NOT NULL THEN
    INSERT INTO service_notifications (church_id, recipient_user_id, type, title_key, params, collapse_key,
                                       service_event_id, assignment_id, channel_id, deep_link)
    VALUES (p_church_id, p_recipient_user_id, p_type, p_title_key, p_params, p_collapse_key,
            p_service_event_id, p_assignment_id, p_channel_id, p_deep_link)
    ON CONFLICT (recipient_user_id, collapse_key) WHERE collapse_key IS NOT NULL AND status = 'unread'
    DO UPDATE SET created_at = now(), params = EXCLUDED.params, title_key = EXCLUDED.title_key
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  INSERT INTO service_notifications (church_id, recipient_user_id, type, title_key, params,
                                     service_event_id, assignment_id, channel_id, deep_link)
  VALUES (p_church_id, p_recipient_user_id, p_type, p_title_key, p_params,
          p_service_event_id, p_assignment_id, p_channel_id, p_deep_link)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ---------- _sync_team_channel: ensure team channel + reconcile membership ----------
CREATE OR REPLACE FUNCTION _sync_team_channel(p_church_id UUID, p_team_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_channel_id UUID; v_name TEXT;
BEGIN
  SELECT name INTO v_name FROM service_teams WHERE id = p_team_id AND church_id = p_church_id AND deleted_at IS NULL;
  IF v_name IS NULL THEN RETURN NULL; END IF;

  INSERT INTO chat_channels (church_id, room_type, team_id, name)
  VALUES (p_church_id, 'team', p_team_id, v_name)
  ON CONFLICT (team_id) WHERE room_type = 'team' AND deleted_at IS NULL
  DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_channel_id;

  -- enroll active team members that have an active login
  INSERT INTO chat_channel_members (church_id, channel_id, church_user_id, user_id, person_id)
  SELECT p_church_id, v_channel_id, cu.id, cu.user_id, stm.person_id
  FROM service_team_members stm
  JOIN church_users cu ON cu.person_id = stm.person_id AND cu.church_id = stm.church_id AND cu.is_active = true
  WHERE stm.team_id = p_team_id AND stm.church_id = p_church_id AND stm.is_active = true
  ON CONFLICT (channel_id, church_user_id) DO UPDATE SET is_active = true, removed_at = NULL;

  -- deactivate members no longer in roster
  UPDATE chat_channel_members m SET is_active = false, removed_at = now()
  WHERE m.channel_id = v_channel_id AND m.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM service_team_members stm
      JOIN church_users cu ON cu.person_id = stm.person_id AND cu.church_id = stm.church_id
      WHERE stm.team_id = p_team_id AND stm.is_active = true AND cu.id = m.church_user_id
    );

  RETURN v_channel_id;
END $$;

-- ---------- _sync_service_channel: ensure service channel + reconcile membership ----------
CREATE OR REPLACE FUNCTION _sync_service_channel(p_church_id UUID, p_service_event_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_channel_id UUID; v_title TEXT;
BEGIN
  SELECT title INTO v_title FROM service_events WHERE id = p_service_event_id AND church_id = p_church_id AND deleted_at IS NULL;
  IF v_title IS NULL THEN RETURN NULL; END IF;

  INSERT INTO chat_channels (church_id, room_type, service_event_id, name)
  VALUES (p_church_id, 'service', p_service_event_id, v_title)
  ON CONFLICT (service_event_id) WHERE room_type = 'service' AND deleted_at IS NULL
  DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_channel_id;

  INSERT INTO chat_channel_members (church_id, channel_id, church_user_id, user_id, person_id)
  SELECT DISTINCT p_church_id, v_channel_id, cu.id, cu.user_id, a.person_id
  FROM service_assignments a
  JOIN church_users cu ON cu.person_id = a.person_id AND cu.church_id = a.church_id AND cu.is_active = true
  WHERE a.service_event_id = p_service_event_id AND a.church_id = p_church_id
    AND a.deleted_at IS NULL AND a.status NOT IN ('cancelled','replaced')
  ON CONFLICT (channel_id, church_user_id) DO UPDATE SET is_active = true, removed_at = NULL;

  UPDATE chat_channel_members m SET is_active = false, removed_at = now()
  WHERE m.channel_id = v_channel_id AND m.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM service_assignments a
      JOIN church_users cu ON cu.person_id = a.person_id AND cu.church_id = a.church_id
      WHERE a.service_event_id = p_service_event_id AND a.deleted_at IS NULL
        AND a.status NOT IN ('cancelled','replaced') AND cu.id = m.church_user_id
    );

  RETURN v_channel_id;
END $$;

-- ---------- _enroll_login_into_channels: backfill al vincular un login ----------
CREATE OR REPLACE FUNCTION _enroll_login_into_channels(p_church_id UUID, p_person_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF p_person_id IS NULL THEN RETURN; END IF;
  FOR r IN SELECT DISTINCT team_id FROM service_team_members
           WHERE church_id = p_church_id AND person_id = p_person_id AND is_active = true LOOP
    PERFORM _sync_team_channel(p_church_id, r.team_id);
  END LOOP;
  FOR r IN SELECT DISTINCT service_event_id FROM service_assignments
           WHERE church_id = p_church_id AND person_id = p_person_id
             AND deleted_at IS NULL AND status NOT IN ('cancelled','replaced') LOOP
    PERFORM _sync_service_channel(p_church_id, r.service_event_id);
  END LOOP;
END $$;

-- ---------- rpc_seed_serving_defaults: catálogo por iglesia (idempotente) ----------
CREATE OR REPLACE FUNCTION rpc_seed_serving_defaults(p_church_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role TEXT; v_team_id UUID; v_team TEXT; v_created INT := 0;
  v_teams TEXT[] := ARRAY['Alabanza','Multimedia','Sonido','Ujieres','Niños','Jóvenes','Diáconos','Pastoral'];
BEGIN
  v_role := user_role_in_church(p_church_id);
  IF auth.uid() IS NOT NULL AND COALESCE(v_role,'') NOT IN ('admin','pastor','secretary') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  FOREACH v_team IN ARRAY v_teams LOOP
    INSERT INTO service_teams (church_id, name) VALUES (p_church_id, v_team)
    ON CONFLICT (church_id, lower(name)) WHERE deleted_at IS NULL DO NOTHING
    RETURNING id INTO v_team_id;

    IF v_team_id IS NULL THEN
      SELECT id INTO v_team_id FROM service_teams
       WHERE church_id = p_church_id AND lower(name) = lower(v_team) AND deleted_at IS NULL;
    ELSE
      v_created := v_created + 1;
    END IF;

    IF v_team = 'Alabanza' THEN
      INSERT INTO service_positions (church_id, team_id, name, sort_order) VALUES
        (p_church_id, v_team_id, 'Director de alabanza', 1),
        (p_church_id, v_team_id, 'Guitarrista', 2),
        (p_church_id, v_team_id, 'Baterista', 3),
        (p_church_id, v_team_id, 'Bajista', 4),
        (p_church_id, v_team_id, 'Tecladista', 5),
        (p_church_id, v_team_id, 'Vocalista', 6)
      ON CONFLICT (team_id, lower(name)) DO NOTHING;
    ELSIF v_team = 'Multimedia' THEN
      INSERT INTO service_positions (church_id, team_id, name, sort_order) VALUES
        (p_church_id, v_team_id, 'Proyección', 1),
        (p_church_id, v_team_id, 'Cámara', 2),
        (p_church_id, v_team_id, 'Streaming', 3)
      ON CONFLICT (team_id, lower(name)) DO NOTHING;
    ELSIF v_team = 'Sonido' THEN
      INSERT INTO service_positions (church_id, team_id, name, sort_order) VALUES
        (p_church_id, v_team_id, 'Operador de sonido', 1),
        (p_church_id, v_team_id, 'Monitoreo', 2)
      ON CONFLICT (team_id, lower(name)) DO NOTHING;
    ELSIF v_team = 'Ujieres' THEN
      INSERT INTO service_positions (church_id, team_id, name, sort_order) VALUES
        (p_church_id, v_team_id, 'Ujier', 1),
        (p_church_id, v_team_id, 'Encargado de ofrenda', 2),
        (p_church_id, v_team_id, 'Bienvenida', 3)
      ON CONFLICT (team_id, lower(name)) DO NOTHING;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('teams_created', v_created);
END $$;

-- ---------- rpc_create_service_event ----------
CREATE OR REPLACE FUNCTION rpc_create_service_event(
  p_church_id UUID, p_title TEXT, p_service_type TEXT DEFAULT 'culto_general',
  p_language TEXT DEFAULT NULL, p_start TIMESTAMPTZ DEFAULT NULL, p_end TIMESTAMPTZ DEFAULT NULL,
  p_location TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL, p_status TEXT DEFAULT 'scheduled'
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT; v_id UUID;
BEGIN
  v_role := user_role_in_church(p_church_id);
  IF COALESCE(v_role,'') NOT IN ('admin','pastor','secretary') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_start IS NULL THEN RAISE EXCEPTION 'start_datetime required'; END IF;

  INSERT INTO service_events (church_id, title, service_type, language, start_datetime, end_datetime,
                             location, notes, status, created_by)
  VALUES (p_church_id, p_title, p_service_type, p_language, p_start, p_end,
          p_location, p_notes, p_status, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (p_church_id, auth.uid(), 'service_event.create', 'service_event', v_id,
          jsonb_build_object('title', p_title, 'service_type', p_service_type, 'start', p_start));
  RETURN v_id;
END $$;

-- ---------- rpc_assign_person ----------
CREATE OR REPLACE FUNCTION rpc_assign_person(
  p_church_id UUID, p_service_event_id UUID, p_position_id UUID, p_person_id UUID,
  p_arrival_time TIME DEFAULT NULL, p_notes TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT; v_team_id UUID; v_assignment_id UUID; v_recipient UUID;
BEGIN
  v_role := user_role_in_church(p_church_id);
  SELECT team_id INTO v_team_id FROM service_positions WHERE id = p_position_id AND church_id = p_church_id;
  IF v_team_id IS NULL THEN RAISE EXCEPTION 'position not found in church'; END IF;
  IF NOT (COALESCE(v_role,'') IN ('admin','pastor','secretary') OR is_team_leader(p_church_id, v_team_id)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM people WHERE id = p_person_id AND church_id = p_church_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'person not found in church'; END IF;

  INSERT INTO service_assignments (church_id, service_event_id, team_id, position_id, person_id,
                                  status, arrival_time, notes, assigned_by)
  VALUES (p_church_id, p_service_event_id, v_team_id, p_position_id, p_person_id,
          'pending', p_arrival_time, p_notes, auth.uid())
  RETURNING id INTO v_assignment_id;

  INSERT INTO service_assignment_responses (church_id, assignment_id, from_status, to_status, actor_user_id, reason)
  VALUES (p_church_id, v_assignment_id, NULL, 'pending', auth.uid(), 'assigned');

  PERFORM _sync_service_channel(p_church_id, p_service_event_id);

  v_recipient := _person_login_user_id(p_church_id, p_person_id);
  IF v_recipient IS NOT NULL THEN
    PERFORM _emit_notification(p_church_id, v_recipient, 'assignment_created', 'notif.assignment_created',
      jsonb_build_object('event_id', p_service_event_id), NULL, NULL,
      p_service_event_id, v_assignment_id, NULL, '#equipos?tab=mi-servicio');
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (p_church_id, auth.uid(), 'assignment.create', 'service_assignment', v_assignment_id,
          jsonb_build_object('event', p_service_event_id, 'position', p_position_id, 'person', p_person_id));
  RETURN v_assignment_id;
END $$;

-- ---------- rpc_respond_assignment (servidor: confirma/declina/reemplazo, SOLO la suya) ----------
CREATE OR REPLACE FUNCTION rpc_respond_assignment(
  p_assignment_id UUID, p_response TEXT, p_message TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a service_assignments%ROWTYPE; v_my_person UUID; v_leader_recipient UUID;
BEGIN
  IF p_response NOT IN ('confirmed','declined','needs_replacement') THEN
    RAISE EXCEPTION 'invalid response';
  END IF;
  SELECT * INTO a FROM service_assignments WHERE id = p_assignment_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;

  v_my_person := my_person_id(a.church_id);
  IF v_my_person IS NULL OR a.person_id <> v_my_person THEN
    RAISE EXCEPTION 'forbidden: not your assignment' USING ERRCODE = '42501';
  END IF;
  IF a.status IN ('replaced','cancelled') THEN
    RAISE EXCEPTION 'assignment is %', a.status;
  END IF;

  UPDATE service_assignments SET status = p_response WHERE id = a.id;
  INSERT INTO service_assignment_responses (church_id, assignment_id, from_status, to_status, actor_user_id, reason)
  VALUES (a.church_id, a.id, a.status, p_response, auth.uid(), p_message);

  IF p_response IN ('declined','needs_replacement') THEN
    SELECT _person_login_user_id(a.church_id, t.leader_person_id) INTO v_leader_recipient
    FROM service_teams t WHERE t.id = a.team_id;
    IF v_leader_recipient IS NOT NULL THEN
      PERFORM _emit_notification(a.church_id, v_leader_recipient, 'replacement_needed', 'notif.replacement_needed',
        jsonb_build_object('assignment', a.id), NULL, NULL, a.service_event_id, a.id, NULL, '#equipos?tab=calendario');
    END IF;
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (a.church_id, auth.uid(), 'assignment.' || p_response, 'service_assignment', a.id,
          jsonb_build_object('message', p_message));
  RETURN jsonb_build_object('assignment_id', a.id, 'status', p_response);
END $$;

-- ---------- rpc_assignment_transition (staff/leader) ----------
CREATE OR REPLACE FUNCTION rpc_assignment_transition(
  p_assignment_id UUID, p_to_status TEXT, p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a service_assignments%ROWTYPE; v_role TEXT; v_recipient UUID;
BEGIN
  IF p_to_status NOT IN ('pending','confirmed','declined','needs_replacement','cancelled') THEN
    RAISE EXCEPTION 'invalid target status';
  END IF;
  SELECT * INTO a FROM service_assignments WHERE id = p_assignment_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  v_role := user_role_in_church(a.church_id);
  IF NOT (COALESCE(v_role,'') IN ('admin','pastor','secretary') OR is_team_leader(a.church_id, a.team_id)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE service_assignments SET status = p_to_status WHERE id = a.id;
  INSERT INTO service_assignment_responses (church_id, assignment_id, from_status, to_status, actor_user_id, reason)
  VALUES (a.church_id, a.id, a.status, p_to_status, auth.uid(), p_reason);

  v_recipient := _person_login_user_id(a.church_id, a.person_id);
  IF v_recipient IS NOT NULL THEN
    PERFORM _emit_notification(a.church_id, v_recipient,
      CASE WHEN p_to_status = 'cancelled' THEN 'assignment_cancelled' ELSE 'assignment_updated' END,
      'notif.assignment_updated', jsonb_build_object('status', p_to_status), NULL, NULL,
      a.service_event_id, a.id, NULL, '#equipos?tab=mi-servicio');
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (a.church_id, auth.uid(), 'assignment.transition', 'service_assignment', a.id,
          jsonb_build_object('to', p_to_status, 'reason', p_reason));
  RETURN jsonb_build_object('assignment_id', a.id, 'status', p_to_status);
END $$;

-- ---------- rpc_fill_replacement (staff/leader) ----------
CREATE OR REPLACE FUNCTION rpc_fill_replacement(
  p_assignment_id UUID, p_new_person_id UUID, p_arrival_time TIME DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a service_assignments%ROWTYPE; v_role TEXT; v_new UUID; v_recipient UUID;
BEGIN
  SELECT * INTO a FROM service_assignments WHERE id = p_assignment_id FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'assignment not found'; END IF;
  v_role := user_role_in_church(a.church_id);
  IF NOT (COALESCE(v_role,'') IN ('admin','pastor','secretary') OR is_team_leader(a.church_id, a.team_id)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM people WHERE id = p_new_person_id AND church_id = a.church_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'replacement person not found'; END IF;

  INSERT INTO service_assignments (church_id, service_event_id, team_id, position_id, person_id,
                                  status, arrival_time, assigned_by)
  VALUES (a.church_id, a.service_event_id, a.team_id, a.position_id, p_new_person_id,
          'pending', COALESCE(p_arrival_time, a.arrival_time), auth.uid())
  RETURNING id INTO v_new;

  UPDATE service_assignments SET status = 'replaced', replaced_by_assignment_id = v_new WHERE id = a.id;
  INSERT INTO service_assignment_responses (church_id, assignment_id, from_status, to_status, actor_user_id, reason)
  VALUES (a.church_id, a.id, a.status, 'replaced', auth.uid(), 'replaced');
  INSERT INTO service_assignment_responses (church_id, assignment_id, from_status, to_status, actor_user_id, reason)
  VALUES (a.church_id, v_new, NULL, 'pending', auth.uid(), 'replacement');

  PERFORM _sync_service_channel(a.church_id, a.service_event_id);

  v_recipient := _person_login_user_id(a.church_id, p_new_person_id);
  IF v_recipient IS NOT NULL THEN
    PERFORM _emit_notification(a.church_id, v_recipient, 'assignment_created', 'notif.assignment_created',
      jsonb_build_object('event_id', a.service_event_id), NULL, NULL,
      a.service_event_id, v_new, NULL, '#equipos?tab=mi-servicio');
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (a.church_id, auth.uid(), 'assignment.replace', 'service_assignment', a.id,
          jsonb_build_object('new_assignment', v_new, 'new_person', p_new_person_id));
  RETURN jsonb_build_object('old_assignment_id', a.id, 'new_assignment_id', v_new);
END $$;

-- ---------- rpc_get_my_services (servidor) ----------
CREATE OR REPLACE FUNCTION rpc_get_my_services(p_church_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_person UUID; v_result JSONB;
BEGIN
  IF NOT (p_church_id = ANY (user_church_ids())) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  v_person := my_person_id(p_church_id);
  IF v_person IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(j ORDER BY st), '[]'::jsonb) INTO v_result FROM (
    SELECT e.start_datetime AS st, jsonb_build_object(
      'assignment_id', a.id, 'status', a.status, 'arrival_time', a.arrival_time,
      'event_id', e.id, 'title', e.title, 'service_type', e.service_type,
      'start_datetime', e.start_datetime, 'end_datetime', e.end_datetime, 'location', e.location,
      'team', t.name, 'position', p.name
    ) AS j
    FROM service_assignments a
    JOIN service_events e ON e.id = a.service_event_id
    JOIN service_teams t ON t.id = a.team_id
    JOIN service_positions p ON p.id = a.position_id
    WHERE a.church_id = p_church_id AND a.person_id = v_person
      AND a.deleted_at IS NULL AND e.deleted_at IS NULL
      AND a.status NOT IN ('replaced','cancelled')
      AND e.start_datetime >= now() - INTERVAL '1 day'
  ) sub;
  RETURN v_result;
END $$;

-- ---------- rpc_get_service_detail ----------
CREATE OR REPLACE FUNCTION rpc_get_service_detail(p_service_event_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e service_events%ROWTYPE; v_assignments JSONB;
BEGIN
  SELECT * INTO e FROM service_events WHERE id = p_service_event_id;
  IF e.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT (e.church_id = ANY (user_church_ids())) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT (
    user_role_in_church(e.church_id) IN ('admin','pastor','secretary')
    OR EXISTS (SELECT 1 FROM service_assignments a WHERE a.service_event_id = e.id AND a.deleted_at IS NULL
               AND (is_team_leader(e.church_id, a.team_id) OR a.person_id = my_person_id(e.church_id)))
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'assignment_id', a.id, 'status', a.status, 'arrival_time', a.arrival_time,
           'team_id', a.team_id, 'team', t.name, 'position_id', a.position_id, 'position', p.name,
           'person_id', a.person_id,
           'person_name', COALESCE(NULLIF(trim(coalesce(pe.first_name,'')||' '||coalesce(pe.last_name,'')),''), pe.organization_name)
         ) ORDER BY t.name, p.sort_order), '[]'::jsonb) INTO v_assignments
  FROM service_assignments a
  JOIN service_teams t ON t.id = a.team_id
  JOIN service_positions p ON p.id = a.position_id
  JOIN people pe ON pe.id = a.person_id
  WHERE a.service_event_id = e.id AND a.deleted_at IS NULL AND a.status NOT IN ('cancelled','replaced');

  RETURN jsonb_build_object(
    'id', e.id, 'title', e.title, 'service_type', e.service_type, 'language', e.language,
    'start_datetime', e.start_datetime, 'end_datetime', e.end_datetime,
    'location', e.location, 'notes', e.notes, 'status', e.status,
    'assignments', v_assignments
  );
END $$;

-- ---------- rpc_get_team_calendar ----------
CREATE OR REPLACE FUNCTION rpc_get_team_calendar(
  p_church_id UUID, p_team_id UUID, p_from TIMESTAMPTZ DEFAULT now(), p_to TIMESTAMPTZ DEFAULT (now() + INTERVAL '60 days')
) RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT (p_church_id = ANY (user_church_ids())) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF NOT (user_role_in_church(p_church_id) IN ('admin','pastor','secretary')
          OR is_team_leader(p_church_id, p_team_id) OR is_team_member(p_church_id, p_team_id)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(j ORDER BY st), '[]'::jsonb) INTO v_result FROM (
    SELECT e.start_datetime AS st, jsonb_build_object(
      'event_id', e.id, 'title', e.title, 'service_type', e.service_type,
      'start_datetime', e.start_datetime, 'location', e.location,
      'assigned_count', (SELECT count(*) FROM service_assignments a2
                         WHERE a2.service_event_id = e.id AND a2.team_id = p_team_id
                           AND a2.deleted_at IS NULL AND a2.status NOT IN ('cancelled','replaced')),
      'confirmed_count', (SELECT count(*) FROM service_assignments a3
                          WHERE a3.service_event_id = e.id AND a3.team_id = p_team_id
                            AND a3.deleted_at IS NULL AND a3.status = 'confirmed')
    ) AS j
    FROM service_events e
    WHERE e.church_id = p_church_id AND e.deleted_at IS NULL
      AND e.start_datetime >= p_from AND e.start_datetime <= p_to
      AND EXISTS (SELECT 1 FROM service_assignments a WHERE a.service_event_id = e.id
                  AND a.team_id = p_team_id AND a.deleted_at IS NULL)
  ) sub;
  RETURN v_result;
END $$;
