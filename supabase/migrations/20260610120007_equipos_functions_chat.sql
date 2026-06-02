-- =====================================================================
-- EQUIPOS · 07 — Functions: chat RPCs + notification mark-read
-- =====================================================================
-- Toda escritura de chat pasa por estas RPCs SECURITY DEFINER (RLS bloquea
-- INSERT/UPDATE/DELETE directos). Membresía se verifica con is_channel_member.

-- ---------- rpc_send_message ----------
CREATE OR REPLACE FUNCTION rpc_send_message(
  p_channel_id UUID, p_body TEXT, p_reply_to BIGINT DEFAULT NULL,
  p_client_nonce UUID DEFAULT NULL, p_mentions UUID[] DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c chat_channels%ROWTYPE; v_cu_id UUID; v_msg_id BIGINT; v_public UUID; v_created TIMESTAMPTZ; rec RECORD;
BEGIN
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'empty message'; END IF;

  SELECT * INTO c FROM chat_channels WHERE id = p_channel_id AND deleted_at IS NULL;
  IF c.id IS NULL THEN RAISE EXCEPTION 'channel not found'; END IF;

  IF NOT (is_channel_member(c.id)
          OR (c.room_type <> 'dm' AND user_role_in_church(c.church_id) IN ('admin','pastor'))) THEN
    RAISE EXCEPTION 'forbidden: not a channel member' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_cu_id FROM church_users
   WHERE user_id = auth.uid() AND church_id = c.church_id AND is_active = true LIMIT 1;

  IF p_reply_to IS NOT NULL THEN
    PERFORM 1 FROM chat_messages WHERE id = p_reply_to AND channel_id = c.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'reply target not in channel'; END IF;
  END IF;

  INSERT INTO chat_messages (church_id, channel_id, sender_church_user_id, sender_user_id, body, reply_to_message_id, client_nonce)
  VALUES (c.church_id, c.id, v_cu_id, auth.uid(), p_body, p_reply_to, p_client_nonce)
  ON CONFLICT (channel_id, client_nonce) WHERE client_nonce IS NOT NULL DO NOTHING
  RETURNING id, public_id, created_at INTO v_msg_id, v_public, v_created;

  -- envío optimista duplicado (mismo nonce): devolver el existente
  IF v_msg_id IS NULL AND p_client_nonce IS NOT NULL THEN
    SELECT id, public_id, created_at INTO v_msg_id, v_public, v_created
    FROM chat_messages WHERE channel_id = c.id AND client_nonce = p_client_nonce;
    RETURN jsonb_build_object('id', v_msg_id, 'public_id', v_public, 'created_at', v_created, 'deduped', true);
  END IF;

  -- menciones (solo co-miembros del canal)
  IF p_mentions IS NOT NULL AND array_length(p_mentions, 1) > 0 THEN
    INSERT INTO chat_message_mentions (church_id, message_id, mentioned_church_user_id)
    SELECT c.church_id, v_msg_id, mu FROM unnest(p_mentions) AS mu
    WHERE EXISTS (SELECT 1 FROM chat_channel_members m
                  WHERE m.channel_id = c.id AND m.church_user_id = mu AND m.is_active = true)
    ON CONFLICT (message_id, mentioned_church_user_id) DO NOTHING;

    FOR rec IN
      SELECT cu.user_id FROM church_users cu
      WHERE cu.id = ANY (p_mentions) AND cu.church_id = c.church_id AND cu.is_active = true
        AND cu.user_id <> auth.uid()
    LOOP
      PERFORM _emit_notification(c.church_id, rec.user_id, 'chat_mention', 'notif.chat_mention',
        jsonb_build_object('channel_id', c.id), NULL, NULL, NULL, NULL, c.id, '#equipos?tab=chat');
    END LOOP;
  END IF;

  -- notificación chat_message colapsada (1 fila no-leída por sala), excluyendo
  -- sender, silenciados (muted) y los ya mencionados.
  INSERT INTO service_notifications (church_id, recipient_user_id, type, title_key, params, collapse_key, channel_id, deep_link)
  SELECT c.church_id, m.user_id, 'chat_message', 'notif.chat_message',
         jsonb_build_object('channel_id', c.id), 'chat:' || c.id::text, c.id, '#equipos?tab=chat'
  FROM chat_channel_members m
  WHERE m.channel_id = c.id AND m.is_active = true AND m.muted = false AND m.user_id <> auth.uid()
    AND NOT (p_mentions IS NOT NULL AND m.church_user_id = ANY (p_mentions))
  ON CONFLICT (recipient_user_id, collapse_key) WHERE collapse_key IS NOT NULL AND status = 'unread'
  DO UPDATE SET created_at = now();

  RETURN jsonb_build_object('id', v_msg_id, 'public_id', v_public, 'created_at', v_created);
END $$;

-- ---------- rpc_edit_message (autor, ventana 24h) ----------
CREATE OR REPLACE FUNCTION rpc_edit_message(p_message_id BIGINT, p_body TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m chat_messages%ROWTYPE;
BEGIN
  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN RAISE EXCEPTION 'empty message'; END IF;
  SELECT * INTO m FROM chat_messages WHERE id = p_message_id;
  IF m.id IS NULL OR m.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'message not found'; END IF;
  IF m.sender_user_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF now() - m.created_at > INTERVAL '24 hours' THEN RAISE EXCEPTION 'edit window expired'; END IF;

  UPDATE chat_messages SET body = p_body, edited_at = now() WHERE id = m.id;
  RETURN jsonb_build_object('id', m.id, 'edited_at', now());
END $$;

-- ---------- rpc_delete_message (autor o moderador) ----------
CREATE OR REPLACE FUNCTION rpc_delete_message(p_message_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m chat_messages%ROWTYPE; c chat_channels%ROWTYPE; v_can BOOLEAN := false;
BEGIN
  SELECT * INTO m FROM chat_messages WHERE id = p_message_id;
  IF m.id IS NULL OR m.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'message not found'; END IF;
  SELECT * INTO c FROM chat_channels WHERE id = m.channel_id;

  IF m.sender_user_id = auth.uid() THEN
    v_can := true;
  ELSIF c.room_type <> 'dm' AND user_role_in_church(c.church_id) IN ('admin','pastor') THEN
    v_can := true;
  ELSIF c.room_type IN ('team','position') AND c.team_id IS NOT NULL AND is_team_leader(c.church_id, c.team_id) THEN
    v_can := true;
  END IF;
  IF NOT v_can THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  UPDATE chat_messages SET body = NULL, deleted_at = now() WHERE id = m.id;
  DELETE FROM chat_attachments WHERE message_id = m.id;
  DELETE FROM chat_message_mentions WHERE message_id = m.id;
  RETURN jsonb_build_object('id', m.id, 'deleted_at', now());
END $$;

-- ---------- rpc_mark_channel_read ----------
CREATE OR REPLACE FUNCTION rpc_mark_channel_read(p_channel_id UUID, p_up_to BIGINT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max BIGINT;
BEGIN
  IF NOT is_channel_member(p_channel_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  v_max := COALESCE(p_up_to, (SELECT max(id) FROM chat_messages WHERE channel_id = p_channel_id AND deleted_at IS NULL));
  UPDATE chat_channel_members
  SET last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), COALESCE(v_max, 0)),
      last_read_at = now()
  WHERE channel_id = p_channel_id AND user_id = auth.uid();
  RETURN jsonb_build_object('channel_id', p_channel_id, 'last_read_message_id', v_max);
END $$;

-- ---------- rpc_set_channel_muted ----------
CREATE OR REPLACE FUNCTION rpc_set_channel_muted(p_channel_id UUID, p_muted BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_channel_member(p_channel_id) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE chat_channel_members SET muted = p_muted WHERE channel_id = p_channel_id AND user_id = auth.uid();
  RETURN jsonb_build_object('channel_id', p_channel_id, 'muted', p_muted);
END $$;

-- ---------- rpc_create_or_get_dm (race-safe) ----------
CREATE OR REPLACE FUNCTION rpc_create_or_get_dm(p_church_id UUID, p_other_church_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me UUID; v_me_user UUID; v_other_user UUID; v_key TEXT; v_channel UUID;
BEGIN
  SELECT id, user_id INTO v_me, v_me_user FROM church_users
   WHERE user_id = auth.uid() AND church_id = p_church_id AND is_active = true LIMIT 1;
  IF v_me IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_other_church_user_id = v_me THEN RAISE EXCEPTION 'cannot DM yourself'; END IF;

  SELECT user_id INTO v_other_user FROM church_users
   WHERE id = p_other_church_user_id AND church_id = p_church_id AND is_active = true;
  IF v_other_user IS NULL THEN RAISE EXCEPTION 'recipient not found'; END IF;

  v_key := LEAST(v_me, p_other_church_user_id)::text || ':' || GREATEST(v_me, p_other_church_user_id)::text;

  INSERT INTO chat_channels (church_id, room_type, dm_key, name)
  VALUES (p_church_id, 'dm', v_key, NULL)
  ON CONFLICT (church_id, dm_key) WHERE room_type = 'dm' DO NOTHING
  RETURNING id INTO v_channel;

  IF v_channel IS NULL THEN
    SELECT id INTO v_channel FROM chat_channels WHERE church_id = p_church_id AND dm_key = v_key AND room_type = 'dm';
  END IF;

  INSERT INTO chat_channel_members (church_id, channel_id, church_user_id, user_id)
  VALUES (p_church_id, v_channel, v_me, v_me_user),
         (p_church_id, v_channel, p_other_church_user_id, v_other_user)
  ON CONFLICT (channel_id, church_user_id) DO UPDATE SET is_active = true, removed_at = NULL;

  RETURN jsonb_build_object('channel_id', v_channel, 'dm_key', v_key);
END $$;

-- ---------- rpc_unread_summary ----------
CREATE OR REPLACE FUNCTION rpc_unread_summary(p_church_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  IF NOT (p_church_id = ANY (user_church_ids())) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'total', COALESCE(SUM(unread), 0),
    'channels', COALESCE(jsonb_agg(jsonb_build_object('channel_id', channel_id, 'unread', unread)
                         ORDER BY unread DESC) FILTER (WHERE unread > 0), '[]'::jsonb)
  ) INTO v_result FROM (
    SELECT m.channel_id, (
      SELECT count(*) FROM chat_messages msg
      WHERE msg.channel_id = m.channel_id AND msg.deleted_at IS NULL
        AND msg.id > COALESCE(m.last_read_message_id, 0)
        AND msg.sender_user_id IS DISTINCT FROM auth.uid()
    ) AS unread
    FROM chat_channel_members m
    WHERE m.user_id = auth.uid() AND m.is_active = true AND m.church_id = p_church_id
  ) t;
  RETURN v_result;
END $$;

-- ---------- rpc_notification_mark_read / mark_all_read ----------
CREATE OR REPLACE FUNCTION rpc_notification_mark_read(p_notification_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE service_notifications SET status = 'read', read_at = now()
  WHERE id = p_notification_id AND recipient_user_id = auth.uid() AND status = 'unread';
END $$;

CREATE OR REPLACE FUNCTION rpc_notifications_mark_all_read(p_church_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE service_notifications SET status = 'read', read_at = now()
  WHERE recipient_user_id = auth.uid() AND church_id = p_church_id AND status = 'unread';
END $$;
