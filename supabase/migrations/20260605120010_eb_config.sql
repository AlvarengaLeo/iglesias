-- =====================================================================
-- EB CONNECT · Backoffice — Fase 7: Configuración
--   feature flags · settings · staff mgmt · planes · auditoría · partners(stub)
-- =====================================================================

-- ---------- Feature flags (globales + override por iglesia) ----------
CREATE TABLE IF NOT EXISTS eb_feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS eb_church_feature_overrides (
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  key         TEXT NOT NULL REFERENCES eb_feature_flags(key) ON DELETE CASCADE,
  enabled     BOOLEAN NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, key)
);

INSERT INTO eb_feature_flags (key, enabled, description) VALUES
  ('enable_online_donations',       true,  'Donaciones en línea en el portal público'),
  ('enable_stripe_connect',         false, 'Stripe Connect para depósitos directos a la iglesia'),
  ('enable_receipt_email',          true,  'Envío de recibos por email'),
  ('enable_server_pdf',             false, 'Generación de PDF en el servidor'),
  ('enable_annual_statements',      true,  'Estados de cuenta anuales'),
  ('enable_public_donation_intents',true,  'Intenciones de donación desde el portal'),
  ('enable_church_assets',          true,  'Biblioteca de archivos por iglesia'),
  ('enable_partner_commissions',    false, 'Programa de partners y comisiones'),
  ('enable_eb_stripe_billing',      false, 'Cobro automático de suscripciones vía Stripe (requiere cuenta bancaria)')
ON CONFLICT (key) DO NOTHING;

-- ---------- Settings de la empresa (singleton) ----------
CREATE TABLE IF NOT EXISTS eb_settings (
  id            BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  company_name  TEXT NOT NULL DEFAULT 'EB Connect',
  support_email TEXT,
  website       TEXT,
  terms_url     TEXT,
  data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO eb_settings (id, company_name, support_email, website)
VALUES (true, 'EB Connect', 'soporte@ebconnect.com', 'https://ebconnect.com')
ON CONFLICT (id) DO NOTHING;

-- ---------- Partners / comisiones (schema-ready; UI diferida) ----------
CREATE TABLE IF NOT EXISTS eb_partner_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  company_name          TEXT,
  email                 TEXT,
  phone                 TEXT,
  commission_model      TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_model IN ('percentage','flat')),
  commission_percentage NUMERIC(5,2),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS eb_partner_commissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES eb_partner_accounts(id) ON DELETE CASCADE,
  church_id             UUID REFERENCES churches(id) ON DELETE SET NULL,
  subscription_id       UUID REFERENCES eb_subscriptions(id) ON DELETE SET NULL,
  payment_id            UUID REFERENCES eb_subscription_payments(id) ON DELETE SET NULL,
  commission_amount_cents INT NOT NULL DEFAULT 0,
  commission_percentage NUMERIC(5,2),
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','earned','paid')),
  earned_at             TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- RLS ----------
ALTER TABLE eb_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_church_feature_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_partner_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY eb_flags_select ON eb_feature_flags FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_flags_write  ON eb_feature_flags FOR ALL USING (eb_staff_role() IN ('super_admin','tech')) WITH CHECK (eb_staff_role() IN ('super_admin','tech'));
CREATE POLICY eb_flag_ovr_select ON eb_church_feature_overrides FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_flag_ovr_write  ON eb_church_feature_overrides FOR ALL USING (eb_staff_role() IN ('super_admin','tech')) WITH CHECK (eb_staff_role() IN ('super_admin','tech'));
CREATE POLICY eb_settings_select ON eb_settings FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_settings_write  ON eb_settings FOR ALL USING (eb_staff_role() = 'super_admin') WITH CHECK (eb_staff_role() = 'super_admin');
CREATE POLICY eb_partners_select ON eb_partner_accounts FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_partners_write  ON eb_partner_accounts FOR ALL USING (eb_staff_role() = 'super_admin') WITH CHECK (eb_staff_role() = 'super_admin');
CREATE POLICY eb_pcomm_select ON eb_partner_commissions FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_pcomm_write  ON eb_partner_commissions FOR ALL USING (eb_staff_role() = 'super_admin') WITH CHECK (eb_staff_role() = 'super_admin');

-- ---------- RPCs ----------
-- Auditoría (viewer filtrable)
CREATE OR REPLACE FUNCTION eb_list_audit(p_search TEXT DEFAULT NULL, p_action TEXT DEFAULT NULL, p_limit INT DEFAULT 100)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF eb_staff_role() NOT IN ('super_admin','tech') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb) INTO v FROM (
    SELECT a.id, a.actor_name, a.eb_role, a.action, a.entity_type, a.church_id, c.public_name AS church_name,
           a.metadata, a.created_at
    FROM eb_audit_logs a LEFT JOIN churches c ON c.id = a.church_id
    WHERE (p_action IS NULL OR a.action = p_action)
      AND (p_search IS NULL OR a.action ILIKE '%'||p_search||'%' OR a.actor_name ILIKE '%'||p_search||'%' OR c.public_name ILIKE '%'||p_search||'%')
    ORDER BY a.created_at DESC LIMIT GREATEST(1, LEAST(p_limit, 300))
  ) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_list_audit(TEXT, TEXT, INT) TO authenticated;

