-- =====================================================================
-- EB CONNECT — Stripe self-serve subscription billing (server-side only)
-- =====================================================================
-- Called ONLY by the eb-stripe-webhook Edge Function (service_role) after a
-- verified Stripe webhook. SECURITY DEFINER, idempotent, audited. NEVER granted
-- to anon/authenticated (a visitor must not be able to provision a church or
-- record a payment). Mirrors eb_convert_lead / eb_record_payment side-effects.

-- Fast lookup + idempotency guards.
CREATE UNIQUE INDEX IF NOT EXISTS idx_eb_sub_provider
  ON eb_subscriptions (provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_eb_pay_provider_invoice
  ON eb_subscription_payments (provider_invoice_id) WHERE provider_invoice_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Provision a church for a paid/trialing Stripe subscription (idempotent
-- on provider_subscription_id). Returns the invitation token so the webhook
-- can send the admin invite email.
-- ---------------------------------------------------------------------
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
  -- Idempotency: webhook retries / duplicate events.
  SELECT * INTO v_existing FROM eb_subscriptions WHERE provider_subscription_id = p_provider_subscription_id;
  IF v_existing.id IS NOT NULL THEN
    SELECT token INTO v_token FROM church_invitations
      WHERE church_id = v_existing.church_id AND role = 'admin' LIMIT 1;
    RETURN jsonb_build_object('church_id', v_existing.church_id, 'subscription_id', v_existing.id,
      'invitation_token', v_token, 'admin_email', lower(p_admin_email), 'already', true);
  END IF;

  SELECT * INTO v_plan FROM eb_plans WHERE code = p_plan_code AND is_active;
  IF v_plan.id IS NULL THEN RAISE EXCEPTION 'plan not found: %', p_plan_code; END IF;

  -- Slug from the church name, deduped.
  v_base := trim(both '-' from regexp_replace(lower(trim(p_public_name)), '[^a-z0-9]+', '-', 'g'));
  IF v_base = '' THEN v_base := 'church'; END IF;
  v_slug := v_base::citext;
  WHILE EXISTS (SELECT 1 FROM churches WHERE slug = v_slug) LOOP
    v_n := v_n + 1; v_slug := (v_base || '-' || v_n)::citext;
  END LOOP;

  v_plan_status := CASE WHEN p_status IN ('active','past_due','canceled','trialing') THEN p_status ELSE 'trialing' END;

  INSERT INTO churches (legal_name, public_name, slug, email, plan, plan_status)
  VALUES (p_public_name, p_public_name, v_slug, lower(p_admin_email), 'ministerio', v_plan_status)
  RETURNING id INTO v_church_id;  -- trigger ensure_portal_settings creates portal_settings

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

-- ---------------------------------------------------------------------
-- Sync subscription status/period from a Stripe webhook (status already
-- mapped to our enum by the Edge Function). No-op for unknown subs.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION eb_stripe_sync_subscription(
  p_provider_subscription_id TEXT, p_status TEXT,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL, p_cancel_at_period_end BOOLEAN DEFAULT FALSE)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub eb_subscriptions%ROWTYPE; v_plan_status TEXT;
BEGIN
  SELECT * INTO v_sub FROM eb_subscriptions WHERE provider_subscription_id = p_provider_subscription_id;
  IF v_sub.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unknown_subscription'); END IF;

  UPDATE eb_subscriptions SET
    status = p_status,
    current_period_ends_at = COALESCE(p_current_period_end, current_period_ends_at),
    canceled_at  = CASE WHEN p_status = 'canceled' THEN now() ELSE canceled_at END,
    cancel_reason = CASE WHEN p_cancel_at_period_end THEN 'cancel_at_period_end' ELSE cancel_reason END
    WHERE id = v_sub.id;

  v_plan_status := CASE WHEN p_status IN ('active','past_due','canceled','trialing') THEN p_status ELSE NULL END;
  IF v_plan_status IS NOT NULL THEN UPDATE churches SET plan_status = v_plan_status WHERE id = v_sub.church_id; END IF;

  PERFORM eb_log('subscription.stripe_sync', 'eb_subscription', v_sub.id, v_sub.church_id,
    jsonb_build_object('from', v_sub.status, 'to', p_status, 'cancel_at_period_end', p_cancel_at_period_end));
  RETURN jsonb_build_object('ok', true, 'subscription_id', v_sub.id, 'status', p_status);
END $$;
REVOKE EXECUTE ON FUNCTION eb_stripe_sync_subscription(TEXT,TEXT,TIMESTAMPTZ,BOOLEAN) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION eb_stripe_sync_subscription(TEXT,TEXT,TIMESTAMPTZ,BOOLEAN) TO service_role;

-- ---------------------------------------------------------------------
-- Record a Stripe invoice payment (idempotent on provider_invoice_id) and
-- activate the subscription on first paid charge after the trial.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION eb_stripe_record_payment(
  p_provider_subscription_id TEXT, p_amount_cents BIGINT, p_status TEXT,
  p_provider_payment_id TEXT, p_provider_invoice_id TEXT,
  p_paid_at TIMESTAMPTZ DEFAULT NULL, p_failure_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sub eb_subscriptions%ROWTYPE; v_pay_id UUID;
BEGIN
  SELECT * INTO v_sub FROM eb_subscriptions WHERE provider_subscription_id = p_provider_subscription_id;
  IF v_sub.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unknown_subscription'); END IF;

  IF p_provider_invoice_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM eb_subscription_payments WHERE provider_invoice_id = p_provider_invoice_id) THEN
    RETURN jsonb_build_object('ok', true, 'duplicate', true);
  END IF;

  INSERT INTO eb_subscription_payments (subscription_id, church_id, amount_cents, currency, status,
      payment_method, provider_payment_id, provider_invoice_id, paid_at, failed_at, failure_reason)
  VALUES (v_sub.id, v_sub.church_id, p_amount_cents, v_sub.currency, p_status,
      'card', p_provider_payment_id, p_provider_invoice_id,
      CASE WHEN p_status = 'paid'   THEN COALESCE(p_paid_at, now()) END,
      CASE WHEN p_status = 'failed' THEN now() END, p_failure_reason)
  RETURNING id INTO v_pay_id;

  IF p_status = 'paid' AND v_sub.status IN ('trialing','past_due','incomplete') THEN
    UPDATE eb_subscriptions SET status = 'active', current_period_starts_at = now(),
        current_period_ends_at = COALESCE(current_period_ends_at, now() + interval '1 month') WHERE id = v_sub.id;
    UPDATE churches SET plan_status = 'active' WHERE id = v_sub.church_id;
    UPDATE eb_onboarding_tasks SET status = 'done', completed_at = now()
      WHERE church_id = v_sub.church_id AND task_key = 'subscription_active' AND status <> 'done';
  ELSIF p_status = 'failed' AND v_sub.status = 'active' THEN
    UPDATE eb_subscriptions SET status = 'past_due' WHERE id = v_sub.id;
    UPDATE churches SET plan_status = 'past_due' WHERE id = v_sub.church_id;
  END IF;

  PERFORM eb_log('payment.stripe', 'eb_subscription_payment', v_pay_id, v_sub.church_id,
    jsonb_build_object('amount_cents', p_amount_cents, 'status', p_status, 'invoice', p_provider_invoice_id));
  RETURN jsonb_build_object('ok', true, 'payment_id', v_pay_id);
END $$;
REVOKE EXECUTE ON FUNCTION eb_stripe_record_payment(TEXT,BIGINT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION eb_stripe_record_payment(TEXT,BIGINT,TEXT,TEXT,TEXT,TIMESTAMPTZ,TEXT) TO service_role;
