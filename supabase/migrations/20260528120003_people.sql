-- =====================================================================
-- 03 — People & Congregation
-- =====================================================================
-- people, person_tags, person_tag_assignments, households,
-- household_members, person_followups.

-- ---------- people ----------
CREATE TABLE people (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,

  person_type         TEXT NOT NULL DEFAULT 'individual'
                      CHECK (person_type IN ('individual','organization')),

  -- Individual fields
  first_name          TEXT,
  last_name           TEXT,
  date_of_birth       DATE,

  -- Organization fields
  organization_name   TEXT,

  -- Contact
  email               CITEXT,
  phone               TEXT,
  address             JSONB DEFAULT '{}'::jsonb,

  -- Classification
  status              TEXT NOT NULL DEFAULT 'visitor'
                      CHECK (status IN ('member','visitor','donor','volunteer','leader','inactive')),

  -- Lifecycle
  joined_at           DATE,
  last_activity_at    TIMESTAMPTZ,

  -- Pastoral metadata
  pastoral_note       TEXT,
  next_followup_at    DATE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT person_type_has_name CHECK (
    (person_type = 'individual'
     AND (first_name IS NOT NULL OR last_name IS NOT NULL))
    OR
    (person_type = 'organization'
     AND organization_name IS NOT NULL)
  )
);

COMMENT ON TABLE people IS 'Personas de la congregación: miembros, visitantes, donantes, organizaciones, servidores, líderes, inactivos.';
COMMENT ON COLUMN people.status IS 'Status principal para el badge UI. Múltiples roles se modelan con tags.';

-- ---------- person_tags ----------
CREATE TABLE person_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#8A6A4A',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique tag name per church (case-insensitive)
CREATE UNIQUE INDEX idx_person_tags_church_name
  ON person_tags (church_id, lower(name));

COMMENT ON TABLE person_tags IS 'Catálogo de etiquetas por iglesia. Ej: Diezmo recurrente, Coro, Líder de células.';

-- ---------- person_tag_assignments (M:N) ----------
CREATE TABLE person_tag_assignments (
  person_id    UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag_id       UUID NOT NULL REFERENCES person_tags(id) ON DELETE CASCADE,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by  UUID REFERENCES auth.users(id),
  PRIMARY KEY (person_id, tag_id)
);

-- ---------- households ----------
CREATE TABLE households (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  name               TEXT NOT NULL,
  primary_person_id  UUID REFERENCES people(id) ON DELETE SET NULL,
  address            JSONB DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

COMMENT ON TABLE households IS 'Familias/hogares. Ej: "Familia Ramírez". Una persona puede pertenecer a varios hogares.';

-- ---------- household_members ----------
CREATE TABLE household_members (
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id     UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  relationship  TEXT NOT NULL DEFAULT 'member'
                CHECK (relationship IN ('head','spouse','child','parent','sibling','grandparent','other','member')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, person_id)
);

-- ---------- person_followups ----------
CREATE TABLE person_followups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  followup_type   TEXT NOT NULL
                  CHECK (followup_type IN ('call','visit','message','note','prayer','other')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_action_at  DATE,
  title           TEXT NOT NULL,
  body            TEXT,
  is_private      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE person_followups IS 'Historial pastoral: llamadas, visitas, notas privadas. Reemplaza el campo notes plano.';
COMMENT ON COLUMN person_followups.is_private IS 'Si true, solo admin/pastor pueden leer. Default true para notas pastorales.';
