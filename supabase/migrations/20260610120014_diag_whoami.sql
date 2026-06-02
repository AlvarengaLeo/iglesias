-- =====================================================================
-- EQUIPOS · 14 — Diagnóstico temporal: rol efectivo de la conexión (whoami)
-- =====================================================================
-- SECURITY INVOKER (corre con el rol del caller) para revelar qué rol usa
-- PostgREST con la publishable key vs un usuario autenticado. Sirve para
-- diagnosticar por qué RLS parece bypasseado. Es de solo lectura.
CREATE OR REPLACE FUNCTION rpc_whoami()
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'uid', auth.uid(),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$$;
