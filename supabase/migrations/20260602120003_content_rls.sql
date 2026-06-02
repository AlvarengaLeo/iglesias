-- =====================================================================
-- FASE 15 · 03 — Content RLS policies
-- =====================================================================
-- Patrón (mirror EXACTO de campaigns_select / campaigns_write):
--   SELECT: cualquier miembro activo de la iglesia.
--   ALL (INSERT/UPDATE/DELETE): solo admin/pastor/secretary (editores de
--     contenido; treasurer es solo finanzas).
--   Sin policy anon: TODA lectura pública pasa por los RPCs SECURITY DEFINER
--     (rpc_public_*) que validan publish_status='published' + is_visible_on_portal.
--   El borrado real es SOFT (deleted_at) desde la API — igual que campaigns.
--   (No se agrega _no_delete: junto a un FOR ALL las policies permisivas se
--    combinan con OR y lo haría inefectivo; campaigns tampoco lo tiene.)

-- ========== sermons ==========
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;

CREATE POLICY sermons_select ON sermons FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY sermons_write ON sermons FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

-- ========== events ==========
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_select ON events FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY events_write ON events FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

-- ========== podcast_episodes ==========
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY podcast_select ON podcast_episodes FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY podcast_write ON podcast_episodes FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );

-- ========== projects ==========
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select ON projects FOR SELECT
  USING (church_id = ANY (user_church_ids()));

CREATE POLICY projects_write ON projects FOR ALL
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','secretary')
  );
