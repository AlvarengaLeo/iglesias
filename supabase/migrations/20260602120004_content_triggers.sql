-- =====================================================================
-- FASE 15 · 04 — Content triggers (updated_at + audit)
-- =====================================================================

-- ========== updated_at triggers ==========
CREATE TRIGGER trg_sermons_updated_at
  BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_podcast_updated_at
  BEFORE UPDATE ON podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== audit triggers (reusa audit_changes()) ==========
CREATE TRIGGER trg_audit_sermons
  AFTER INSERT OR UPDATE OR DELETE ON sermons
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_audit_events
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_audit_podcast
  AFTER INSERT OR UPDATE OR DELETE ON podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_changes();
