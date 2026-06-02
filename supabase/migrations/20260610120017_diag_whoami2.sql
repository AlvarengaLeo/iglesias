-- =====================================================================
-- EQUIPOS · 17 — Diagnóstico: ¿RLS aplica dentro de SECURITY INVOKER (anon)?
-- =====================================================================
-- SECURITY INVOKER: las queries corren con el rol del caller (anon), así que RLS
-- debería filtrar. Si people_count_as_caller > 0 para anon => RLS NO se aplica a
-- nivel de BD para anon (problema de proyecto). row_security muestra el GUC.
CREATE OR REPLACE FUNCTION rpc_whoami()
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'current_user', current_user,
    'row_security', current_setting('row_security', true),
    'uid', auth.uid(),
    'people_count_as_caller', (SELECT count(*) FROM public.people)
  );
$$;
