-- =====================================================================
-- EB CONNECT · Backoffice — Fase 3: RPCs de Facturación (suscripciones/pagos)
-- =====================================================================

-- Overview / MRR para el módulo y el dashboard.
CREATE OR REPLACE FUNCTION eb_billing_overview()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'mrr_cents',       (SELECT COALESCE(SUM(monthly_price_cents),0) FROM eb_subscriptions WHERE status IN ('active','past_due')),
    'active',          (SELECT COUNT(*) FROM eb_subscriptions WHERE status = 'active'),
    'trialing',        (SELECT COUNT(*) FROM eb_subscriptions WHERE status = 'trialing'),
    'past_due',        (SELECT COUNT(*) FROM eb_subscriptions WHERE status = 'past_due'),
    'canceled',        (SELECT COUNT(*) FROM eb_subscriptions WHERE status = 'canceled'),
    'collected_cents', (SELECT COALESCE(SUM(amount_cents),0) FROM eb_subscription_payments WHERE status = 'paid'),
    'failed_payments', (SELECT COUNT(*) FROM eb_subscription_payments WHERE status = 'failed')
  ) INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_billing_overview() TO authenticated;

-- Listado de suscripciones (1 por iglesia: la viva o la última).
CREATE OR REPLACE FUNCTION eb_list_subscriptions(p_status TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL, p_limit INT DEFAULT 100)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v FROM (
    SELECT s.id AS subscription_id, s.church_id, c.public_name, c.slug,
           p.name AS plan_name, s.status, s.monthly_price_cents, s.currency,
           s.trial_ends_at, s.current_period_ends_at, s.created_at,
           (SELECT MAX(paid_at) FROM eb_subscription_payments pm WHERE pm.subscription_id = s.id AND pm.status = 'paid') AS last_payment_at,
           (SELECT COALESCE(SUM(amount_cents),0) FROM eb_subscription_payments pm WHERE pm.subscription_id = s.id AND pm.status = 'paid') AS total_paid_cents
    FROM eb_subscriptions s
    JOIN churches c ON c.id = s.church_id
    LEFT JOIN eb_plans p ON p.id = s.plan_id
    WHERE (p_status IS NULL OR s.status = p_status)
      AND (p_search IS NULL OR c.public_name ILIKE '%'||p_search||'%' OR c.slug::text ILIKE '%'||p_search||'%')
    ORDER BY (CASE s.status WHEN 'past_due' THEN 0 WHEN 'trialing' THEN 1 WHEN 'active' THEN 2 ELSE 3 END), s.created_at DESC
    LIMIT GREATEST(1, LEAST(p_limit, 200))
  ) t;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_list_subscriptions(TEXT,TEXT,INT) TO authenticated;

-- Detalle: suscripción + pagos.
CREATE OR REPLACE FUNCTION eb_subscription_detail(p_subscription_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'subscription', (SELECT row_to_json(x) FROM (
        SELECT s.*, c.public_name, c.slug, p.name AS plan_name, p.code AS plan_code
        FROM eb_subscriptions s JOIN churches c ON c.id = s.church_id LEFT JOIN eb_plans p ON p.id = s.plan_id
        WHERE s.id = p_subscription_id) x),
    'payments', (SELECT COALESCE(jsonb_agg(row_to_json(y) ORDER BY y.created_at DESC), '[]'::jsonb) FROM (
        SELECT id, amount_cents, currency, status, payment_method, paid_at, failed_at, failure_reason, notes, created_at
        FROM eb_subscription_payments WHERE subscription_id = p_subscription_id) y),
    'plans', (SELECT COALESCE(jsonb_agg(row_to_json(z) ORDER BY z.sort_order), '[]'::jsonb) FROM (
        SELECT id, code, name, monthly_price_cents FROM eb_plans WHERE is_active) z)
  ) INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_subscription_detail(UUID) TO authenticated;

