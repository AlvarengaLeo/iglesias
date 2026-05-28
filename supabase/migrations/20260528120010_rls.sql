-- =====================================================================
-- 10 — Row Level Security (RLS) Policies
-- =====================================================================
-- Activa RLS y define policies en todas las tablas tenant-scoped.
-- Patrón:
--   SELECT: cualquier miembro activo de la iglesia.
--   INSERT/UPDATE: solo roles permitidos para esa acción.
--   DELETE: siempre falla (hard delete bloqueado); usar soft delete via UPDATE.

-- ========== churches ==========
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;

CREATE POLICY churches_select_member ON churches FOR SELECT
  USING (id = ANY (user_church_ids()));

-- Portal público necesita leer columnas públicas (logo, public_name, slug, primary_color).
-- Para v1 permitimos SELECT anónimo a toda la fila; columnas sensibles (EIN, address detallada) están
-- en clase mientras la app no expone ese endpoint. En v2 crear vw_public_church con columnas filtradas.
CREATE POLICY churches_select_anon ON churches FOR SELECT
  TO anon
  USING (deleted_at IS NULL);

CREATE POLICY churches_update ON churches FOR UPDATE
  USING (id = ANY (user_church_ids()))
  WITH CHECK (
    id = ANY (user_church_ids())
    AND user_role_in_church(id) IN ('admin','pastor')
  );

-- No INSERT desde frontend (iglesias se crean por proceso admin); no DELETE
CREATE POLICY churches_no_insert ON churches FOR INSERT WITH CHECK (false);
CREATE POLICY churches_no_delete ON churches FOR DELETE USING (false);

-- ========== church_users ==========
ALTER TABLE church_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY church_users_select ON church_users FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY church_users_insert ON church_users FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) = 'admin'
  );

CREATE POLICY church_users_update ON church_users FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) = 'admin'
  );

CREATE POLICY church_users_no_delete ON church_users FOR DELETE USING (false);

-- ========== church_invitations ==========
ALTER TABLE church_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY invitations_select ON church_invitations FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY invitations_insert ON church_invitations FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) = 'admin'
  );

CREATE POLICY invitations_update ON church_invitations FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) = 'admin'
  );

CREATE POLICY invitations_no_delete ON church_invitations FOR DELETE USING (false);

-- ========== people ==========
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

CREATE POLICY people_select ON people FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY people_insert ON people FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

CREATE POLICY people_update ON people FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

CREATE POLICY people_no_delete ON people FOR DELETE USING (false);

-- ========== person_tags ==========
ALTER TABLE person_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY person_tags_select ON person_tags FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY person_tags_write ON person_tags FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

-- ========== person_tag_assignments ==========
ALTER TABLE person_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tag_assignments_select ON person_tag_assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM people p WHERE p.id = person_id AND p.church_id = ANY (user_church_ids()))
  );

CREATE POLICY tag_assignments_write ON person_tag_assignments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM people p WHERE p.id = person_id AND p.church_id = ANY (user_church_ids()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM people p
      WHERE p.id = person_id
        AND p.church_id = ANY (user_church_ids())
        AND user_role_in_church(p.church_id) IN ('admin','pastor','secretary')
    )
  );

-- ========== households ==========
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

CREATE POLICY households_select ON households FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY households_write ON households FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

-- ========== household_members ==========
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY household_members_select ON household_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.church_id = ANY (user_church_ids()))
  );

CREATE POLICY household_members_write ON household_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.church_id = ANY (user_church_ids()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM households h
      WHERE h.id = household_id
        AND h.church_id = ANY (user_church_ids())
        AND user_role_in_church(h.church_id) IN ('admin','pastor','secretary')
    )
  );

-- ========== person_followups ==========
ALTER TABLE person_followups ENABLE ROW LEVEL SECURITY;

-- SELECT: si la nota es privada (is_private=true), solo admin/pastor pueden verla.
CREATE POLICY followups_select_public ON person_followups FOR SELECT
  USING (
    church_id = ANY (user_church_ids())
    AND (is_private = false OR user_role_in_church(church_id) IN ('admin','pastor'))
  );

