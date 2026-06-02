-- =====================================================================
-- Per-church favicon — the church client uploads it from the CRM Portal admin
-- (Identidad), and the public portal sets its browser-tab icon from it.
-- =====================================================================
ALTER TABLE churches ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Expose favicon_url through the public portal RPC (same as logo_url).
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
        'logo_url',      c.logo_url,
        'favicon_url',   c.favicon_url
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

GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO authenticated;
