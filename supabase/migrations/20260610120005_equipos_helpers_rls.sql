-- =====================================================================
-- EQUIPOS · 05 — Helpers + RLS
-- =====================================================================
-- Helpers STABLE SECURITY DEFINER (search_path=public), índice-backed.
-- RLS: políticas POR COMANDO (nunca FOR ALL) + FOR DELETE USING(false) explícito
-- en tablas con soft-delete (lección de content_rls.sql:10-12: FOR ALL combina
-- por OR y anula el _no_delete). Escrituras de estado/chat van por RPCs
-- SECURITY DEFINER (bypassean RLS), así que sus policies de escritura son false.

-- ============================ Helpers ============================

CREATE OR REPLACE FUNCTION my_person_id(p_church_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT person_id FROM church_users
  WHERE user_id = auth.uid() AND church_id = p_church_id AND is_active = true
  LIMIT 1;
$$;
COMMENT ON FUNCTION my_person_id IS 'person_id ligado al login actual en esa iglesia. NULL para staff sin ficha.';

CREATE OR REPLACE FUNCTION is_team_member(p_church_id UUID, p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM service_team_members stm
    JOIN church_users cu ON cu.person_id = stm.person_id AND cu.church_id = stm.church_id
    WHERE stm.team_id = p_team_id AND stm.church_id = p_church_id AND stm.is_active = true
      AND cu.user_id = auth.uid() AND cu.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_team_leader(p_church_id UUID, p_team_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM service_teams t
    JOIN church_users cu ON cu.person_id = t.leader_person_id AND cu.church_id = t.church_id
    WHERE t.id = p_team_id AND t.church_id = p_church_id
      AND cu.user_id = auth.uid() AND cu.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM service_team_members stm
    JOIN church_users cu ON cu.person_id = stm.person_id AND cu.church_id = stm.church_id
    WHERE stm.team_id = p_team_id AND stm.church_id = p_church_id
      AND stm.team_role = 'leader' AND stm.is_active = true
      AND cu.user_id = auth.uid() AND cu.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_channel_member(p_channel_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_channel_members m
    WHERE m.channel_id = p_channel_id AND m.user_id = auth.uid() AND m.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION user_channel_ids()
RETURNS UUID[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(channel_id), '{}'::uuid[])
  FROM chat_channel_members
  WHERE user_id = auth.uid() AND is_active = true;
$$;

-- ============================ Serving RLS ============================

-- ---------- service_events ----------
ALTER TABLE service_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY se_select ON service_events FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    user_role_in_church(church_id) IN ('admin','pastor','secretary')
    OR EXISTS (
      SELECT 1 FROM service_assignments a
      WHERE a.service_event_id = service_events.id AND a.deleted_at IS NULL
        AND (is_team_leader(church_id, a.team_id) OR a.person_id = my_person_id(church_id))
    )
  )
);
CREATE POLICY se_insert ON service_events FOR INSERT WITH CHECK (
  church_id = ANY (user_church_ids())
  AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
);
CREATE POLICY se_update ON service_events FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );
CREATE POLICY se_no_delete ON service_events FOR DELETE USING (false);

-- ---------- service_teams ----------
ALTER TABLE service_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY st_select ON service_teams FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    user_role_in_church(church_id) IN ('admin','pastor','secretary')
    OR is_team_member(church_id, id) OR is_team_leader(church_id, id)
  )
);
CREATE POLICY st_insert ON service_teams FOR INSERT WITH CHECK (
  church_id = ANY (user_church_ids())
  AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
);
CREATE POLICY st_update ON service_teams FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );
CREATE POLICY st_no_delete ON service_teams FOR DELETE USING (false);

-- ---------- service_positions ----------
ALTER TABLE service_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sp_select ON service_positions FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    user_role_in_church(church_id) IN ('admin','pastor','secretary')
    OR is_team_member(church_id, team_id) OR is_team_leader(church_id, team_id)
  )
);
CREATE POLICY sp_insert ON service_positions FOR INSERT WITH CHECK (
  church_id = ANY (user_church_ids())
  AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
);
CREATE POLICY sp_update ON service_positions FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );
CREATE POLICY sp_no_delete ON service_positions FOR DELETE USING (false);

