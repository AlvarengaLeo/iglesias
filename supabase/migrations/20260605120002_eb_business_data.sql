-- =====================================================================
-- EB CONNECT · Backoffice — Fase 2/3 (datos del negocio): leads, planes,
-- suscripciones, pagos, onboarding + submit/convert de leads.
-- =====================================================================

-- ---------- Planes ----------
CREATE TABLE IF NOT EXISTS eb_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  monthly_price_cents BIGINT NOT NULL DEFAULT 0,
  annual_price_cents  BIGINT,
  currency      TEXT NOT NULL DEFAULT 'USD',
  features      JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO eb_plans (code, name, description, monthly_price_cents, sort_order)
VALUES ('ministry', 'Plan Ministerio', 'Plan inicial de EB Connect', 2500, 1)
ON CONFLICT (code) DO NOTHING;

-- ---------- Leads ----------
CREATE TABLE IF NOT EXISTS eb_leads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_name   TEXT NOT NULL,
  contact_name  TEXT,
  contact_role  TEXT,
  email         CITEXT,
  phone         TEXT,
  city          TEXT,
  state         TEXT,
  country       TEXT,
  estimated_size TEXT,
  source        TEXT,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','contacted','demo_scheduled','demo_completed','trial_created','converted','lost','not_qualified')),
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  converted_church_id UUID REFERENCES churches(id) ON DELETE SET NULL,
  lost_reason   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_eb_leads_status ON eb_leads (status, created_at DESC);

