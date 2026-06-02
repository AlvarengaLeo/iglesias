-- Fix: eb_convert_lead debe poblar funds.code (NOT NULL). CREATE OR REPLACE.
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
  RETURNING id INTO v_church_id;

  INSERT INTO funds (church_id, name, code, is_default, is_active) VALUES
    (v_church_id, 'Fondo General',     'GEN', true,  true),
    (v_church_id, 'Misiones',          'MIS', false, true),
    (v_church_id, 'Construcción',      'CON', false, true),
    (v_church_id, 'Ayuda Comunitaria', 'AYU', false, true);

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
