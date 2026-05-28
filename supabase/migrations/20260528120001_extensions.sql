-- =====================================================================
-- 01 — Extensions
-- =====================================================================
-- Habilita extensiones requeridas por el schema.
-- - pgcrypto: gen_random_uuid()
-- - citext: case-insensitive text para emails
-- - pg_trgm: búsqueda por similitud (trigram) para nombres
-- - pg_cron: refresh de materialized views (solo Supabase Pro+; opcional)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pg_cron solo está disponible en Supabase Pro+. La línea siguiente se ejecuta
-- best-effort: si falla por permiso, no rompe la migración. El refresh manual
-- de mv_church_monthly_donations se puede hacer desde la app.
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible (probablemente plan Free). Refresh de MVs será manual.';
END $$;