-- Registrar pago manual (y activar trial si corresponde).
CREATE OR REPLACE FUNCTION eb_record_payment(
  p_subscription_id UUID, p_amount_cents BIGINT, p_status TEXT DEFAULT 'paid',
  p_payment_method TEXT DEFAULT 'manual', p_notes TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT; v_sub eb_subscriptions%ROWTYPE; v_pay_id UUID;
BEGIN
  v_role := eb_staff_role();
  IF v_role NOT IN ('super_admin','billing') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_sub FROM eb_subscriptions WHERE id = p_subscription_id;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'subscription not found'; END IF;

  INSERT INTO eb_subscription_payments (subscription_id, church_id, amount_cents, currency, status, payment_method, paid_at, failed_at, notes)
  VALUES (p_subscription_id, v_sub.church_id, p_amount_cents, v_sub.currency, p_status, p_payment_method,
          CASE WHEN p_status = 'paid' THEN now() END, CASE WHEN p_status = 'failed' THEN now() END, p_notes)
  RETURNING id INTO v_pay_id;

  IF p_status = 'paid' AND v_sub.status IN ('trialing','past_due','incomplete') THEN
    UPDATE eb_subscriptions
      SET status = 'active', current_period_starts_at = now(), current_period_ends_at = now() + interval '1 month'
      WHERE id = p_subscription_id;
    UPDATE churches SET plan_status = 'active' WHERE id = v_sub.church_id;
    UPDATE eb_onboarding_tasks SET status = 'done', completed_at = now()
      WHERE church_id = v_sub.church_id AND task_key = 'subscription_active' AND status <> 'done';
  ELSIF p_status = 'failed' AND v_sub.status = 'active' THEN
    UPDATE eb_subscriptions SET status = 'past_due' WHERE id = p_subscription_id;
    UPDATE churches SET plan_status = 'past_due' WHERE id = v_sub.church_id;
  END IF;

  PERFORM eb_log('payment.record', 'eb_subscription_payment', v_pay_id, v_sub.church_id,
    jsonb_build_object('amount_cents', p_amount_cents, 'status', p_status, 'method', p_payment_method));
  RETURN jsonb_build_object('payment_id', v_pay_id);
END $$;
GRANT EXECUTE ON FUNCTION eb_record_payment(UUID,BIGINT,TEXT,TEXT,TEXT) TO authenticated;

-- Cambiar estado de la suscripción (cancelar/reactivar/pausar) + espejo en churches.
CREATE OR REPLACE FUNCTION eb_set_subscription_status(p_subscription_id UUID, p_status TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role TEXT; v_sub eb_subscriptions%ROWTYPE;
BEGIN
  v_role := eb_staff_role();
  IF v_role NOT IN ('super_admin','billing') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('trialing','active','past_due','canceled','paused') THEN RAISE EXCEPTION 'invalid status'; END IF;
  SELECT * INTO v_sub FROM eb_subscriptions WHERE id = p_subscription_id;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'subscription not found'; END IF;

  UPDATE eb_subscriptions
    SET status = p_status,
        canceled_at = CASE WHEN p_status = 'canceled' THEN now() ELSE NULL END,
        cancel_reason = CASE WHEN p_status = 'canceled' THEN p_reason ELSE cancel_reason END
    WHERE id = p_subscription_id;

  -- Espejo en churches.plan_status (enum: active/past_due/canceled/trialing).
  IF p_status IN ('active','past_due','canceled','trialing') THEN
    UPDATE churches SET plan_status = p_status WHERE id = v_sub.church_id;
  END IF;

  PERFORM eb_log('subscription.status_change', 'eb_subscription', p_subscription_id, v_sub.church_id,
    jsonb_build_object('from', v_sub.status, 'to', p_status, 'reason', p_reason));
  RETURN jsonb_build_object('ok', true, 'status', p_status);
END $$;
GRANT EXECUTE ON FUNCTION eb_set_subscription_status(UUID,TEXT,TEXT) TO authenticated;
