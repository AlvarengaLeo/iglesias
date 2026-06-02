-- =====================================================================
-- EQUIPOS · 10 — Realtime publication
-- =====================================================================
-- postgres_changes re-aplica RLS por fila al suscriptor: los filtros del cliente
-- son conveniencia, NO seguridad. Agregamos las tablas de chat/notif/asignaciones
-- a la publicación supabase_realtime. REPLICA IDENTITY FULL donde RLS necesita
-- columnas del payload en UPDATE/DELETE (chat_messages ya quedó FULL en ·02).
-- La autorización de broadcast/presence (typing/online) vía realtime.messages
-- se configura en la Fase F7 (presence/typing).

ALTER TABLE service_assignments   REPLICA IDENTITY FULL;
ALTER TABLE service_notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_messages','chat_channels','chat_channel_members',
                           'service_notifications','service_assignments'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