CREATE TABLE IF NOT EXISTS eb_lead_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID NOT NULL REFERENCES eb_leads(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name   TEXT,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eb_lead_notes_lead ON eb_lead_notes (lead_id, created_at DESC);

-- ---------- Suscripciones + pagos ----------
CREATE TABLE IF NOT EXISTS eb_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  plan_id       UUID REFERENCES eb_plans(id),
  status        TEXT NOT NULL DEFAULT 'trialing'
                CHECK (status IN ('trialing','active','past_due','canceled','paused','incomplete')),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  monthly_price_cents BIGINT NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  trial_starts_at TIMESTAMPTZ,
  trial_ends_at   TIMESTAMPTZ,
  current_period_starts_at TIMESTAMPTZ,
  current_period_ends_at   TIMESTAMPTZ,
  canceled_at   TIMESTAMPTZ,
  cancel_reason TEXT,
  payment_provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- una sola suscripción "viva" por iglesia
CREATE UNIQUE INDEX IF NOT EXISTS idx_eb_sub_live_per_church
  ON eb_subscriptions (church_id) WHERE status IN ('trialing','active','past_due','paused');

CREATE TABLE IF NOT EXISTS eb_subscription_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES eb_subscriptions(id) ON DELETE CASCADE,
  church_id     UUID REFERENCES churches(id) ON DELETE CASCADE,
  amount_cents  BIGINT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending','failed','refunded','disputed')),
  payment_method TEXT,
  provider_payment_id TEXT,
  provider_invoice_id TEXT,
  paid_at       TIMESTAMPTZ,
  failed_at     TIMESTAMPTZ,
  failure_reason TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eb_pay_church ON eb_subscription_payments (church_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eb_pay_status ON eb_subscription_payments (status, created_at DESC);

-- ---------- Onboarding ----------
CREATE TABLE IF NOT EXISTS eb_onboarding_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  task_key      TEXT NOT NULL,
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','blocked','done')),
  completed_at  TIMESTAMPTZ,
  completed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_auto       BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (church_id, task_key)
);

-- ---------- updated_at triggers ----------
CREATE TRIGGER trg_eb_plans_updated_at BEFORE UPDATE ON eb_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_eb_leads_updated_at BEFORE UPDATE ON eb_leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_eb_subs_updated_at BEFORE UPDATE ON eb_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_eb_onb_updated_at BEFORE UPDATE ON eb_onboarding_tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS ----------
ALTER TABLE eb_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_onboarding_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY eb_plans_select ON eb_plans FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_plans_write ON eb_plans FOR ALL
  USING (eb_staff_role() IN ('super_admin','tech')) WITH CHECK (eb_staff_role() IN ('super_admin','tech'));

CREATE POLICY eb_leads_select ON eb_leads FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_leads_write ON eb_leads FOR ALL
  USING (eb_staff_role() IN ('super_admin','sales')) WITH CHECK (eb_staff_role() IN ('super_admin','sales'));

CREATE POLICY eb_lead_notes_select ON eb_lead_notes FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_lead_notes_insert ON eb_lead_notes FOR INSERT WITH CHECK (eb_is_staff() AND author_user_id = auth.uid());

CREATE POLICY eb_subs_select ON eb_subscriptions FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_subs_write ON eb_subscriptions FOR ALL
  USING (eb_staff_role() IN ('super_admin','billing')) WITH CHECK (eb_staff_role() IN ('super_admin','billing'));

CREATE POLICY eb_pay_select ON eb_subscription_payments FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_pay_write ON eb_subscription_payments FOR ALL
  USING (eb_staff_role() IN ('super_admin','billing')) WITH CHECK (eb_staff_role() IN ('super_admin','billing'));

CREATE POLICY eb_onb_select ON eb_onboarding_tasks FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_onb_write ON eb_onboarding_tasks FOR ALL
  USING (eb_staff_role() IN ('super_admin','support')) WITH CHECK (eb_staff_role() IN ('super_admin','support'));

-- ---------- Public lead intake (sitio comercial) ----------
CREATE OR REPLACE FUNCTION eb_submit_lead(
  p_church_name TEXT, p_contact_name TEXT, p_email TEXT,
  p_phone TEXT DEFAULT NULL, p_message TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'website', p_city TEXT DEFAULT NULL, p_estimated_size TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF p_church_name IS NULL OR length(btrim(p_church_name)) = 0 THEN RAISE EXCEPTION 'church_name required'; END IF;
  IF p_email IS NULL OR p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'valid email required'; END IF;
  IF EXISTS (SELECT 1 FROM eb_leads WHERE email = lower(p_email) AND created_at > now() - interval '5 minutes') THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  INSERT INTO eb_leads (church_name, contact_name, email, phone, message, source, city, estimated_size, status)
  VALUES (btrim(p_church_name), p_contact_name, lower(p_email), p_phone, p_message, COALESCE(p_source,'website'), p_city, p_estimated_size, 'new')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('ok', true, 'lead_id', v_id);
END $$;
GRANT EXECUTE ON FUNCTION eb_submit_lead(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;

-- ---------- Conversión Lead → Iglesia (atómica) ----------
CREATE OR REPLACE FUNCTION eb_convert_lead(
  p_lead_id UUID, p_legal_name TEXT, p_public_name TEXT, p_slug TEXT,
  p_admin_email TEXT, p_admin_full_name TEXT DEFAULT NULL, p_plan_code TEXT DEFAULT 'ministry')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT; v_church_id UUID; v_plan eb_plans%ROWTYPE; v_sub_id UUID; v_token UUID; v_lead eb_leads%ROWTYPE; v_slug CITEXT;
BEGIN
  v_role := eb_staff_role();
  IF v_role NOT IN ('super_admin','sales') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  v_slug := lower(btrim(p_slug));
  SELECT * INTO v_lead FROM eb_leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'lead not found'; END IF;
  IF v_lead.converted_church_id IS NOT NULL THEN RAISE EXCEPTION 'lead already converted'; END IF;
  IF EXISTS (SELECT 1 FROM churches WHERE slug = v_slug) THEN RAISE EXCEPTION 'slug already in use'; END IF;
  SELECT * INTO v_plan FROM eb_plans WHERE code = p_plan_code AND is_active;
  IF v_plan.id IS NULL THEN RAISE EXCEPTION 'plan not found: %', p_plan_code; END IF;

  INSERT INTO churches (legal_name, public_name, slug, email, plan, plan_status)
  VALUES (p_legal_name, p_public_name, v_slug, lower(p_admin_email), 'ministerio', 'trialing')
  RETURNING id INTO v_church_id;  -- trigger ensure_portal_settings crea portal_settings

  INSERT INTO funds (church_id, name, is_default, is_active) VALUES
    (v_church_id, 'Fondo General', true, true),
    (v_church_id, 'Misiones', false, true),
    (v_church_id, 'Construcción', false, true),
    (v_church_id, 'Ayuda Comunitaria', false, true);

  INSERT INTO eb_onboarding_tasks (church_id, task_key, title, status, is_auto, display_order) VALUES
    (v_church_id, 'church_created',             'Iglesia creada',                 'done',    true,  1),
    (v_church_id, 'admin_invited',              'Administrador invitado',         'done',    true,  2),
    (v_church_id, 'admin_accepted',             'Admin aceptó invitación',        'pending', true,  3),
    (v_church_id, 'basic_info_completed',       'Datos básicos completados',      'pending', false, 4),
    (v_church_id, 'logo_uploaded',              'Logo cargado',                   'pending', true,  5),
    (v_church_id, 'funds_created',              'Fondos iniciales creados',       'done',    true,  6),
    (v_church_id, 'first_campaign_created',     'Primera campaña creada',         'pending', true,  7),
    (v_church_id, 'receipt_settings_completed', 'Configuración de recibos',       'pending', false, 8),
    (v_church_id, 'portal_published',           'Portal publicado',               'pending', true,  9),
    (v_church_id, 'subscription_active',        'Suscripción activa',             'pending', true, 10),
    (v_church_id, 'training_completed',         'Capacitación realizada',         'pending', false,11);

  INSERT INTO eb_subscriptions (church_id, plan_id, status, monthly_price_cents, currency, trial_starts_at, trial_ends_at)
  VALUES (v_church_id, v_plan.id, 'trialing', v_plan.monthly_price_cents, v_plan.currency, now(), now() + interval '14 days')
  RETURNING id INTO v_sub_id;

  INSERT INTO church_invitations (church_id, email, role, invited_by)
  VALUES (v_church_id, lower(p_admin_email), 'admin', auth.uid())
  RETURNING token INTO v_token;

  UPDATE eb_leads SET status = 'converted', converted_church_id = v_church_id, converted_at = now() WHERE id = p_lead_id;

  PERFORM eb_log('lead.convert', 'eb_lead', p_lead_id, v_church_id,
    jsonb_build_object('slug', v_slug, 'admin_email', lower(p_admin_email), 'subscription_id', v_sub_id));

  RETURN jsonb_build_object('church_id', v_church_id, 'subscription_id', v_sub_id,
    'invitation_token', v_token, 'admin_email', lower(p_admin_email), 'admin_full_name', p_admin_full_name);
END $$;
GRANT EXECUTE ON FUNCTION eb_convert_lead(UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- ---------- Lectura de leads/onboarding para el Backoffice ----------
CREATE OR REPLACE FUNCTION eb_list_leads(p_status TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL, p_limit INT DEFAULT 50)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v FROM (
    SELECT l.id, l.church_name, l.contact_name, l.email, l.phone, l.city, l.estimated_size,
           l.source, l.message, l.status, l.assigned_to_user_id, l.converted_church_id,
           l.created_at, l.converted_at,
           (SELECT COUNT(*) FROM eb_lead_notes n WHERE n.lead_id = l.id) AS note_count
    FROM eb_leads l
    WHERE (p_status IS NULL OR l.status = p_status)
      AND (p_search IS NULL OR l.church_name ILIKE '%'||p_search||'%' OR l.email::text ILIKE '%'||p_search||'%' OR l.contact_name ILIKE '%'||p_search||'%')
    ORDER BY l.created_at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 200))
  ) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_list_leads(TEXT,TEXT,INT) TO authenticated;
