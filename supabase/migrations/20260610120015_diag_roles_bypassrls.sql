-- =====================================================================
-- EQUIPOS · 15 — Diagnóstico: ¿anon/authenticated tienen BYPASSRLS?
-- =====================================================================
-- Si rolbypassrls = t para anon o authenticated, RLS queda ANULADO en TODAS
-- las tablas del proyecto (preexistente). Solo imprime; no cambia nada.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT rolname, rolbypassrls, rolsuper FROM pg_roles
           WHERE rolname IN ('anon','authenticated','authenticator','service_role') ORDER BY rolname LOOP
    RAISE NOTICE 'ROLE-AUDIT % bypassrls=% super=%', r.rolname, r.rolbypassrls, r.rolsuper;
  END LOOP;
END $$;
