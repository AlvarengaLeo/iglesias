-- =====================================================================
-- EQUIPOS · 13 — Auditar + asegurar RLS habilitado (fix de seguridad)
-- =====================================================================
-- Diagnóstico: un test mostró que anon podía leer service_*/chat_*.
-- Este bloque imprime el estado real de relrowsecurity por tabla (RAISE NOTICE,
-- visible en `supabase db push`) y FUERZA ENABLE ROW LEVEL SECURITY (idempotente).

DO $$
DECLARE
  t TEXT;
  v_enabled BOOLEAN;
  v_tables TEXT[] := ARRAY[
    'service_events','service_teams','service_positions','service_team_members',
    'service_assignments','service_assignment_responses',
    'chat_channels','chat_channel_members','chat_messages','chat_attachments','chat_message_mentions',
    'service_notifications','service_notification_deliveries','service_notification_prefs'
  ];
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    SELECT relrowsecurity INTO v_enabled FROM pg_class WHERE oid = ('public.' || t)::regclass;
    RAISE NOTICE 'RLS-AUDIT % = %', t, v_enabled;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