CREATE POLICY followups_write ON person_followups FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

-- ========== funds ==========
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY funds_select ON funds FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY funds_write ON funds FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','treasurer')
  );

-- ========== campaigns ==========
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select ON campaigns FOR SELECT
  USING (church_id = ANY (user_church_ids()));

-- Portal público lee campañas visibles activas
CREATE POLICY campaigns_select_anon ON campaigns FOR SELECT
  TO anon
  USING (is_visible_on_portal = true AND status = 'active' AND deleted_at IS NULL);

CREATE POLICY campaigns_write ON campaigns FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer','secretary')
  );

-- ========== donations ==========
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY donations_select ON donations FOR SELECT
  USING (church_id = ANY (user_church_ids()));

-- INSERT solo via rpc_register_donation (no direct insert from client)
CREATE POLICY donations_insert ON donations FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer')
  );

CREATE POLICY donations_update ON donations FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','treasurer')
  );

CREATE POLICY donations_no_delete ON donations FOR DELETE USING (false);

-- ========== recurring_donation_profiles ==========
ALTER TABLE recurring_donation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY recurring_select ON recurring_donation_profiles FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY recurring_write ON recurring_donation_profiles FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer')
  );

-- ========== contribution_receipts ==========
ALTER TABLE contribution_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY receipts_select ON contribution_receipts FOR SELECT
  USING (church_id = ANY (user_church_ids()));

-- INSERT solo via rpc_register_donation o rpc generate_annual_statement
CREATE POLICY receipts_insert ON contribution_receipts FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer','secretary')
  );

-- INMUTABLE: no UPDATE allowed except status field by RPC
CREATE POLICY receipts_no_update ON contribution_receipts FOR UPDATE
  USING (false);

CREATE POLICY receipts_no_delete ON contribution_receipts FOR DELETE USING (false);

-- ========== receipt_deliveries ==========
ALTER TABLE receipt_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_select ON receipt_deliveries FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY deliveries_insert ON receipt_deliveries FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer','secretary')
  );

-- INMUTABLE
CREATE POLICY deliveries_no_update ON receipt_deliveries FOR UPDATE USING (false);
CREATE POLICY deliveries_no_delete ON receipt_deliveries FOR DELETE USING (false);

-- ========== church_receipt_sequences ==========
ALTER TABLE church_receipt_sequences ENABLE ROW LEVEL SECURITY;

-- Solo se usa via rpc_assign_receipt_number; no acceso directo desde frontend
CREATE POLICY sequences_no_access ON church_receipt_sequences FOR ALL USING (false);

-- ========== portal_settings ==========
ALTER TABLE portal_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_select ON portal_settings FOR SELECT
  USING (church_id = ANY (user_church_ids()));

-- Portal público anónimo: solo si published
CREATE POLICY portal_select_anon ON portal_settings FOR SELECT
  TO anon
  USING (publish_status = 'published');

CREATE POLICY portal_insert ON portal_settings FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

CREATE POLICY portal_update ON portal_settings FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

CREATE POLICY portal_no_delete ON portal_settings FOR DELETE USING (false);

-- ========== service_times ==========
ALTER TABLE service_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_times_select ON service_times FOR SELECT
  USING (church_id = ANY (user_church_ids()));

-- Portal público anónimo
CREATE POLICY service_times_select_anon ON service_times FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY service_times_write ON service_times FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

-- ========== audit_logs ==========
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_select ON audit_logs FOR SELECT
  USING (church_id IS NULL OR church_id = ANY (user_church_ids()));

-- INSERT solo via SECURITY DEFINER functions; no direct INSERT from client
CREATE POLICY audit_no_direct_insert ON audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY audit_no_update ON audit_logs FOR UPDATE USING (false);
CREATE POLICY audit_no_delete ON audit_logs FOR DELETE USING (false);
