-- =====================================================================
-- FASE 15 · 05 — Public content RPCs (archivos paginados)
-- =====================================================================
-- RPCs SECURITY DEFINER para las páginas dedicadas de archivo (Sermons, Podcast).
-- Mismo contrato de seguridad que rpc_public_portal_by_slug:
--   - resuelven church_id desde slug (lower/btrim, deleted_at IS NULL)
--   - exigen portal_settings.publish_status='published' (si no → NULL)
--   - solo filas is_visible_on_portal=true AND deleted_at IS NULL
--   - whitelist de columnas (sin created_by/deleted_at/internal)
--   - GRANT EXECUTE a anon + authenticated

-- ---------- rpc_public_sermons_by_slug ----------
CREATE OR REPLACE FUNCTION rpc_public_sermons_by_slug(
  p_slug   TEXT,
  p_limit  INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0,
  p_series TEXT    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_limit  INTEGER := LEAST(GREATEST(COALESCE(p_limit, 12), 1), 50);
  v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  v_series TEXT    := NULLIF(btrim(COALESCE(p_series, '')), '');
  v_total  INTEGER;
  v_items  JSONB;
  v_series_list JSONB;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_church_id
  FROM churches
  WHERE slug = lower(btrim(p_slug)) AND deleted_at IS NULL;

  IF v_church_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings WHERE church_id = v_church_id;

  IF NOT COALESCE(v_published, false) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM sermons s
  WHERE s.church_id = v_church_id
    AND s.is_visible_on_portal = true
    AND s.deleted_at IS NULL
    AND (v_series IS NULL OR s.series = v_series);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT
      s.id, s.title, s.speaker, s.series, s.scripture_reference,
      s.sermon_date, s.description, s.video_url, s.audio_url,
      s.thumbnail_url, s.duration_seconds
    FROM sermons s
    WHERE s.church_id = v_church_id
      AND s.is_visible_on_portal = true
      AND s.deleted_at IS NULL
      AND (v_series IS NULL OR s.series = v_series)
    ORDER BY s.sermon_date DESC, s.sort_order, s.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) t;

  -- Lista de series distintas (para el filtro), solo de sermones visibles.
  SELECT COALESCE(jsonb_agg(series ORDER BY series), '[]'::jsonb) INTO v_series_list
  FROM (
    SELECT DISTINCT s.series
    FROM sermons s
    WHERE s.church_id = v_church_id
      AND s.is_visible_on_portal = true
      AND s.deleted_at IS NULL
      AND s.series IS NOT NULL
  ) d;

  RETURN jsonb_build_object(
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset,
    'series', v_series_list,
    'items',  v_items
  );
END $$;

COMMENT ON FUNCTION rpc_public_sermons_by_slug IS 'Archivo público paginado de sermones por slug. Solo si portal published. Devuelve {total, limit, offset, series[], items[]}.';

