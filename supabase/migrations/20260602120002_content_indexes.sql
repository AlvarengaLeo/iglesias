-- =====================================================================
-- FASE 15 · 02 — Content indexes (parciales, estilo idx_campaigns_portal_visible)
-- =====================================================================

-- ---------- sermons ----------
CREATE INDEX idx_sermons_church_date
  ON sermons (church_id, sermon_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_sermons_portal_visible
  ON sermons (church_id, sermon_date DESC)
  WHERE is_visible_on_portal = true AND deleted_at IS NULL;

CREATE INDEX idx_sermons_church_series
  ON sermons (church_id, series, sermon_date DESC)
  WHERE series IS NOT NULL AND deleted_at IS NULL;

-- ---------- events ----------
CREATE INDEX idx_events_church_starts
  ON events (church_id, starts_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_events_portal_upcoming
  ON events (church_id, starts_at)
  WHERE is_visible_on_portal = true AND deleted_at IS NULL;

CREATE INDEX idx_events_portal_featured
  ON events (church_id, starts_at)
  WHERE is_featured = true AND is_visible_on_portal = true AND deleted_at IS NULL;

-- ---------- podcast_episodes ----------
CREATE INDEX idx_podcast_church_order
  ON podcast_episodes (church_id, season DESC NULLS LAST, episode_number DESC NULLS LAST, published_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_podcast_portal_visible
  ON podcast_episodes (church_id, published_at DESC)
  WHERE is_visible_on_portal = true AND deleted_at IS NULL;

CREATE UNIQUE INDEX idx_podcast_church_episode_unique
  ON podcast_episodes (church_id, season, episode_number)
  WHERE episode_number IS NOT NULL AND deleted_at IS NULL;

-- ---------- projects ----------
CREATE INDEX idx_projects_church_sort
  ON projects (church_id, sort_order, name)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_projects_portal_visible
  ON projects (church_id, sort_order)
  WHERE is_visible_on_portal = true AND deleted_at IS NULL;

CREATE INDEX idx_projects_portal_featured
  ON projects (church_id, sort_order)
  WHERE is_featured = true AND is_visible_on_portal = true AND deleted_at IS NULL;
