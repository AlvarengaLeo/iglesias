-- =====================================================================
-- EQUIPOS · 12 — rpc_send_message con adjuntos (F6)
-- =====================================================================
-- Recrea rpc_send_message agregando p_attachments (jsonb array) e insertando
-- chat_attachments en la MISMA transacción (atómico). Permite mensajes solo-adjunto
-- (body vacío) cuando hay al menos un adjunto. chat_attachments.insert sigue
-- bloqueado por RLS para el cliente: solo este RPC SECURITY DEFINER inserta.

DROP FUNCTION IF EXISTS rpc_send_message(uuid, text, bigint, uuid, uuid[]);

CREATE OR REPLACE FUNCTION rpc_send_message(
  p_channel_id UUID, p_body TEXT, p_reply_to BIGINT DEFAULT NULL,
  p_client_nonce UUID DEFAULT NULL, p_mentions UUID[] DEFAULT NULL,
  p_attachments JSONB DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c chat_channels%ROWTYPE; v_cu_id UUID; v_msg_id BIGINT; v_public UUID; v_created TIMESTAMPTZ; rec RECORD;
  v_has_attach BOOLEAN := (p_attachments IS NOT NULL AND jsonb_array_length(p_attachments) > 0);
BEGIN
  IF (p_body IS NULL OR length(trim(p_body)) = 0) AND NOT v_has_attach THEN
    RAISE EXCEPTION 'empty message';
  END IF;

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
  VALUES (c.church_id, c.id, v_cu_id, auth.uid(), NULLIF(trim(coalesce(p_body,'')), ''), p_reply_to, p_client_nonce)
  ON CONFLICT (channel_id, client_nonce) WHERE client_nonce IS NOT NULL DO NOTHING
  RETURNING id, public_id, created_at INTO v_msg_id, v_public, v_created;

  IF v_msg_id IS NULL AND p_client_nonce IS NOT NULL THEN
    SELECT id, public_id, created_at INTO v_msg_id, v_public, v_created
    FROM chat_messages WHERE channel_id = c.id AND client_nonce = p_client_nonce;
    RETURN jsonb_build_object('id', v_msg_id, 'public_id', v_public, 'created_at', v_created, 'deduped', true);
  END IF;

  -- adjuntos (misma transacción)
  IF v_has_attach THEN
    INSERT INTO chat_attachments (church_id, message_id, storage_path, mime, size_bytes, width, height)
    SELECT c.church_id, v_msg_id,
           a->>'storage_path', a->>'mime', NULLIF(a->>'size_bytes','')::bigint,
           NULLIF(a->>'width','')::int, NULLIF(a->>'height','')::int
    FROM jsonb_array_elements(p_attachments) a
    WHERE a->>'storage_path' IS NOT NULL;
  END IF;

  -- menciones
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

  -- notificación chat_message colapsada
  INSERT INTO service_notifications (church_id, recipient_user_id, type, title_key, params, collapse_key, channel_id, deep_link)
  SELECT c.church_id, m.user_id, 'chat_message', 'notif.chat_message',
         jsonb_build_object('channel_id', c.id), 'chat:' || c.id::text, c.id, '#equipos?tab=chat'
  FROM chat_channel_members m
  WHERE m.channel_id = c.id AND m.is_active = true AND m.muted = false AND m.user_id <> auth.uid()
    AND NOT (p_mentions IS NOT NULL AND m.church_user_id = ANY (p_mentions))
  ON CONFLICT (recipient_user_id, collapse_key) WHERE collapse_key IS NOT NULL AND status = 'unread'
  DO UPDATE SET created_at = now();

  RETURN jsonb_build_object('id', v_msg_id, 'public_id', v_public, 'created_at', v_created, 'has_attachments', v_has_attach);
END $$;
