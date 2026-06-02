-- =====================================================================
-- EQUIPOS · 01 — Serving schema (events, teams, positions, members, assignments)
-- =====================================================================
-- Módulo "Equipos" (Teams): planificador de servicios + asignaciones.
-- Patrón idéntico al resto del repo: church_id NOT NULL, soft-delete via
-- deleted_at, set_updated_at trigger, RLS en archivo aparte (…_05_helpers_rls).
--
-- Aislamiento multi-tenant DECLARATIVO: cada tabla hija lleva church_id
-- denormalizado y una FK COMPUESTA (parent_id, church_id) -> parent(id, church_id),
-- de modo que es imposible enlazar filas de iglesias distintas. Esto exige
-- UNIQUE(id, church_id) en cada padre (incluida people).

-- people necesita UNIQUE(id, church_id) para ser referenciada por FK compuesta.
ALTER TABLE people ADD CONSTRAINT people_id_church_uq UNIQUE (id, church_id);

-- ---------- service_events ----------
CREATE TABLE service_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  service_type    TEXT NOT NULL DEFAULT 'culto_general'
                  CHECK (service_type IN (
                    'culto_general','servicio_hispano','servicio_ingles','jovenes',
                    'ninos','estudio_biblico','vigilia','ensayo','evento_especial')),
  language        TEXT CHECK (language IS NULL OR language IN ('es','en','mixed')),
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ,
  location        TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('draft','scheduled','completed','cancelled')),
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT service_events_end_after_start
    CHECK (end_datetime IS NULL OR end_datetime >= start_datetime),
  UNIQUE (id, church_id)
);

COMMENT ON TABLE service_events IS 'Un culto/servicio/reunión planificado. status: draft|scheduled|completed|cancelled.';

-- ---------- service_teams ----------
CREATE TABLE service_teams (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id         UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  -- leader: FK simple (no compuesta) porque ON DELETE SET NULL no puede nulear church_id NOT NULL.
  leader_person_id  UUID REFERENCES people(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  UNIQUE (id, church_id)
);

-- Nombre de equipo único por iglesia (case-insensitive), ignorando borrados.
CREATE UNIQUE INDEX idx_service_teams_church_name
  ON service_teams (church_id, lower(name))
  WHERE deleted_at IS NULL;

COMMENT ON TABLE service_teams IS 'Equipos ministeriales (Alabanza, Multimedia, Ujieres, ...).';

-- ---------- service_positions ----------
CREATE TABLE service_positions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  team_id       UUID NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (id, church_id),
  FOREIGN KEY (team_id, church_id)
    REFERENCES service_teams (id, church_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_service_positions_team_name
  ON service_positions (team_id, lower(name));

COMMENT ON TABLE service_positions IS 'Posiciones/roles dentro de un equipo (Guitarrista, Baterista, Ujier, ...).';

-- ---------- service_team_members ----------
CREATE TABLE service_team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL,
  person_id   UUID NOT NULL,
  team_role   TEXT NOT NULL DEFAULT 'member'
              CHECK (team_role IN ('leader','assistant','member')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (team_id, person_id),
  FOREIGN KEY (team_id, church_id)
    REFERENCES service_teams (id, church_id) ON DELETE CASCADE,
  FOREIGN KEY (person_id, church_id)
    REFERENCES people (id, church_id) ON DELETE CASCADE
);

COMMENT ON TABLE service_team_members IS 'Pertenencia persona↔equipo. Dispara auto-membresía al canal de chat del equipo.';

-- ---------- service_assignments ----------
CREATE TABLE service_assignments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                 UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  service_event_id          UUID NOT NULL,
  team_id                   UUID NOT NULL,
  position_id               UUID NOT NULL,
  person_id                 UUID NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','confirmed','declined','needs_replacement','replaced','cancelled')),
  arrival_time              TIME,
  notes                     TEXT,
  assigned_by               UUID REFERENCES auth.users(id),
  replaced_by_assignment_id UUID REFERENCES service_assignments(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ,

  UNIQUE (id, church_id),
  FOREIGN KEY (service_event_id, church_id)
    REFERENCES service_events (id, church_id) ON DELETE CASCADE,
  FOREIGN KEY (team_id, church_id)
    REFERENCES service_teams (id, church_id) ON DELETE CASCADE,
  FOREIGN KEY (position_id, church_id)
    REFERENCES service_positions (id, church_id) ON DELETE CASCADE,
  FOREIGN KEY (person_id, church_id)
    REFERENCES people (id, church_id) ON DELETE CASCADE
);

-- Una asignación ACTIVA única por (evento, posición, persona). Permite reasignar
-- tras cancelar/reemplazar (esos estados quedan fuera del índice).
CREATE UNIQUE INDEX idx_service_assignments_active
  ON service_assignments (service_event_id, position_id, person_id)
  WHERE deleted_at IS NULL AND status NOT IN ('cancelled','replaced');

COMMENT ON TABLE service_assignments IS 'Asignación de una persona a una posición en un servicio. Estado vía rpc_respond_assignment / rpc_assignment_transition.';

-- ---------- service_assignment_responses (historial append-only) ----------
CREATE TABLE service_assignment_responses (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id      UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  assignment_id  UUID NOT NULL,
  from_status    TEXT,
  to_status      TEXT NOT NULL,
  actor_user_id  UUID REFERENCES auth.users(id),
  reason         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  FOREIGN KEY (assignment_id, church_id)
    REFERENCES service_assignments (id, church_id) ON DELETE CASCADE
);

COMMENT ON TABLE service_assignment_responses IS 'Historial inmutable de transiciones de estado de una asignación.';

-- ---------- indexes (calendario / consultas frecuentes) ----------
CREATE INDEX idx_service_events_church_start ON service_events (church_id, start_datetime DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_teams_church         ON service_teams (church_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_service_positions_team       ON service_positions (team_id);
CREATE INDEX idx_team_members_team            ON service_team_members (team_id) WHERE is_active = true;
CREATE INDEX idx_team_members_person          ON service_team_members (church_id, person_id) WHERE is_active = true;
CREATE INDEX idx_assignments_event            ON service_assignments (service_event_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_person           ON service_assignments (church_id, person_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_team             ON service_assignments (team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignment_responses_assignment ON service_assignment_responses (assignment_id, created_at DESC);

-- ---------- updated_at triggers ----------
CREATE TRIGGER trg_service_events_updated_at      BEFORE UPDATE ON service_events       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_teams_updated_at       BEFORE UPDATE ON service_teams        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_positions_updated_at   BEFORE UPDATE ON service_positions    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_team_members_updated_at        BEFORE UPDATE ON service_team_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_service_assignments_updated_at BEFORE UPDATE ON service_assignments  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