GRANT EXECUTE ON FUNCTION rpc_public_sermons_by_slug(TEXT, INTEGER, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_sermons_by_slug(TEXT, INTEGER, INTEGER, TEXT) TO authenticated;

-- ---------- rpc_public_sermon_by_id ----------
-- Detalle de un sermón individual (para deep-link #/sermon/:id). Mismo gating.
CREATE OR REPLACE FUNCTION rpc_public_sermon_by_id(
  p_slug TEXT,
  p_id   UUID
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_item JSONB;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 OR p_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_church_id
  FROM churches
  WHERE slug = lower(btrim(p_slug)) AND deleted_at IS NULL;

  IF v_church_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings WHERE church_id = v_church_id;

  IF NOT COALESCE(v_published, false) THEN
    RETURN NULL;
  END IF;

  SELECT row_to_json(t) INTO v_item
  FROM (
    SELECT
      s.id, s.title, s.speaker, s.series, s.scripture_reference,
      s.sermon_date, s.description, s.video_url, s.audio_url,
      s.thumbnail_url, s.duration_seconds
    FROM sermons s
    WHERE s.id = p_id
      AND s.church_id = v_church_id
      AND s.is_visible_on_portal = true
      AND s.deleted_at IS NULL
  ) t;

  RETURN v_item;  -- NULL si no existe / no visible
END $$;

COMMENT ON FUNCTION rpc_public_sermon_by_id IS 'Detalle público de un sermón por id (validando slug + portal published + visible). NULL si no aplica.';

GRANT EXECUTE ON FUNCTION rpc_public_sermon_by_id(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_sermon_by_id(TEXT, UUID) TO authenticated;

-- ---------- rpc_public_podcast_by_slug ----------
CREATE OR REPLACE FUNCTION rpc_public_podcast_by_slug(
  p_slug   TEXT,
  p_limit  INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_limit  INTEGER := LEAST(GREATEST(COALESCE(p_limit, 12), 1), 50);
  v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  v_total  INTEGER;
  v_items  JSONB;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_church_id
  FROM churches
  WHERE slug = lower(btrim(p_slug)) AND deleted_at IS NULL;

  IF v_church_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings WHERE church_id = v_church_id;

  IF NOT COALESCE(v_published, false) THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM podcast_episodes e
  WHERE e.church_id = v_church_id
    AND e.is_visible_on_portal = true
    AND e.deleted_at IS NULL;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT
      e.id, e.title, e.description, e.season, e.episode_number,
      e.spotify_url, e.apple_url, e.youtube_url, e.audio_url,
      e.cover_image_url, e.published_at, e.duration_seconds
    FROM podcast_episodes e
    WHERE e.church_id = v_church_id
      AND e.is_visible_on_portal = true
      AND e.deleted_at IS NULL
    ORDER BY e.season DESC NULLS LAST, e.episode_number DESC NULLS LAST, e.published_at DESC
    LIMIT v_limit OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'total',  v_total,
    'limit',  v_limit,
    'offset', v_offset,
    'items',  v_items
  );
END $$;

COMMENT ON FUNCTION rpc_public_podcast_by_slug IS 'Archivo público paginado de episodios de podcast por slug. Solo si portal published. Devuelve {total, limit, offset, items[]}.';

GRANT EXECUTE ON FUNCTION rpc_public_podcast_by_slug(TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_podcast_by_slug(TEXT, INTEGER, INTEGER) TO authenticated;

-- ---------- rpc_public_events_by_slug ----------
-- Página /events: todos los eventos visibles próximos (starts_at >= now()) ASC.
CREATE OR REPLACE FUNCTION rpc_public_events_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_items JSONB;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN RETURN NULL; END IF;

  SELECT id INTO v_church_id FROM churches
  WHERE slug = lower(btrim(p_slug)) AND deleted_at IS NULL;
  IF v_church_id IS NULL THEN RETURN NULL; END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings WHERE church_id = v_church_id;
  IF NOT COALESCE(v_published, false) THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_items
  FROM (
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
  ) t;

  RETURN jsonb_build_object('items', v_items);
END $$;

COMMENT ON FUNCTION rpc_public_events_by_slug IS 'Eventos públicos próximos (starts_at >= now()) por slug. Solo si portal published.';

GRANT EXECUTE ON FUNCTION rpc_public_events_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_events_by_slug(TEXT) TO authenticated;

-- ---------- rpc_public_projects_by_slug ----------
-- Página /ministries: todos los proyectos/ministerios visibles.
CREATE OR REPLACE FUNCTION rpc_public_projects_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_items JSONB;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN RETURN NULL; END IF;

  SELECT id INTO v_church_id FROM churches
  WHERE slug = lower(btrim(p_slug)) AND deleted_at IS NULL;
  IF v_church_id IS NULL THEN RETURN NULL; END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings WHERE church_id = v_church_id;
  IF NOT COALESCE(v_published, false) THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT
      pr.id, pr.name, pr.description, pr.category,
      pr.image_url, pr.link_url, pr.leader_name
    FROM projects pr
    WHERE pr.church_id = v_church_id
      AND pr.is_visible_on_portal = true
      AND pr.deleted_at IS NULL
    ORDER BY pr.is_featured DESC, pr.sort_order, pr.name
  ) t;

  RETURN jsonb_build_object('items', v_items);
END $$;

COMMENT ON FUNCTION rpc_public_projects_by_slug IS 'Proyectos/ministerios públicos visibles por slug. Solo si portal published.';

GRANT EXECUTE ON FUNCTION rpc_public_projects_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_projects_by_slug(TEXT) TO authenticated;
