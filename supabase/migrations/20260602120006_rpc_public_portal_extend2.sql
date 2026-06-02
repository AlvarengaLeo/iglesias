-- =====================================================================
-- FASE 15 · 06 — Extender rpc_public_portal_by_slug con teasers de contenido
-- =====================================================================
-- El Home del portal necesita slices pequeños del contenido nuevo para
-- renderizar sus secciones sin un segundo round-trip:
--   - latestSermons   (3 más recientes visibles)
--   - upcomingEvents  (próximos 4, starts_at >= now(), ASC)
--   - featuredProjects(6, featured primero, luego sort_order)
--   - latestPodcast   (3 más recientes visibles)
--
-- CREATE OR REPLACE — NO se toca la migración 20260601120003. Se conservan
-- byte-a-byte los keys existentes (church, portal, campaigns, serviceTimes,
-- funds, payment_available); solo se agregan 4 keys nuevos.

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
    'payment_available', v_payment_available,
    -- ===== FASE 15: teasers de contenido para el Home =====
    'latestSermons', COALESCE((
      SELECT jsonb_agg(row_to_json(s)) FROM (
        SELECT
          se.id, se.title, se.speaker, se.series, se.scripture_reference,
          se.sermon_date, se.video_url, se.audio_url, se.thumbnail_url, se.duration_seconds
        FROM sermons se
        WHERE se.church_id = v_church_id
          AND se.is_visible_on_portal = true
          AND se.deleted_at IS NULL
        ORDER BY se.sermon_date DESC, se.sort_order, se.created_at DESC
        LIMIT 3
      ) s
    ), '[]'::jsonb),
    'upcomingEvents', COALESCE((
      SELECT jsonb_agg(row_to_json(e)) FROM (
        SELECT
          ev.id, ev.title, ev.description, ev.starts_at, ev.ends_at,
          ev.location, ev.address, ev.image_url, ev.registration_url,
          ev.category, ev.is_featured
        FROM events ev
        WHERE ev.church_id = v_church_id
          AND ev.is_visible_on_portal = true
          AND ev.deleted_at IS NULL
          AND ev.starts_at >= now()
        ORDER BY ev.starts_at ASC
        LIMIT 4
      ) e
    ), '[]'::jsonb),
    'featuredProjects', COALESCE((
      SELECT jsonb_agg(row_to_json(p)) FROM (
        SELECT
          pr.id, pr.name, pr.description, pr.category,
          pr.image_url, pr.link_url, pr.leader_name
        FROM projects pr
        WHERE pr.church_id = v_church_id
          AND pr.is_visible_on_portal = true
          AND pr.deleted_at IS NULL
        ORDER BY pr.is_featured DESC, pr.sort_order, pr.name
        LIMIT 6
      ) p
    ), '[]'::jsonb),
    'latestPodcast', COALESCE((
      SELECT jsonb_agg(row_to_json(pe)) FROM (
        SELECT
          ep.id, ep.title, ep.season, ep.episode_number,
          ep.spotify_url, ep.apple_url, ep.youtube_url, ep.audio_url,
          ep.cover_image_url, ep.published_at, ep.duration_seconds
        FROM podcast_episodes ep
        WHERE ep.church_id = v_church_id
          AND ep.is_visible_on_portal = true
          AND ep.deleted_at IS NULL
        ORDER BY ep.season DESC NULLS LAST, ep.episode_number DESC NULLS LAST, ep.published_at DESC
        LIMIT 3
      ) pe
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END $$;

COMMENT ON FUNCTION rpc_public_portal_by_slug IS
  'Datos públicos del portal por slug. Solo si publish_status=published. church (publishable), portal published_data, campaigns/service_times/funds visibles, payment_available, y teasers de contenido (latestSermons, upcomingEvents, featuredProjects, latestPodcast).';

GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO authenticated;