-- Feature flags
CREATE OR REPLACE FUNCTION eb_list_flags()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.key), '[]'::jsonb) INTO v
  FROM (SELECT key, enabled, description FROM eb_feature_flags) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_list_flags() TO authenticated;

CREATE OR REPLACE FUNCTION eb_set_flag(p_key TEXT, p_enabled BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF eb_staff_role() NOT IN ('super_admin','tech') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE eb_feature_flags SET enabled = p_enabled, updated_at = now() WHERE key = p_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'flag not found'; END IF;
  PERFORM eb_log('flag.set', 'eb_feature_flag', NULL, NULL, jsonb_build_object('key', p_key, 'enabled', p_enabled));
  RETURN eb_list_flags();
END $$;
GRANT EXECUTE ON FUNCTION eb_set_flag(TEXT, BOOLEAN) TO authenticated;

-- Staff interno
CREATE OR REPLACE FUNCTION eb_list_staff()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at), '[]'::jsonb) INTO v
  FROM (SELECT user_id, full_name, email_snapshot AS email, role, is_active, last_seen_at, created_at FROM eb_users) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_list_staff() TO authenticated;

CREATE OR REPLACE FUNCTION eb_set_staff_role(p_user_id UUID, p_role TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF eb_staff_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_role NOT IN ('super_admin','sales','support','billing','tech','viewer') THEN RAISE EXCEPTION 'invalid role'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'no puedes cambiar tu propio rol'; END IF;
  UPDATE eb_users SET role = p_role, updated_at = now() WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff not found'; END IF;
  PERFORM eb_log('staff.role', 'eb_user', NULL, NULL, jsonb_build_object('user_id', p_user_id, 'role', p_role));
  RETURN eb_list_staff();
END $$;
GRANT EXECUTE ON FUNCTION eb_set_staff_role(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION eb_set_staff_active(p_user_id UUID, p_active BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF eb_staff_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'no puedes desactivarte a ti mismo'; END IF;
  UPDATE eb_users SET is_active = p_active, updated_at = now() WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff not found'; END IF;
  PERFORM eb_log('staff.active', 'eb_user', NULL, NULL, jsonb_build_object('user_id', p_user_id, 'active', p_active));
  RETURN eb_list_staff();
END $$;
GRANT EXECUTE ON FUNCTION eb_set_staff_active(UUID, BOOLEAN) TO authenticated;

-- Planes
CREATE OR REPLACE FUNCTION eb_list_plans()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.sort_order), '[]'::jsonb) INTO v
  FROM (SELECT id, code, name, description, monthly_price_cents, annual_price_cents, currency, is_active, sort_order FROM eb_plans) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_list_plans() TO authenticated;

CREATE OR REPLACE FUNCTION eb_update_plan(p_id UUID, p_name TEXT, p_monthly_price_cents INT, p_is_active BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF eb_staff_role() NOT IN ('super_admin','tech') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_monthly_price_cents < 0 THEN RAISE EXCEPTION 'invalid price'; END IF;
  UPDATE eb_plans SET name = COALESCE(NULLIF(btrim(p_name),''), name),
    monthly_price_cents = p_monthly_price_cents, is_active = p_is_active, updated_at = now()
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan not found'; END IF;
  PERFORM eb_log('plan.update', 'eb_plan', p_id, NULL, jsonb_build_object('monthly_price_cents', p_monthly_price_cents, 'is_active', p_is_active));
  RETURN eb_list_plans();
END $$;
GRANT EXECUTE ON FUNCTION eb_update_plan(UUID, TEXT, INT, BOOLEAN) TO authenticated;

-- Settings
CREATE OR REPLACE FUNCTION eb_get_settings()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT row_to_json(t) INTO v FROM (SELECT company_name, support_email, website, terms_url, data, updated_at FROM eb_settings WHERE id) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_get_settings() TO authenticated;

CREATE OR REPLACE FUNCTION eb_update_settings(p_company_name TEXT, p_support_email TEXT, p_website TEXT, p_terms_url TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF eb_staff_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  UPDATE eb_settings SET
    company_name = COALESCE(NULLIF(btrim(p_company_name),''), company_name),
    support_email = p_support_email, website = p_website, terms_url = p_terms_url, updated_at = now()
  WHERE id;
  PERFORM eb_log('settings.update', 'eb_settings', NULL, NULL, jsonb_build_object('company_name', p_company_name));
  RETURN eb_get_settings();
END $$;
GRANT EXECUTE ON FUNCTION eb_update_settings(TEXT, TEXT, TEXT, TEXT) TO authenticated;