-- ---------- service_team_members ----------
ALTER TABLE service_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY stm_select ON service_team_members FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    user_role_in_church(church_id) IN ('admin','pastor','secretary')
    OR is_team_leader(church_id, team_id) OR is_team_member(church_id, team_id)
  )
);
CREATE POLICY stm_insert ON service_team_members FOR INSERT WITH CHECK (
  church_id = ANY (user_church_ids()) AND (
    user_role_in_church(church_id) IN ('admin','pastor','secretary')
    OR is_team_leader(church_id, team_id)
  )
);
CREATE POLICY stm_update ON service_team_members FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids()) AND (
      user_role_in_church(church_id) IN ('admin','pastor','secretary')
      OR is_team_leader(church_id, team_id)
    )
  );
CREATE POLICY stm_no_delete ON service_team_members FOR DELETE USING (false);

-- ---------- service_assignments ----------
ALTER TABLE service_assignments ENABLE ROW LEVEL SECURITY;

-- staff ve todo; leader su equipo; servidor SOLO lo suyo (por person_id).
CREATE POLICY sa_select ON service_assignments FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    user_role_in_church(church_id) IN ('admin','pastor','secretary')
    OR is_team_leader(church_id, team_id)
    OR person_id = my_person_id(church_id)
  )
);
CREATE POLICY sa_insert ON service_assignments FOR INSERT WITH CHECK (
  church_id = ANY (user_church_ids()) AND (
    user_role_in_church(church_id) IN ('admin','pastor','secretary')
    OR is_team_leader(church_id, team_id)
  )
);
-- El servidor NO actualiza directo: confirma/declina/reemplazo via rpc_respond_assignment.
CREATE POLICY sa_update ON service_assignments FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids()) AND (
      user_role_in_church(church_id) IN ('admin','pastor','secretary')
      OR is_team_leader(church_id, team_id)
    )
  );
CREATE POLICY sa_no_delete ON service_assignments FOR DELETE USING (false);

-- ---------- service_assignment_responses (append-only; insert via RPC) ----------
ALTER TABLE service_assignment_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY sar_select ON service_assignment_responses FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND EXISTS (
    SELECT 1 FROM service_assignments a
    WHERE a.id = service_assignment_responses.assignment_id
      AND (user_role_in_church(a.church_id) IN ('admin','pastor','secretary')
           OR is_team_leader(a.church_id, a.team_id)
           OR a.person_id = my_person_id(a.church_id))
  )
);
CREATE POLICY sar_no_insert ON service_assignment_responses FOR INSERT WITH CHECK (false);
CREATE POLICY sar_no_update ON service_assignment_responses FOR UPDATE USING (false);
CREATE POLICY sar_no_delete ON service_assignment_responses FOR DELETE USING (false);

-- ============================ Chat RLS ============================

-- ---------- chat_channels ----------
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

-- Miembros ven su canal; admin/pastor ven canales de GRUPO (no DM) para moderación.
CREATE POLICY cc_select ON chat_channels FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    is_channel_member(id)
    OR (room_type <> 'dm' AND user_role_in_church(church_id) IN ('admin','pastor'))
  )
);
-- Canales SOLO se crean por triggers/RPC (SECURITY DEFINER).
CREATE POLICY cc_no_insert ON chat_channels FOR INSERT WITH CHECK (false);
CREATE POLICY cc_update ON chat_channels FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );
CREATE POLICY cc_no_delete ON chat_channels FOR DELETE USING (false);

-- ---------- chat_channel_members ----------
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY ccm_select ON chat_channel_members FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    user_id = auth.uid()
    OR is_channel_member(channel_id)
    OR EXISTS (SELECT 1 FROM chat_channels c
               WHERE c.id = channel_id AND c.room_type <> 'dm'
                 AND user_role_in_church(c.church_id) IN ('admin','pastor'))
  )
);
-- Membresía y last_read/muted se gestionan SOLO por RPC/triggers SECURITY DEFINER.
CREATE POLICY ccm_no_insert ON chat_channel_members FOR INSERT WITH CHECK (false);
CREATE POLICY ccm_no_update ON chat_channel_members FOR UPDATE USING (false);
CREATE POLICY ccm_no_delete ON chat_channel_members FOR DELETE USING (false);

