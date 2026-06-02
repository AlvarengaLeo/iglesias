-- =====================================================================
-- FASE 14 · 03 — Extender rpc_public_portal_by_slug
-- =====================================================================
-- El portal público necesita conocer:
--   - funds[] visibles públicamente para el formulario de donación
--   - payment_available: ¿está el proveedor de pago activo? (hoy siempre false)
--
-- Reemplazamos la función con CREATE OR REPLACE — no se toca la migración
-- 20260530120001 que la creó originalmente. La firma y el contrato existente
-- se conservan (campos church, portal, campaigns, serviceTimes intactos).
--
-- Nuevos campos en el JSON de salida:
--   - funds         (array)   — fondos activos de la iglesia, exposición pública mínima
--   - payment_available (bool) — false hoy; será true cuando Stripe esté activo

CREATE OR REPLACE FUNCTION rpc_public_portal_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_result JSONB;
  v_payment_available BOOLEAN;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_church_id
  FROM churches
  WHERE slug = lower(btrim(p_slug))
    AND deleted_at IS NULL;

  IF v_church_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings
  WHERE church_id = v_church_id;

  IF NOT COALESCE(v_published, false) THEN
    RETURN NULL;
  END IF;

  -- payment_available: hoy hardcodeado false. Cuando se wire Stripe:
  --   v_payment_available := (stripe_charges_enabled = true AND stripe_account_id IS NOT NULL)
  -- desde la fila de churches.
  v_payment_available := false;

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
          'image_url',    c.image_url,
          'fund_id',      c.fund_id
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
    ), '[]'::jsonb),
    -- NUEVO: fondos activos para el form de donación pública (campos mínimos)
    'funds', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         f.id,
          'name',       f.name,
          'is_default', f.is_default
        )
        ORDER BY f.is_default DESC, f.sort_order, f.name
      )
      FROM funds f
      WHERE f.church_id = v_church_id
        AND f.is_active = true
    ), '[]'::jsonb),
    'payment_available', v_payment_available
  ) INTO v_result;

  RETURN v_result;
END $$;

COMMENT ON FUNCTION rpc_public_portal_by_slug IS
  'Datos públicos del portal por slug. Solo retorna si publish_status=published. Devuelve church (publishable), portal published_data, campaigns visibles, service_times visibles, funds activos (para form donación pública) y payment_available flag.';

-- GRANTs (idempotente, ya existen pero por si acaso)
GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO authenticated;
