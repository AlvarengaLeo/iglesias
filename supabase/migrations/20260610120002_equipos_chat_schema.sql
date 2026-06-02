-- =====================================================================
-- EQUIPOS · 02 — Chat schema (channels, members, messages, attachments, mentions)
-- =====================================================================
-- Chat de producción: canales auto (equipo/servicio/posición) + DMs 1:1,
-- adjuntos, @menciones, leído/no-leído, presencia/typing (Realtime).
-- Membresía keyed por church_users.id (el login) + user_id denormalizado para
-- el hot path de RLS. Canales SOLO se crean por triggers/RPC (cliente sin INSERT).

-- church_users necesita UNIQUE(id, church_id) para FKs compuestas de membresía.
ALTER TABLE church_users ADD CONSTRAINT church_users_id_church_uq UNIQUE (id, church_id);

-- ---------- chat_channels ----------
CREATE TABLE chat_channels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  room_type         TEXT NOT NULL CHECK (room_type IN ('team','service','position','dm')),
  team_id           UUID,
  service_event_id  UUID,
  position_id       UUID,
  dm_key            TEXT,
  name              TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (id, church_id),

  -- FKs compuestas (MATCH SIMPLE: no se exigen cuando la columna es NULL).
  FOREIGN KEY (team_id, church_id)          REFERENCES service_teams (id, church_id)     ON DELETE CASCADE,
  FOREIGN KEY (service_event_id, church_id) REFERENCES service_events (id, church_id)    ON DELETE CASCADE,
  FOREIGN KEY (position_id, church_id)      REFERENCES service_positions (id, church_id) ON DELETE CASCADE,

  -- Consistencia: cada room_type fija exactamente su referencia.
  CONSTRAINT chat_channels_ref_consistency CHECK (
    (room_type = 'team'     AND team_id IS NOT NULL AND service_event_id IS NULL AND position_id IS NULL AND dm_key IS NULL) OR
    (room_type = 'service'  AND service_event_id IS NOT NULL AND team_id IS NULL AND position_id IS NULL AND dm_key IS NULL) OR
    (room_type = 'position' AND position_id IS NOT NULL AND team_id IS NULL AND service_event_id IS NULL AND dm_key IS NULL) OR
    (room_type = 'dm'       AND dm_key IS NOT NULL AND team_id IS NULL AND service_event_id IS NULL AND position_id IS NULL)
  )
);

-- Un canal por entidad (ignorando borrados); DM único por par dentro de la iglesia.
CREATE UNIQUE INDEX idx_chat_channel_team     ON chat_channels (team_id)          WHERE room_type = 'team'     AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_chat_channel_service  ON chat_channels (service_event_id) WHERE room_type = 'service'  AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_chat_channel_position ON chat_channels (position_id)      WHERE room_type = 'position' AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_chat_channel_dm       ON chat_channels (church_id, dm_key) WHERE room_type = 'dm';

COMMENT ON TABLE chat_channels IS 'Canal de chat. room_type: team|service|position|dm. dm_key = least(cu_a,cu_b)||:||greatest(cu_a,cu_b).';

-- ---------- chat_messages ----------
-- PK BIGINT identity (orden/keyset baratos) + public_id UUID para audit/deep-link.
CREATE TABLE chat_messages (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id             UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  church_id             UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  channel_id            UUID NOT NULL,
  sender_church_user_id UUID REFERENCES church_users(id) ON DELETE SET NULL,
  sender_user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body                  TEXT,
  reply_to_message_id   BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
  client_nonce          UUID,
  edited_at             TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  FOREIGN KEY (channel_id, church_id) REFERENCES chat_channels (id, church_id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_body_len CHECK (body IS NULL OR char_length(body) <= 8000)
);

-- Realtime postgres_changes evalúa RLS sobre el payload en UPDATE/DELETE: necesita
-- la fila completa en el WAL. (Coste de WAL vigilado; ver plan §10 riesgo #2.)
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Paginación keyset por canal.
CREATE INDEX idx_chat_messages_channel ON chat_messages (channel_id, created_at DESC, id DESC);
-- Idempotencia de envío optimista.
CREATE UNIQUE INDEX idx_chat_messages_nonce ON chat_messages (channel_id, client_nonce) WHERE client_nonce IS NOT NULL;

COMMENT ON TABLE chat_messages IS 'Mensajes. soft-delete = tombstone (body NULL). edited_at marca edición. client_nonce dedupe envío optimista.';

-- ---------- chat_channel_members ----------
CREATE TABLE chat_channel_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id             UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  channel_id            UUID NOT NULL,
  church_user_id        UUID NOT NULL,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- denormalizado (hot path RLS)
  person_id             UUID,  -- display; no enforce
  is_active             BOOLEAN NOT NULL DEFAULT true,
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at            TIMESTAMPTZ,
  last_read_message_id  BIGINT REFERENCES chat_messages(id) ON DELETE SET NULL,
  last_read_at          TIMESTAMPTZ,
  muted                 BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (channel_id, church_user_id),
  FOREIGN KEY (channel_id, church_id)     REFERENCES chat_channels (id, church_id) ON DELETE CASCADE,
  FOREIGN KEY (church_user_id, church_id) REFERENCES church_users (id, church_id)  ON DELETE CASCADE
);

CREATE INDEX idx_chat_members_user    ON chat_channel_members (user_id) WHERE is_active = true;
CREATE INDEX idx_chat_members_channel ON chat_channel_members (channel_id) WHERE is_active = true;

COMMENT ON TABLE chat_channel_members IS 'Membresía de canal (login). Auto-gestionada por triggers. last_read_message_id = puntero de no-leídos.';

-- ---------- chat_attachments ----------
CREATE TABLE chat_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  message_id    BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  mime          TEXT,
  size_bytes    BIGINT,
  width         INTEGER,
  height        INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_attachments_message ON chat_attachments (message_id);

COMMENT ON TABLE chat_attachments IS 'Adjuntos de un mensaje. Archivos en bucket privado chat-media (signed URLs).';

-- ---------- chat_message_mentions ----------
CREATE TABLE chat_message_mentions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                 UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  message_id                BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  mentioned_church_user_id  UUID NOT NULL REFERENCES church_users(id) ON DELETE CASCADE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (message_id, mentioned_church_user_id)
);

CREATE INDEX idx_chat_mentions_user ON chat_message_mentions (mentioned_church_user_id);

COMMENT ON TABLE chat_message_mentions IS 'Menciones @ por mensaje. Solo se puede mencionar co-miembros del canal.';

-- ---------- updated_at triggers ----------
CREATE TRIGGER trg_chat_channels_updated_at BEFORE UPDATE ON chat_channels        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_chat_members_updated_at  BEFORE UPDATE ON chat_channel_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
