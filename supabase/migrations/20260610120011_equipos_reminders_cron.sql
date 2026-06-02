-- =====================================================================
-- EQUIPOS · 11 — Service reminders (T-24h / T-2h) + pg_cron schedule
-- =====================================================================
-- Enqueue idempotente de recordatorios. Comparación absoluta (timestamptz) =
-- timezone-correcta; el texto en hora local (churches.timezone) lo arma el
-- cliente/el dispatch de email. dedupe_key garantiza máx. 1 recordatorio por
-- (asignación, ventana), aun si el cron corre varias veces dentro de la ventana.

CREATE OR REPLACE FUNCTION rpc_enqueue_service_reminders()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_recipient UUID; v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT a.id AS assignment_id, a.church_id, a.person_id, a.service_event_id,
           e.start_datetime, e.title,
           CASE
             WHEN e.start_datetime BETWEEN now() + INTERVAL '23 hours'  AND now() + INTERVAL '25 hours'   THEN 't24'
             WHEN e.start_datetime BETWEEN now() + INTERVAL '90 minutes' AND now() + INTERVAL '150 minutes' THEN 't2'
           END AS reminder_window
    FROM service_assignments a
    JOIN service_events e ON e.id = a.service_event_id
    WHERE a.deleted_at IS NULL AND e.deleted_at IS NULL
      AND a.status IN ('pending','confirmed')
      AND e.status = 'scheduled'
      AND (
        e.start_datetime BETWEEN now() + INTERVAL '23 hours'  AND now() + INTERVAL '25 hours'
        OR e.start_datetime BETWEEN now() + INTERVAL '90 minutes' AND now() + INTERVAL '150 minutes'
      )
  LOOP
    v_recipient := _person_login_user_id(r.church_id, r.person_id);
    IF v_recipient IS NULL THEN CONTINUE; END IF;

    PERFORM _emit_notification(
      r.church_id, v_recipient, 'service_reminder', 'notif.service_reminder',
      jsonb_build_object('event_id', r.service_event_id, 'title', r.title,
                         'start_datetime', r.start_datetime, 'window', r.reminder_window),
      NULL,                                                            -- collapse_key
      'reminder:' || r.assignment_id::text || ':' || r.reminder_window, -- dedupe_key
      r.service_event_id, r.assignment_id, NULL, '#equipos?tab=mi-servicio'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $$;

COMMENT ON FUNCTION rpc_enqueue_service_reminders IS 'Encola recordatorios T-24h/T-2h (idempotente por dedupe_key). Llamado por pg_cron cada 15 min o por edge function.';

-- Programación best-effort (pg_cron solo en Supabase Pro+).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'equipos-service-reminders',
      '*/15 * * * *',
      'SELECT public.rpc_enqueue_service_reminders();'
    );
  ELSE
    RAISE NOTICE 'pg_cron no disponible; programar rpc_enqueue_service_reminders() vía edge function.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo programar el cron de recordatorios: %', SQLERRM;
END $$;
