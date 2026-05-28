-- =====================================================================
-- 06 — Audit Logs
-- =====================================================================

CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  church_id       UUID REFERENCES churches(id) ON DELETE SET NULL,
  actor_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name      TEXT,
  action          TEXT NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,
  before_data     JSONB,
  after_data      JSONB,
  diff            JSONB,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Acciones sensibles. INMUTABLE. Dual: triggers DB + app-layer calls.';
COMMENT ON COLUMN audit_logs.action IS 'Formato: entity.verb. Ej: donation.create, receipt.resend, portal.publish, church_users.role_change.';
