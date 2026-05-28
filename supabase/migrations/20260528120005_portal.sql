-- =====================================================================
-- 05 — Portal Público
-- =====================================================================
-- portal_settings: una fila por iglesia con draft_data + published_data
-- service_times:   horarios de culto/reuniones

-- ---------- portal_settings ----------
CREATE TABLE portal_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL UNIQUE REFERENCES churches(id) ON DELETE CASCADE,

  publish_status      TEXT NOT NULL DEFAULT 'draft'
                      CHECK (publish_status IN ('draft','published','unsaved_changes')),

  draft_data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_data      JSONB NOT NULL DEFAULT '{}'::jsonb,

  published_at        TIMESTAMPTZ,
  published_by        UUID REFERENCES auth.users(id),
  draft_updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  draft_updated_by    UUID REFERENCES auth.users(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE portal_settings IS 'Una fila por iglesia. draft_data y published_data son JSONB con la misma estructura. Publicar copia draft → published.';
COMMENT ON COLUMN portal_settings.draft_data IS 'Estructura: { identity: {...}, hero: {...}, donations: {...}, contact: {...} }. service_times y campañas visibles viven en sus propias tablas.';

-- ---------- service_times ----------
CREATE TABLE service_times (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time    TIME NOT NULL,
  duration_min  INTEGER DEFAULT 90 CHECK (duration_min > 0),
  meeting_type  TEXT NOT NULL,
  location      TEXT,
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_times IS 'Horarios públicos. day_of_week: 0=Domingo, 1=Lunes ... 6=Sábado.';
