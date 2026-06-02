-- =====================================================================
-- EQUIPOS · 18 — Limpieza de diagnósticos
-- =====================================================================
-- Elimina la función temporal de diagnóstico rpc_whoami (usada para localizar
-- el bypass de RLS en la capa API). Las migraciones 13/15/16/17 eran de solo
-- lectura/diagnóstico salvo el ENABLE RLS de la 13 (que se conserva).
DROP FUNCTION IF EXISTS rpc_whoami();
