-- =====================================================================
-- EQUIPOS · 03 — Notifications schema
-- =====================================================================
-- Notificaciones internas (campana). Destinatario = auth.users (login).
-- Único escritor: _emit_notification() (SECURITY DEFINER); RLS bloquea INSERT
-- del cliente (espejo de audit_logs). i18n: se guarda title_key + params, no
-- texto prehorneado, para re-render es/en por churches.locale.

-- ---------- service_notifications ----------
CREATE TABLE service_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL CHECK (type IN (
                      'assignment_created','assignment_updated','assignment_cancelled',
                      'replacement_needed','replacement_filled','service_reminder',
                      'chat_message','chat_mention','schedule_changed')),
  title_key         TEXT NOT NULL,
  params            JSONB NOT NULL DEFAULT '{}'::jsonb,
  collapse_key      TEXT,           -- agrupa (ej. 1 fila no-leída por sala de chat)
  dedupe_key        TEXT,           -- idempotencia dura (ej. recordatorio por ventana)
  status            TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread','read','archived')),
  service_event_id  UUID REFERENCES service_events(id)    ON DELETE SET NULL,
  assignment_id     UUID REFERENCES service_assignments(id) ON DELETE SET NULL,
  channel_id        UUID REFERENCES chat_channels(id)     ON DELETE SET NULL,
  deep_link         TEXT,           -- ej. #equipos?tab=mi-servicio
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at           TIMESTAMPTZ
  -- sin deleted_at: el ciclo es unread/read/archived; purga de archived > 90d por cron.
);

-- Feed de la campana.
CREATE INDEX idx_notifications_recipient
  ON service_notifications (recipient_user_id, status, created_at DESC);

-- Idempotencia dura (recordatorios): un destinatario nunca recibe el mismo dedupe_key dos veces.
CREATE UNIQUE INDEX idx_notifications_dedupe
  ON service_notifications (recipient_user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- Colapso (chat_message): una sola fila NO-LEÍDA por (destinatario, collapse_key).
CREATE UNIQUE INDEX idx_notifications_collapse
  ON service_notifications (recipient_user_id, collapse_key)
  WHERE collapse_key IS NOT NULL AND status = 'unread';

COMMENT ON TABLE service_notifications IS 'Notificaciones in-app. Único escritor _emit_notification(). i18n por title_key+params.';

-- ---------- service_notification_deliveries (creada; SIN USO en F1) ----------
-- Abstracción para email/push futuros: se acoplan SIN cambiar los productores.
CREATE TABLE service_notification_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  notification_id     UUID NOT NULL REFERENCES service_notifications(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL CHECK (channel IN ('email','push','sms')),
  status              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','sent','delivered','bounced','failed')),
  recipient_address   TEXT,
  provider_message_id TEXT,
  error_message       TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_deliveries_notification ON service_notification_deliveries (notification_id);

-- ---------- service_notification_prefs (creada; SIN USO en F1) ----------
CREATE TABLE service_notification_prefs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type               TEXT,  -- NULL = preferencia global por defecto
  in_app             BOOLEAN NOT NULL DEFAULT true,
  email              BOOLEAN NOT NULL DEFAULT false,
  push               BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start  TIME,
  quiet_hours_end    TIME,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (church_id, user_id, type)
);

CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON service_notification_prefs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
