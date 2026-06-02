-- =====================================================================
-- FASE 13 · 01 — Public portal RPC + hardening de policies anon
-- =====================================================================
-- Problema: las policies anon de churches, campaigns, service_times son
-- demasiado abiertas y permiten enumerar TODAS las iglesias y sus datos
-- públicos sin filtrar por slug. Cross-tenant leak moderado.
--
-- Solución:
--   1. Crear rpc_public_portal_by_slug(p_slug text) que devuelve UN solo
--      JSONB con todo lo que el portal anónimo necesita.
--   2. Endurecer las 4 policies anon para que solo devuelvan datos cuando
--      el portal_settings de esa iglesia está 'published'.
--   3. Las columnas privadas (EIN, address detallada, email) NUNCA se
--      exponen vía la RPC pública.

-- ---------- rpc_public_portal_by_slug ----------
CREATE OR REPLACE FUNCTION rpc_public_portal_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_result JSONB;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_church_id
  FROM churches
  WHERE slug = lower(trim(p_slug))
    AND deleted_at IS NULL;

  IF v_church_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Solo exponer si portal está publicado
  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings
  WHERE church_id = v_church_id;

  IF NOT COALESCE(v_published, false) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'church', (
      SELECT jsonb_build_object(
        'id',            c.id,
        'public_name',   c.public_name,
        'slug',          c.slug,
        'primary_color', c.primary_color,
        'logo_url',      c.logo_url
      )
      FROM churches c WHERE c.id = v_church_id
    ),
    'portal', (
      SELECT jsonb_build_object(
        'published_data', ps.published_data,
        'published_at',   ps.published_at
      )
      FROM portal_settings ps WHERE ps.church_id = v_church_id
    ),
    'campaigns', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',           c.id,
          'name',         c.name,
          'description',  c.description,
          'goal_cents',   c.goal_cents,
          'currency',     c.currency,
          'end_date',     c.end_date,
          'image_url',    c.image_url
        )
        ORDER BY c.end_date NULLS LAST
      )
      FROM campaigns c
      WHERE c.church_id = v_church_id
        AND c.is_visible_on_portal = true
        AND c.status = 'active'
        AND c.deleted_at IS NULL
    ), '[]'::jsonb),
    'serviceTimes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',           st.id,
          'day_of_week',  st.day_of_week,
          'start_time',   st.start_time,
          'duration_min', st.duration_min,
          'meeting_type', st.meeting_type,
          'location',     st.location,
          'address',      st.address,
          'sort_order',   st.sort_order
        )
        ORDER BY st.day_of_week, st.start_time
      )
      FROM service_times st
      WHERE st.church_id = v_church_id
        AND st.is_active = true
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END $$;

COMMENT ON FUNCTION rpc_public_portal_by_slug IS
  'Devuelve datos públicos del portal por slug. Solo retorna si publish_status=published. Nunca expone EIN, address detallada ni emails.';

GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO authenticated;

-- ---------- Endurecer policies anon ----------
-- churches: bloquear lectura directa anon. Toda lectura pública pasa por la RPC.
DROP POLICY IF EXISTS churches_select_anon ON churches;
-- (sin policy de reemplazo: anon ya no puede SELECT directo en churches)

-- campaigns: solo visible si la iglesia tiene portal publicado.
DROP POLICY IF EXISTS campaigns_select_anon ON campaigns;
CREATE POLICY campaigns_select_anon ON campaigns FOR SELECT
  TO anon
  USING (
    is_visible_on_portal = true
    AND status = 'active'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM portal_settings ps
      WHERE ps.church_id = campaigns.church_id
        AND ps.publish_status = 'published'
    )
  );

-- service_times: solo visible si la iglesia tiene portal publicado.
DROP POLICY IF EXISTS service_times_select_anon ON service_times;
CREATE POLICY service_times_select_anon ON service_times FOR SELECT
  TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM portal_settings ps
      WHERE ps.church_id = service_times.church_id
        AND ps.publish_status = 'published'
    )
  );

-- portal_settings_select_anon ya filtra por publish_status='published': se deja.
-- (no se toca)
