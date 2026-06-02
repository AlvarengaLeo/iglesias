-- =====================================================================
-- EB CONNECT · Backoffice — Fase 6: Soporte (tickets + mensajes)
-- =====================================================================

CREATE TABLE IF NOT EXISTS eb_support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID REFERENCES churches(id) ON DELETE SET NULL,
  subject       TEXT NOT NULL,
  description   TEXT,
  category      TEXT NOT NULL DEFAULT 'general',
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'open'   CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  created_by_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eb_support_ticket_messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id      UUID NOT NULL REFERENCES eb_support_tickets(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body           TEXT NOT NULL,
  is_internal    BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eb_tickets_status   ON eb_support_tickets (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eb_tickets_church   ON eb_support_tickets (church_id);
CREATE INDEX IF NOT EXISTS idx_eb_ticket_msgs      ON eb_support_ticket_messages (ticket_id, created_at);

CREATE TRIGGER trg_eb_tickets_updated_at BEFORE UPDATE ON eb_support_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE eb_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE eb_support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY eb_tickets_select ON eb_support_tickets FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_tickets_write ON eb_support_tickets FOR ALL
  USING (eb_staff_role() IN ('super_admin','support')) WITH CHECK (eb_staff_role() IN ('super_admin','support'));
CREATE POLICY eb_ticket_msgs_select ON eb_support_ticket_messages FOR SELECT USING (eb_is_staff());
CREATE POLICY eb_ticket_msgs_insert ON eb_support_ticket_messages FOR INSERT
  WITH CHECK (eb_is_staff() AND author_user_id = auth.uid());

-- ---------- RPCs ----------
CREATE OR REPLACE FUNCTION eb_list_tickets(p_status TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL, p_limit INT DEFAULT 100)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'items', COALESCE(jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC), '[]'::jsonb),
    'open_count', (SELECT COUNT(*) FROM eb_support_tickets WHERE status IN ('open','in_progress','waiting_customer'))
  ) INTO v FROM (
    SELECT t.id, t.subject, t.category, t.priority, t.status, t.created_at, t.updated_at,
           c.public_name AS church_name, c.slug AS church_slug,
           (SELECT COUNT(*) FROM eb_support_ticket_messages m WHERE m.ticket_id = t.id) AS message_count
    FROM eb_support_tickets t LEFT JOIN churches c ON c.id = t.church_id
    WHERE (p_status IS NULL OR t.status = p_status)
      AND (p_search IS NULL OR t.subject ILIKE '%'||p_search||'%' OR c.public_name ILIKE '%'||p_search||'%')
    ORDER BY t.created_at DESC LIMIT GREATEST(1, LEAST(p_limit, 200))
  ) x;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_list_tickets(TEXT, TEXT, INT) TO authenticated;

CREATE OR REPLACE FUNCTION eb_ticket_detail(p_ticket_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT jsonb_build_object(
    'ticket', (SELECT row_to_json(x) FROM (
        SELECT t.*, c.public_name AS church_name, c.slug AS church_slug,
               eu.full_name AS assigned_name
        FROM eb_support_tickets t
        LEFT JOIN churches c ON c.id = t.church_id
        LEFT JOIN eb_users eu ON eu.user_id = t.assigned_to_user_id
        WHERE t.id = p_ticket_id) x),
    'messages', (SELECT COALESCE(jsonb_agg(row_to_json(y) ORDER BY y.created_at), '[]'::jsonb) FROM (
        SELECT m.id, m.body, m.is_internal, m.created_at,
               COALESCE(eu.full_name, eu.email_snapshot, 'Equipo') AS author_name
        FROM eb_support_ticket_messages m
        LEFT JOIN eb_users eu ON eu.user_id = m.author_user_id
        WHERE m.ticket_id = p_ticket_id) y)
  ) INTO v;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_ticket_detail(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION eb_create_ticket(
  p_church_id UUID, p_subject TEXT, p_description TEXT,
  p_category TEXT DEFAULT 'general', p_priority TEXT DEFAULT 'medium')
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
  IF eb_staff_role() NOT IN ('super_admin','support') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_subject IS NULL OR length(btrim(p_subject)) = 0 THEN RAISE EXCEPTION 'subject required'; END IF;
  INSERT INTO eb_support_tickets (church_id, subject, description, category, priority, created_by_user_id)
  VALUES (p_church_id, btrim(p_subject), p_description, COALESCE(NULLIF(btrim(p_category),''),'general'), COALESCE(p_priority,'medium'), auth.uid())
  RETURNING id INTO v_id;
  IF p_description IS NOT NULL AND length(btrim(p_description)) > 0 THEN
    INSERT INTO eb_support_ticket_messages (ticket_id, author_user_id, body, is_internal)
    VALUES (v_id, auth.uid(), btrim(p_description), false);
  END IF;
  PERFORM eb_log('ticket.create', 'eb_support_ticket', v_id, p_church_id,
    jsonb_build_object('subject', p_subject, 'priority', p_priority));
  RETURN jsonb_build_object('ticket_id', v_id);
END $$;
GRANT EXECUTE ON FUNCTION eb_create_ticket(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION eb_add_ticket_message(p_ticket_id UUID, p_body TEXT, p_is_internal BOOLEAN DEFAULT false)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF eb_staff_role() NOT IN ('super_admin','support') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_body IS NULL OR length(btrim(p_body)) = 0 THEN RAISE EXCEPTION 'body required'; END IF;
  INSERT INTO eb_support_ticket_messages (ticket_id, author_user_id, body, is_internal)
  VALUES (p_ticket_id, auth.uid(), btrim(p_body), COALESCE(p_is_internal, false));
  UPDATE eb_support_tickets SET updated_at = now() WHERE id = p_ticket_id;
  RETURN eb_ticket_detail(p_ticket_id);
END $$;
GRANT EXECUTE ON FUNCTION eb_add_ticket_message(UUID, TEXT, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION eb_set_ticket_status(p_ticket_id UUID, p_status TEXT, p_assign_self BOOLEAN DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_church UUID;
BEGIN
  IF eb_staff_role() NOT IN ('super_admin','support') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('open','in_progress','waiting_customer','resolved','closed') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE eb_support_tickets SET
    status = p_status,
    closed_at = CASE WHEN p_status IN ('resolved','closed') THEN COALESCE(closed_at, now()) ELSE NULL END,
    assigned_to_user_id = CASE WHEN p_assign_self IS TRUE THEN auth.uid() ELSE assigned_to_user_id END
  WHERE id = p_ticket_id
  RETURNING church_id INTO v_church;
  IF NOT FOUND THEN RAISE EXCEPTION 'ticket not found'; END IF;
  PERFORM eb_log('ticket.status', 'eb_support_ticket', p_ticket_id, v_church, jsonb_build_object('status', p_status));
  RETURN eb_ticket_detail(p_ticket_id);
END $$;
GRANT EXECUTE ON FUNCTION eb_set_ticket_status(UUID, TEXT, BOOLEAN) TO authenticated;

-- ---------- Dashboard: añadir KPI de tickets abiertos + salud ----------
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
      'portals_published',  (SELECT COUNT(*) FROM portal_settings WHERE publish_status = 'published'),
      'tickets_open',       (SELECT COUNT(*) FROM eb_support_tickets WHERE status IN ('open','in_progress','waiting_customer'))
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
