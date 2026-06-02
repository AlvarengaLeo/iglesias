-- =====================================================================
-- FASE 15 · 01 — Content tables: sermons, events, podcast_episodes, projects
-- =====================================================================
-- Contenido público del portal "presencia de iglesia". Media (video/audio)
-- se EMBEBE externamente (YouTube/Vimeo/Spotify/Apple) — se guardan solo URLs,
-- nunca archivos. Solo thumbnails/covers/imágenes van al bucket church-assets.
--
-- Spine común (convención funds/campaigns):
--   id, church_id (ON DELETE RESTRICT), is_visible_on_portal, sort_order,
--   created_at/updated_at, created_by, deleted_at (soft delete).
--
-- speaker / leader_name son TEXT libre (NO FK a people) para desacoplar el
-- contenido público de PII de miembros.

-- ---------- sermons ----------
CREATE TABLE sermons (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id            UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  title                TEXT NOT NULL,
  speaker              TEXT,
  series               TEXT,
  scripture_reference  TEXT,
  sermon_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  description          TEXT,
  video_url            TEXT,                       -- YouTube/Vimeo (embed en render)
  audio_url            TEXT,                       -- audio externo opcional
  thumbnail_url        TEXT,                       -- church-assets (kind=sermon_thumb)
  duration_seconds     INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  is_visible_on_portal BOOLEAN NOT NULL DEFAULT false,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES auth.users(id),
  deleted_at           TIMESTAMPTZ,
  CONSTRAINT sermon_has_media CHECK (video_url IS NOT NULL OR audio_url IS NOT NULL)
);

COMMENT ON TABLE sermons IS 'Archivo de sermones/predicaciones. Media embebida externamente (video_url/audio_url). Visible públicamente si is_visible_on_portal y portal published.';

-- ---------- events ----------
CREATE TABLE events (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id            UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  title                TEXT NOT NULL,
  description          TEXT,
  starts_at            TIMESTAMPTZ NOT NULL,
  ends_at              TIMESTAMPTZ,
  location             TEXT,                        -- nombre del lugar
  address              TEXT,                        -- dirección pública single-line (NO el JSONB privado de churches)
  image_url            TEXT,                        -- church-assets (kind=event_image)
  registration_url     TEXT,                        -- link externo de registro/RSVP (no embed)
  category             TEXT,
  is_featured          BOOLEAN NOT NULL DEFAULT false,
  is_visible_on_portal BOOLEAN NOT NULL DEFAULT false,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES auth.users(id),
  deleted_at           TIMESTAMPTZ,
  CONSTRAINT event_dates_valid CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

COMMENT ON TABLE events IS 'Actividades/eventos de la iglesia. registration_url es link externo. address es público single-line.';

-- ---------- podcast_episodes ----------
CREATE TABLE podcast_episodes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id            UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  title                TEXT NOT NULL,
  description          TEXT,
  season               INTEGER CHECK (season IS NULL OR season > 0),
  episode_number       INTEGER CHECK (episode_number IS NULL OR episode_number > 0),
  spotify_url          TEXT,
  apple_url            TEXT,
  youtube_url          TEXT,
  audio_url            TEXT,
  cover_image_url      TEXT,                        -- church-assets (kind=podcast_cover)
  published_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds     INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  is_visible_on_portal BOOLEAN NOT NULL DEFAULT false,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES auth.users(id),
  deleted_at           TIMESTAMPTZ
);

COMMENT ON TABLE podcast_episodes IS 'Episodios de podcast. Audio embebido (Spotify/Apple/YouTube). UNIQUE (church_id, season, episode_number) parcial en migración de índices.';

-- ---------- projects (Projects / Ministries) ----------
CREATE TABLE projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id            UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  name                 TEXT NOT NULL,
  description          TEXT,
  category             TEXT NOT NULL DEFAULT 'ministry'
                       CHECK (category IN ('ministry','project','mission')),
  image_url            TEXT,                        -- church-assets (kind=project_image)
  link_url             TEXT,                        -- link externo de info/donación
  leader_name          TEXT,
  is_featured          BOOLEAN NOT NULL DEFAULT false,
  is_visible_on_portal BOOLEAN NOT NULL DEFAULT false,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES auth.users(id),
  deleted_at           TIMESTAMPTZ
);

COMMENT ON TABLE projects IS 'Proyectos/ministerios de la iglesia (distintos de campañas de recaudación). category: ministry|project|mission.';