-- ---------- chat_messages ----------
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- DM privado: SOLO miembros leen contenido. Grupo: miembros + admin/pastor (moderación).
CREATE POLICY cm_select ON chat_messages FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND (
    is_channel_member(channel_id)
    OR EXISTS (SELECT 1 FROM chat_channels c
               WHERE c.id = channel_id AND c.room_type <> 'dm'
                 AND user_role_in_church(c.church_id) IN ('admin','pastor'))
  )
);
-- Envío/edición/borrado SOLO por RPC (parseo de menciones, nonce, notificaciones).
CREATE POLICY cm_no_insert ON chat_messages FOR INSERT WITH CHECK (false);
CREATE POLICY cm_no_update ON chat_messages FOR UPDATE USING (false);
CREATE POLICY cm_no_delete ON chat_messages FOR DELETE USING (false);

-- ---------- chat_attachments ----------
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ca_select ON chat_attachments FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND EXISTS (
    SELECT 1 FROM chat_messages m
    WHERE m.id = chat_attachments.message_id AND (
      is_channel_member(m.channel_id)
      OR EXISTS (SELECT 1 FROM chat_channels c
                 WHERE c.id = m.channel_id AND c.room_type <> 'dm'
                   AND user_role_in_church(c.church_id) IN ('admin','pastor'))
    )
  )
);
CREATE POLICY ca_no_insert ON chat_attachments FOR INSERT WITH CHECK (false);
CREATE POLICY ca_no_update ON chat_attachments FOR UPDATE USING (false);
CREATE POLICY ca_no_delete ON chat_attachments FOR DELETE USING (false);

-- ---------- chat_message_mentions ----------
ALTER TABLE chat_message_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cmm_select ON chat_message_mentions FOR SELECT USING (
  church_id = ANY (user_church_ids()) AND EXISTS (
    SELECT 1 FROM chat_messages m
    WHERE m.id = chat_message_mentions.message_id AND (
      is_channel_member(m.channel_id)
      OR EXISTS (SELECT 1 FROM chat_channels c
                 WHERE c.id = m.channel_id AND c.room_type <> 'dm'
                   AND user_role_in_church(c.church_id) IN ('admin','pastor'))
    )
  )
);
CREATE POLICY cmm_no_insert ON chat_message_mentions FOR INSERT WITH CHECK (false);
CREATE POLICY cmm_no_update ON chat_message_mentions FOR UPDATE USING (false);
CREATE POLICY cmm_no_delete ON chat_message_mentions FOR DELETE USING (false);

-- ============================ Notifications RLS ============================

-- ---------- service_notifications ----------
ALTER TABLE service_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY sn_select ON service_notifications FOR SELECT USING (
  recipient_user_id = auth.uid() AND church_id = ANY (user_church_ids())
);
-- Insert SOLO via _emit_notification(); mark-read via rpc_notification_mark_read.
CREATE POLICY sn_no_insert ON service_notifications FOR INSERT WITH CHECK (false);
CREATE POLICY sn_no_update ON service_notifications FOR UPDATE USING (false);
CREATE POLICY sn_no_delete ON service_notifications FOR DELETE USING (false);

-- ---------- service_notification_deliveries (sin acceso de cliente) ----------
ALTER TABLE service_notification_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY snd_no_access ON service_notification_deliveries FOR ALL USING (false) WITH CHECK (false);

-- ---------- service_notification_prefs (el usuario gestiona las suyas) ----------
ALTER TABLE service_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY snp_select ON service_notification_prefs FOR SELECT
  USING (user_id = auth.uid() AND church_id = ANY (user_church_ids()));
CREATE POLICY snp_insert ON service_notification_prefs FOR INSERT
  WITH CHECK (user_id = auth.uid() AND church_id = ANY (user_church_ids()));
CREATE POLICY snp_update ON service_notification_prefs FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY snp_delete ON service_notification_prefs FOR DELETE
  USING (user_id = auth.uid());
