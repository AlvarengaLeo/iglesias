-- =====================================================================
-- EB CONNECT · Backoffice — Fase 4: Dashboard BI (RPC agregador único)
-- =====================================================================
-- Devuelve KPIs + series mensuales + breakdowns + listas de salud en UNA llamada.
-- Solo agregados (COUNT/SUM) — sin PII. p_months controla la ventana de series.
CREATE OR REPLACE FUNCTION eb_dashboard(p_months INT DEFAULT 6)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB; v_n INT := GREATEST(1, LEAST(COALESCE(p_months,6), 24));
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'active',             (SELECT COUNT(*) FROM eb_subscriptions WHERE status = 'active'),
      'trialing',           (SELECT COUNT(*) FROM eb_subscriptions WHERE status = 'trialing'),
      'past_due',           (SELECT COUNT(*) FROM eb_subscriptions WHERE status = 'past_due'),
      'mrr_cents',          (SELECT COALESCE(SUM(monthly_price_cents),0) FROM eb_subscriptions WHERE status IN ('active','past_due')),
      'collected_cents',    (SELECT COALESCE(SUM(amount_cents),0) FROM eb_subscription_payments WHERE status = 'paid'),
      'failed_payments',    (SELECT COUNT(*) FROM eb_subscription_payments WHERE status = 'failed'),
      'churches_total',     (SELECT COUNT(*) FROM churches WHERE deleted_at IS NULL),
      'new_churches_30d',   (SELECT COUNT(*) FROM churches WHERE deleted_at IS NULL AND created_at > now() - interval '30 days'),
      'leads_open',         (SELECT COUNT(*) FROM eb_leads WHERE status NOT IN ('converted','lost','not_qualified')),
      'onboarding_pending', (SELECT COUNT(DISTINCT church_id) FROM eb_onboarding_tasks WHERE status <> 'done'),
      'portals_published',  (SELECT COUNT(*) FROM portal_settings WHERE publish_status = 'published')
    ),
    'growth', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', to_char(m,'Mon'), 'value', (
        SELECT COUNT(*) FROM churches c WHERE c.deleted_at IS NULL AND date_trunc('month', c.created_at) = m)) ORDER BY m), '[]'::jsonb)
      FROM generate_series(date_trunc('month', now()) - ((v_n-1) || ' months')::interval, date_trunc('month', now()), '1 month') m),
    'revenue', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', to_char(m,'Mon'), 'value', (
        SELECT COALESCE(SUM(amount_cents),0) FROM eb_subscription_payments pm WHERE pm.status = 'paid' AND date_trunc('month', pm.paid_at) = m)) ORDER BY m), '[]'::jsonb)
      FROM generate_series(date_trunc('month', now()) - ((v_n-1) || ' months')::interval, date_trunc('month', now()), '1 month') m),
    'sub_status', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', status, 'value', cnt)), '[]'::jsonb)
      FROM (SELECT status, COUNT(*) AS cnt FROM eb_subscriptions GROUP BY status) ss),
    'lead_funnel', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', status, 'value', cnt)), '[]'::jsonb)
      FROM (SELECT status, COUNT(*) AS cnt FROM eb_leads GROUP BY status) lf),
    'by_plan', (SELECT COALESCE(jsonb_agg(jsonb_build_object('label', plan, 'value', cnt)), '[]'::jsonb)
      FROM (SELECT plan, COUNT(*) AS cnt FROM churches WHERE deleted_at IS NULL GROUP BY plan) bp),
    'onboarding', jsonb_build_object(
      'completo',    (SELECT COUNT(*) FROM (SELECT church_id FROM eb_onboarding_tasks GROUP BY church_id HAVING bool_and(status = 'done')) a),
      'en_progreso', (SELECT COUNT(*) FROM (SELECT church_id FROM eb_onboarding_tasks GROUP BY church_id HAVING bool_or(status = 'done') AND NOT bool_and(status = 'done')) b),
      'sin_empezar', (SELECT COUNT(*) FROM (SELECT church_id FROM eb_onboarding_tasks GROUP BY church_id HAVING NOT bool_or(status = 'done')) c2)
    ),
    'health', jsonb_build_object(
      'failed_payments', (SELECT COALESCE(jsonb_agg(row_to_json(fp)), '[]'::jsonb) FROM (
          SELECT pm.id, c.public_name, pm.amount_cents, pm.created_at
          FROM eb_subscription_payments pm JOIN churches c ON c.id = pm.church_id
          WHERE pm.status = 'failed' ORDER BY pm.created_at DESC LIMIT 6) fp),
      'no_portal', (SELECT COALESCE(jsonb_agg(row_to_json(np)), '[]'::jsonb) FROM (
          SELECT c.id, c.public_name, c.slug FROM churches c LEFT JOIN portal_settings ps ON ps.church_id = c.id
          WHERE c.deleted_at IS NULL AND COALESCE(ps.publish_status,'draft') <> 'published' ORDER BY c.created_at DESC LIMIT 6) np),
      'no_admin', (SELECT COALESCE(jsonb_agg(row_to_json(na)), '[]'::jsonb) FROM (
          SELECT c.id, c.public_name, c.slug FROM churches c
          WHERE c.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM church_users cu WHERE cu.church_id = c.id AND cu.role = 'admin' AND cu.is_active)
          ORDER BY c.created_at DESC LIMIT 6) na)
    )
  ) INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_dashboard(INT) TO authenticated;
