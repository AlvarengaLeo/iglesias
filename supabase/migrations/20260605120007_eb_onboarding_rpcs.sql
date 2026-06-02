-- =====================================================================
-- EB CONNECT · Backoffice — Fase 5: Onboarding (auto-detección + manual)
-- =====================================================================
-- Las tablas/seed ya existen (Fase 2). Aquí: recompute de tareas auto,
-- lectura con progreso, y toggle manual auditado.

-- Recalcula las tareas is_auto a partir del estado real de la iglesia.
CREATE OR REPLACE FUNCTION eb_recompute_onboarding(p_church_id UUID)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin BOOLEAN; v_logo BOOLEAN; v_funds BOOLEAN; v_camp BOOLEAN; v_portal BOOLEAN; v_sub BOOLEAN;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  SELECT EXISTS (SELECT 1 FROM church_users WHERE church_id = p_church_id AND role = 'admin' AND is_active) INTO v_admin;
  SELECT COALESCE(logo_url IS NOT NULL AND length(btrim(logo_url)) > 0, false) INTO v_logo FROM churches WHERE id = p_church_id;
  SELECT EXISTS (SELECT 1 FROM funds WHERE church_id = p_church_id) INTO v_funds;
  SELECT EXISTS (SELECT 1 FROM campaigns WHERE church_id = p_church_id) INTO v_camp;
  SELECT EXISTS (SELECT 1 FROM portal_settings WHERE church_id = p_church_id AND publish_status = 'published') INTO v_portal;
  SELECT EXISTS (SELECT 1 FROM eb_subscriptions WHERE church_id = p_church_id AND status IN ('active','past_due')) INTO v_sub;

  UPDATE eb_onboarding_tasks t SET
    status       = CASE WHEN c.met THEN 'done' ELSE 'pending' END,
    completed_at = CASE WHEN c.met THEN COALESCE(t.completed_at, now()) ELSE NULL END
  FROM (VALUES
    ('admin_accepted',         v_admin),
    ('logo_uploaded',          v_logo),
    ('funds_created',          v_funds),
    ('first_campaign_created', v_camp),
    ('portal_published',       v_portal),
    ('subscription_active',    v_sub)
  ) AS c(task_key, met)
  WHERE t.church_id = p_church_id AND t.task_key = c.task_key AND t.is_auto
    AND t.status <> CASE WHEN c.met THEN 'done' ELSE 'pending' END;  -- solo si cambia
END $$;
GRANT EXECUTE ON FUNCTION eb_recompute_onboarding(UUID) TO authenticated;

-- Lectura del checklist con progreso (recalcula auto antes de devolver).
CREATE OR REPLACE FUNCTION eb_church_onboarding(p_church_id UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v JSONB;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  PERFORM eb_recompute_onboarding(p_church_id);
  SELECT jsonb_build_object(
    'tasks', COALESCE(jsonb_agg(jsonb_build_object(
        'task_key', task_key, 'title', title, 'status', status, 'is_auto', is_auto,
        'completed_at', completed_at, 'display_order', display_order) ORDER BY display_order), '[]'::jsonb),
    'done',  COUNT(*) FILTER (WHERE status = 'done'),
    'total', COUNT(*),
    'pct',   CASE WHEN COUNT(*) = 0 THEN 0 ELSE round(100.0 * COUNT(*) FILTER (WHERE status = 'done') / COUNT(*)) END
  ) INTO v FROM eb_onboarding_tasks WHERE church_id = p_church_id;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION eb_church_onboarding(UUID) TO authenticated;

-- Cambio manual de una tarea (auditado).
CREATE OR REPLACE FUNCTION eb_set_onboarding_task(p_church_id UUID, p_task_key TEXT, p_status TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF eb_staff_role() NOT IN ('super_admin','support') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('pending','in_progress','blocked','done') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE eb_onboarding_tasks SET
    status = p_status,
    completed_at = CASE WHEN p_status = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END,
    completed_by_user_id = CASE WHEN p_status = 'done' THEN auth.uid() ELSE NULL END
  WHERE church_id = p_church_id AND task_key = p_task_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'task not found'; END IF;
  PERFORM eb_log('onboarding.update', 'eb_onboarding_task', NULL, p_church_id,
    jsonb_build_object('task_key', p_task_key, 'status', p_status));
  RETURN eb_church_onboarding(p_church_id);
END $$;
GRANT EXECUTE ON FUNCTION eb_set_onboarding_task(UUID, TEXT, TEXT) TO authenticated;
