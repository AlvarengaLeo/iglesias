-- =====================================================================
-- EB CONNECT · Backoffice — Fase 1: base (staff, helpers, RLS, auditoría)
-- =====================================================================
-- Capa interna de EB Connect montada SOBRE el esquema multi-tenant existente,
-- sin tocar el RLS por iglesia. Staff = auth.users con fila en eb_users.
-- Prefijo eb_ para todo lo de plataforma.

-- ---------- Staff interno ----------
CREATE TABLE IF NOT EXISTS eb_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_snapshot CITEXT,
  full_name     TEXT,
  role          TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('super_admin','sales','support','billing','tech','viewer')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  invited_by    UUID REFERENCES auth.users(id),
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE eb_users IS 'Staff interno de EB Connect (acceso al Backoffice). Separado de church_users.';

-- ---------- Helpers de staff (SECURITY DEFINER, sin recursión de RLS) ----------
CREATE OR REPLACE FUNCTION eb_is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM eb_users WHERE user_id = auth.uid() AND is_active = true);
$$;

CREATE OR REPLACE FUNCTION eb_staff_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM eb_users WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
$$;

-- ---------- Auditoría de plataforma (tabla propia; NO se mezcla con audit_logs) ----------
CREATE TABLE IF NOT EXISTS eb_audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name    TEXT,
  eb_role       TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  church_id     UUID REFERENCES churches(id) ON DELETE SET NULL,
  metadata      JSONB,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eb_audit_created ON eb_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eb_audit_church ON eb_audit_logs (church_id, created_at DESC);

CREATE OR REPLACE FUNCTION eb_log(
  p_action TEXT, p_entity_type TEXT DEFAULT NULL, p_entity_id UUID DEFAULT NULL,
  p_church_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT; v_role TEXT;
BEGIN
  SELECT full_name, role INTO v_name, v_role FROM eb_users WHERE user_id = auth.uid();
  INSERT INTO eb_audit_logs (actor_user_id, actor_name, eb_role, action, entity_type, entity_id, church_id, metadata)
  VALUES (auth.uid(), v_name, v_role, p_action, p_entity_type, p_entity_id, p_church_id, p_metadata);
END $$;

-- ---------- updated_at trigger (reusa set_updated_at existente) ----------
CREATE TRIGGER trg_eb_users_updated_at BEFORE UPDATE ON eb_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS ----------
ALTER TABLE eb_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_audit_logs ENABLE ROW LEVEL SECURITY;

-- eb_users: cualquier staff lee la lista; escritura solo vía RPC (super_admin).
CREATE POLICY eb_users_select ON eb_users FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_users_no_insert ON eb_users FOR INSERT WITH CHECK (false);
CREATE POLICY eb_users_no_update ON eb_users FOR UPDATE USING (false);
CREATE POLICY eb_users_no_delete ON eb_users FOR DELETE USING (false);

-- eb_audit_logs: staff lee; nadie escribe directo (solo eb_log SECURITY DEFINER).
CREATE POLICY eb_audit_select ON eb_audit_logs FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_audit_no_insert ON eb_audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY eb_audit_no_update ON eb_audit_logs FOR UPDATE USING (false);
CREATE POLICY eb_audit_no_delete ON eb_audit_logs FOR DELETE USING (false);

-- Lectura cross-tenant de churches para staff (ADITIVA al RLS por iglesia existente).
CREATE POLICY churches_select_eb_staff ON churches FOR SELECT USING (eb_is_staff());

-- ---------- RPCs del módulo Iglesias (agregados; sin PII de donantes) ----------
CREATE OR REPLACE FUNCTION eb_list_churches(
  p_search TEXT DEFAULT NULL, p_status TEXT DEFAULT NULL,
  p_limit INT DEFAULT 25, p_offset INT DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total INT; v_items JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COUNT(*) INTO v_total FROM churches c
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR c.plan_status = p_status)
      AND (p_search IS NULL OR c.public_name ILIKE '%'||p_search||'%'
           OR c.slug::text ILIKE '%'||p_search||'%' OR c.legal_name ILIKE '%'||p_search||'%');
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_items FROM (
    SELECT c.id, c.public_name, c.legal_name, c.slug, c.plan, c.plan_status, c.logo_url,
           c.locale, c.created_at,
           (SELECT ps.publish_status = 'published' FROM portal_settings ps WHERE ps.church_id = c.id) AS portal_published,
           (SELECT COUNT(*) FROM church_users cu WHERE cu.church_id = c.id AND cu.is_active) AS user_count
    FROM churches c
    WHERE c.deleted_at IS NULL
      AND (p_status IS NULL OR c.plan_status = p_status)
      AND (p_search IS NULL OR c.public_name ILIKE '%'||p_search||'%'
           OR c.slug::text ILIKE '%'||p_search||'%' OR c.legal_name ILIKE '%'||p_search||'%')
    ORDER BY c.created_at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 100)) OFFSET GREATEST(0, p_offset)
  ) t;
  RETURN jsonb_build_object('total', v_total, 'items', v_items);
END $$;
GRANT EXECUTE ON FUNCTION eb_list_churches(TEXT,TEXT,INT,INT) TO authenticated;

CREATE OR REPLACE FUNCTION eb_church_overview(p_church_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'church', (SELECT row_to_json(x) FROM (
        SELECT id, public_name, legal_name, slug, ein, email, phone, pastor_name, treasurer_name,
               plan, plan_status, locale, timezone, primary_color, logo_url, address, created_at, updated_at
        FROM churches WHERE id = p_church_id) x),
    'portal_published', (SELECT publish_status = 'published' FROM portal_settings WHERE church_id = p_church_id),
    'portal_status', (SELECT publish_status FROM portal_settings WHERE church_id = p_church_id),
    'user_count', (SELECT COUNT(*) FROM church_users WHERE church_id = p_church_id AND is_active),
    'donation_count', (SELECT COUNT(*) FROM donations WHERE church_id = p_church_id AND payment_status = 'paid' AND deleted_at IS NULL),
    'donation_total_cents', (SELECT COALESCE(SUM(amount_cents),0) FROM donations WHERE church_id = p_church_id AND payment_status = 'paid' AND deleted_at IS NULL),
    'active_campaigns', (SELECT COUNT(*) FROM campaigns WHERE church_id = p_church_id AND status = 'active' AND deleted_at IS NULL),
    'last_activity', (SELECT MAX(created_at) FROM audit_logs WHERE church_id = p_church_id)
  ) INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_church_overview(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION eb_church_users(p_church_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.joined_at), '[]'::jsonb) INTO v FROM (
    SELECT id, full_name, email_snapshot AS email, role, is_active, invited_at, joined_at, last_seen_at
    FROM church_users WHERE church_id = p_church_id
  ) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_church_users(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION eb_church_activity(p_church_id UUID, p_limit INT DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v FROM (
    SELECT id, action, entity_type, entity_id, actor_name, created_at
    FROM audit_logs WHERE church_id = p_church_id
    ORDER BY created_at DESC LIMIT GREATEST(1, LEAST(p_limit, 100))
  ) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_church_activity(UUID,INT) TO authenticated;
