-- Fix: idempotency branch ordered by a non-existent column (church_invitations
-- has no created_at). Drop the ORDER BY (one admin invite per church at
-- provision time anyway). CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION eb_provision_subscribed_church(
  p_public_name TEXT, p_admin_email TEXT, p_plan_code TEXT,
  p_provider_customer_id TEXT, p_provider_subscription_id TEXT, p_status TEXT,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL, p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_admin_full_name TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing eb_subscriptions%ROWTYPE;
  v_plan eb_plans%ROWTYPE;
  v_church_id UUID; v_sub_id UUID; v_token UUID;
  v_base TEXT; v_slug CITEXT; v_n INT := 1; v_plan_status TEXT;
BEGIN
  SELECT * INTO v_existing FROM eb_subscriptions WHERE provider_subscription_id = p_provider_subscription_id;
  IF v_existing.id IS NOT NULL THEN
    SELECT token INTO v_token FROM church_invitations
      WHERE church_id = v_existing.church_id AND role = 'admin' LIMIT 1;
    RETURN jsonb_build_object('church_id', v_existing.church_id, 'subscription_id', v_existing.id,
      'invitation_token', v_token, 'admin_email', lower(p_admin_email), 'already', true);
  END IF;

  SELECT * INTO v_plan FROM eb_plans WHERE code = p_plan_code AND is_active;
  IF v_plan.id IS NULL THEN RAISE EXCEPTION 'plan not found: %', p_plan_code; END IF;

  v_base := trim(both '-' from regexp_replace(lower(trim(p_public_name)), '[^a-z0-9]+', '-', 'g'));
  IF v_base = '' THEN v_base := 'church'; END IF;
  v_slug := v_base::citext;
  WHILE EXISTS (SELECT 1 FROM churches WHERE slug = v_slug) LOOP
    v_n := v_n + 1; v_slug := (v_base || '-' || v_n)::citext;
  END LOOP;

  v_plan_status := CASE WHEN p_status IN ('active','past_due','canceled','trialing') THEN p_status ELSE 'trialing' END;

  INSERT INTO churches (legal_name, public_name, slug, email, plan, plan_status)
  VALUES (p_public_name, p_public_name, v_slug, lower(p_admin_email), 'ministerio', v_plan_status)
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

  INSERT INTO eb_subscriptions (church_id, plan_id, status, monthly_price_cents, currency,
      payment_provider, provider_customer_id, provider_subscription_id,
      trial_starts_at, trial_ends_at, current_period_ends_at)
  VALUES (v_church_id, v_plan.id, p_status, v_plan.monthly_price_cents, v_plan.currency,
      'stripe', p_provider_customer_id, p_provider_subscription_id,
      now(), p_trial_ends_at, p_current_period_end)
  RETURNING id INTO v_sub_id;

  INSERT INTO church_invitations (church_id, email, role, invited_by)
  VALUES (v_church_id, lower(p_admin_email), 'admin', NULL)
  RETURNING token INTO v_token;

  PERFORM eb_log('subscription.provision', 'eb_subscription', v_sub_id, v_church_id,
    jsonb_build_object('slug', v_slug, 'admin_email', lower(p_admin_email),
      'provider_subscription_id', p_provider_subscription_id, 'status', p_status));

  RETURN jsonb_build_object('church_id', v_church_id, 'subscription_id', v_sub_id,
    'invitation_token', v_token, 'admin_email', lower(p_admin_email), 'already', false);
END $$;
REVOKE EXECUTE ON FUNCTION eb_provision_subscribed_church(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION eb_provision_subscribed_church(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,TEXT) TO service_role;
