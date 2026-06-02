-- =====================================================================
-- EQUIPOS · 16 — Diagnóstico: policies reales (busca una permisiva que filtre)
-- =====================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname, permissive, roles::text AS roles, cmd, COALESCE(qual,'(none)') AS qual
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('people','donations','service_events','service_teams','chat_messages','service_notifications')
    ORDER BY tablename, cmd, policyname
  LOOP
    RAISE NOTICE 'POL % | % | %/% | roles=% | qual=%',
      r.tablename, r.policyname, r.permissive, r.cmd, r.roles, left(r.qual, 160);
  END LOOP;
END $$;
