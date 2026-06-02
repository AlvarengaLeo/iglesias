-- Fix: eb_subscription_detail — el subquery de planes ordenaba por z.sort_order
-- sin incluirlo en el SELECT del alias (columna inválida → 400). Se incluye.
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
        SELECT id, code, name, monthly_price_cents, sort_order FROM eb_plans WHERE is_active) z)
  ) INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_subscription_detail(UUID) TO authenticated;
