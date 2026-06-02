-- =====================================================================
-- EB CONNECT · Backoffice — Fase 5b: backfill de checklist de onboarding
-- =====================================================================
-- Iglesias creadas fuera del flujo de conversión (seed/legacy) no tienen
-- eb_onboarding_tasks. recompute ahora siembra el checklist si falta.
CREATE OR REPLACE FUNCTION eb_recompute_onboarding(p_church_id UUID)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin BOOLEAN; v_logo BOOLEAN; v_funds BOOLEAN; v_camp BOOLEAN; v_portal BOOLEAN; v_sub BOOLEAN;
BEGIN
  IF NOT eb_is_staff() THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF;

  -- Sembrar el checklist si la iglesia no tiene ninguna tarea (backfill).
  INSERT INTO eb_onboarding_tasks (church_id, task_key, title, status, is_auto, display_order)
  SELECT p_church_id, x.task_key, x.title, x.status, x.is_auto, x.display_order
  FROM (VALUES
    ('church_created',             'Iglesia creada',            'done'::text,    true,  1),
    ('admin_invited',              'Administrador invitado',    'done',          true,  2),
    ('admin_accepted',             'Admin aceptó invitación',   'pending',       true,  3),
    ('basic_info_completed',       'Datos básicos completados', 'pending',       false, 4),
    ('logo_uploaded',              'Logo cargado',              'pending',       true,  5),
    ('funds_created',              'Fondos iniciales creados',  'pending',       true,  6),
    ('first_campaign_created',     'Primera campaña creada',    'pending',       true,  7),
    ('receipt_settings_completed', 'Configuración de recibos',  'pending',       false, 8),
    ('portal_published',           'Portal publicado',          'pending',       true,  9),
    ('subscription_active',        'Suscripción activa',        'pending',       true, 10),
    ('training_completed',         'Capacitación realizada',    'pending',       false,11)
  ) AS x(task_key, title, status, is_auto, display_order)
  WHERE NOT EXISTS (SELECT 1 FROM eb_onboarding_tasks WHERE church_id = p_church_id)
  ON CONFLICT (church_id, task_key) DO NOTHING;

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
    AND t.status <> CASE WHEN c.met THEN 'done' ELSE 'pending' END;
END $$;
