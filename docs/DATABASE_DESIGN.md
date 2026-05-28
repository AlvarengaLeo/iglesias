# DATABASE_DESIGN.md

> Diseño completo de la base de datos PostgreSQL/Supabase. Para el **por qué** ver `ARCHITECTURE.md`. Para los **comandos** ver `SUPABASE_SETUP.md`.

---

## 1. Convenciones globales

| Aspecto | Decisión |
|---|---|
| Casing | `snake_case` para tablas y columnas |
| PKs | `id UUID DEFAULT gen_random_uuid()` |
| Tenant scope | `church_id UUID NOT NULL REFERENCES churches(id)` en cada tabla scoped |
| Timestamps | `TIMESTAMPTZ` siempre. `created_at`, `updated_at` (trigger) en cada tabla |
| Money | `BIGINT` cents + `currency CHAR(3) DEFAULT 'USD'` |
| Estados | `TEXT` con `CHECK (val IN (...))` |
| Soft delete | `deleted_at TIMESTAMPTZ` en entidades editables |
| Audit | Trigger DB + app-layer combinado |
| Extensiones | `pg_trgm` (búsqueda), `citext` (email case-insensitive), `pgcrypto` (gen_random_uuid) |

---

## 2. ERD ASCII

```
┌──────────────┐         ┌──────────────────┐
│  churches    │←────────│  church_users    │
│  (id, ...)   │         │  (user_id, role) │
└──────┬───────┘         └─────────┬────────┘
       │                           │
       │  church_id                │  user_id FK auth.users
       │                           │
       ├──── church_invitations    │
       │                           │
       ├──── people ───────────────┼──── person_followups (created_by → user)
       │      │                    │
       │      ├── person_tag_assignments ──── person_tags
       │      └── household_members ────── households
       │
       ├──── funds ─────────────── campaigns
       │      │                       │
       │      └──── donations ────────┘
       │              │
       │              ├── recurring_donation_profiles
       │              │
       │              └── contribution_receipts
       │                       │
       │                       └── receipt_deliveries
       │
       ├──── portal_settings (1:1)
       ├──── service_times
       ├──── church_receipt_sequences
       └──── audit_logs
```

---

## 3. Tablas

### 3.1 churches
Datos legales, públicos y administrativos de la iglesia. Una fila = un tenant.

```sql
CREATE TABLE churches (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name               TEXT NOT NULL,
  public_name              TEXT NOT NULL,
  slug                     CITEXT UNIQUE NOT NULL,
  ein                      TEXT,                          -- Federal Tax ID (US)
  address                  JSONB NOT NULL DEFAULT '{}',   -- {street, city, state, zip, country}
  phone                    TEXT,
  email                    CITEXT,
  pastor_name              TEXT,                          -- denormalized snapshot for receipts
  treasurer_name           TEXT,
  primary_color            TEXT DEFAULT '#1F2B38',
  logo_url                 TEXT,
  timezone                 TEXT NOT NULL DEFAULT 'America/New_York',
  locale                   TEXT NOT NULL DEFAULT 'es' CHECK (locale IN ('es','en')),

  -- Stripe Connect (Phase 4+)
  stripe_account_id        TEXT,
  stripe_charges_enabled   BOOLEAN DEFAULT false,

  -- Receipt template fields (used by receipt PDF generator)
  receipt_authorized_rep   TEXT,
  receipt_default_message  TEXT,
  receipt_fiscal_notice    TEXT DEFAULT 'No se entregaron bienes ni servicios a cambio de esta contribución, excepto beneficios religiosos intangibles.',
  receipt_include_signature BOOLEAN DEFAULT false,

  -- Subscription (placeholder; integrates with Stripe Customer Portal in v2)
  plan                     TEXT NOT NULL DEFAULT 'ministerio' CHECK (plan IN ('ministerio','comunidad','enterprise')),
  plan_status              TEXT NOT NULL DEFAULT 'active' CHECK (plan_status IN ('active','past_due','canceled','trialing')),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);
```

### 3.2 church_users
M:N entre `auth.users` (Supabase) y `churches`, con rol específico por iglesia.

```sql
CREATE TABLE church_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_snapshot CITEXT NOT NULL,            -- denormalized from auth.users.email
  full_name     TEXT,                        -- editable display name within the church
  role          TEXT NOT NULL CHECK (role IN ('admin','pastor','treasurer','secretary','leader','viewer')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  invited_at    TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (church_id, user_id)
);
```

### 3.3 church_invitations
Tokens pendientes de invitación.

```sql
CREATE TABLE church_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  email           CITEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin','pastor','treasurer','secretary','leader','viewer')),
  token           UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by      UUID NOT NULL REFERENCES auth.users(id),
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at     TIMESTAMPTZ,
  accepted_by     UUID REFERENCES auth.users(id),
  revoked_at      TIMESTAMPTZ,
  UNIQUE (church_id, email) WHERE accepted_at IS NULL AND revoked_at IS NULL
);
```

### 3.4 people
Personas de la congregación: miembros, visitantes, donantes, servidores, líderes, inactivos, y organizaciones donantes.

```sql
CREATE TABLE people (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,

  person_type         TEXT NOT NULL DEFAULT 'individual'
                      CHECK (person_type IN ('individual','organization')),

  -- Individual
  first_name          TEXT,
  last_name           TEXT,
  date_of_birth       DATE,

  -- Organization (when person_type='organization')
  organization_name   TEXT,

  -- Contact
  email               CITEXT,
  phone               TEXT,
  address             JSONB DEFAULT '{}',

  -- Classification
  status              TEXT NOT NULL DEFAULT 'visitor'
                      CHECK (status IN ('member','visitor','donor','volunteer','leader','inactive')),

  -- Lifecycle
  joined_at           DATE,
  last_activity_at    TIMESTAMPTZ,

  -- Pastoral metadata
  pastoral_note       TEXT,         -- short summary; longer notes in person_followups
  next_followup_at    DATE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,

  CHECK (
    (person_type = 'individual' AND (first_name IS NOT NULL OR last_name IS NOT NULL))
    OR (person_type = 'organization' AND organization_name IS NOT NULL)
  )
);
```

### 3.5 person_tags
Catálogo de etiquetas por iglesia.

```sql
CREATE TABLE person_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT DEFAULT '#8A6A4A',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (church_id, lower(name))
);
```

### 3.6 person_tag_assignments
M:N people ↔ tags.

```sql
CREATE TABLE person_tag_assignments (
  person_id   UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES person_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  PRIMARY KEY (person_id, tag_id)
);
```

### 3.7 households
Familias / hogares.

```sql
CREATE TABLE households (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id          UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  name               TEXT NOT NULL,                              -- "Familia Ramírez"
  primary_person_id  UUID REFERENCES people(id) ON DELETE SET NULL,
  address            JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);
```

### 3.8 household_members

```sql
CREATE TABLE household_members (
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  person_id     UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  relationship  TEXT NOT NULL DEFAULT 'member'
                CHECK (relationship IN ('head','spouse','child','parent','sibling','grandparent','other')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, person_id)
);
```

### 3.9 person_followups
Historial pastoral: llamadas, visitas, notas privadas.

```sql
CREATE TABLE person_followups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  person_id       UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  followup_type   TEXT NOT NULL CHECK (followup_type IN ('call','visit','message','note','prayer','other')),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_action_at  DATE,                       -- when to follow up again
  title           TEXT NOT NULL,
  body            TEXT,
  is_private      BOOLEAN NOT NULL DEFAULT true,  -- pastoral notes are private by default
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id)
);
```

### 3.10 funds
Catálogo de fondos contables por iglesia.

```sql
CREATE TABLE funds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id   UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,                  -- short code: 'GENERAL', 'MISSIONS', etc.
  description TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (church_id, lower(code)),
  UNIQUE (church_id, lower(name))
);
```

Sólo una fila por iglesia puede tener `is_default = true` (constraint via partial unique index, ver §4).

### 3.11 campaigns

```sql
CREATE TABLE campaigns (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id              UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  fund_id                UUID REFERENCES funds(id) ON DELETE SET NULL,  -- optional association
  name                   TEXT NOT NULL,
  slug                   TEXT NOT NULL,
  description            TEXT,
  goal_cents             BIGINT NOT NULL CHECK (goal_cents > 0),
  currency               CHAR(3) NOT NULL DEFAULT 'USD',
  start_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date               DATE,
  status                 TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','active','closed','archived')),
  is_visible_on_portal   BOOLEAN NOT NULL DEFAULT false,
  image_url              TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             UUID REFERENCES auth.users(id),
  deleted_at             TIMESTAMPTZ,
  UNIQUE (church_id, slug)
);
```

`collected_cents` NO se almacena. Se obtiene desde `vw_campaign_progress` (ver §5).

### 3.12 donations
Cada pago/donación individual.

```sql
CREATE TABLE donations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                   UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  donor_person_id             UUID REFERENCES people(id) ON DELETE SET NULL,  -- nullable for anonymous
  donor_name_snapshot         TEXT NOT NULL,    -- captured at donation time
  donor_email_snapshot        CITEXT,
  is_anonymous                BOOLEAN NOT NULL DEFAULT false,

  fund_id                     UUID NOT NULL REFERENCES funds(id) ON DELETE RESTRICT,
  campaign_id                 UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  recurring_profile_id        UUID REFERENCES recurring_donation_profiles(id) ON DELETE SET NULL,

  amount_cents                BIGINT NOT NULL CHECK (amount_cents > 0),
  processing_fee_cents        BIGINT NOT NULL DEFAULT 0 CHECK (processing_fee_cents >= 0),
  currency                    CHAR(3) NOT NULL DEFAULT 'USD',

  payment_method              TEXT NOT NULL
                              CHECK (payment_method IN ('card','ach','cash','check','stripe','other')),
  payment_status              TEXT NOT NULL DEFAULT 'pending'
                              CHECK (payment_status IN ('pending','paid','failed','refunded','disputed')),
  frequency                   TEXT NOT NULL DEFAULT 'one_time'
                              CHECK (frequency IN ('one_time','monthly','annual')),

  donation_date               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Stripe (nullable; populated when payment_method='stripe' or 'card' via Stripe)
  stripe_payment_intent_id    TEXT,
  stripe_charge_id            TEXT,

  -- Other methods
  check_number                TEXT,

  notes                       TEXT,
  internal_notes              TEXT,             -- only staff sees this

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID REFERENCES auth.users(id),
  updated_by                  UUID REFERENCES auth.users(id),
  deleted_at                  TIMESTAMPTZ
);
```

### 3.13 recurring_donation_profiles
Intención recurrente. Cada cobro exitoso genera una fila en `donations`.

```sql
CREATE TABLE recurring_donation_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  donor_person_id          UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  fund_id                  UUID NOT NULL REFERENCES funds(id) ON DELETE RESTRICT,
  campaign_id              UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  amount_cents             BIGINT NOT NULL CHECK (amount_cents > 0),
  currency                 CHAR(3) NOT NULL DEFAULT 'USD',
  frequency                TEXT NOT NULL CHECK (frequency IN ('monthly','annual')),
  payment_method           TEXT NOT NULL CHECK (payment_method IN ('card','ach','stripe','other')),

  -- Stripe
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT UNIQUE,

  status                   TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active','paused','canceled','past_due')),
  started_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_charge_date         DATE,
  canceled_at              TIMESTAMPTZ,
  cancel_reason            TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.14 contribution_receipts
Comprobantes. Tipo `per_donation` (1:1 con donation) o `annual_statement` (agregado por donor/año).

```sql
CREATE TABLE contribution_receipts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  receipt_number      TEXT NOT NULL,                   -- e.g., '2026-000127'
  receipt_type        TEXT NOT NULL DEFAULT 'per_donation'
                      CHECK (receipt_type IN ('per_donation','annual_statement')),

  -- For per_donation
  donation_id         UUID REFERENCES donations(id) ON DELETE RESTRICT,

  -- For annual_statement
  tax_year            SMALLINT,
  total_amount_cents  BIGINT NOT NULL CHECK (total_amount_cents > 0),
  donations_count     INTEGER NOT NULL DEFAULT 1,

  person_id           UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  person_name_snapshot TEXT NOT NULL,
  person_email_snapshot CITEXT,

  -- PDF storage
  pdf_storage_path    TEXT,            -- supabase storage path
  pdf_generated_at    TIMESTAMPTZ,

  status              TEXT NOT NULL DEFAULT 'generated'
                      CHECK (status IN ('generated','sent','failed','superseded','void')),

  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id),

  UNIQUE (church_id, receipt_number),
  CHECK (
    (receipt_type = 'per_donation' AND donation_id IS NOT NULL AND tax_year IS NULL)
    OR
    (receipt_type = 'annual_statement' AND donation_id IS NULL AND tax_year IS NOT NULL)
  )
);
```

**Inmutable**: no se borra ni se modifica el cuerpo después de `created_at`. Si se necesita corregir, se genera uno nuevo y se marca el anterior como `superseded`.

### 3.15 receipt_deliveries
Cada envío o reenvío. **Inmutable**.

```sql
CREATE TABLE receipt_deliveries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  receipt_id          UUID NOT NULL REFERENCES contribution_receipts(id) ON DELETE RESTRICT,

  delivery_channel    TEXT NOT NULL DEFAULT 'email'
                      CHECK (delivery_channel IN ('email','sms','whatsapp','manual')),
  recipient_email     CITEXT,
  recipient_phone     TEXT,

  reason              TEXT NOT NULL DEFAULT 'initial'
                      CHECK (reason IN ('initial','donor_lost','email_changed','accountant_request','year_end_resend','correction','other')),
  reason_notes        TEXT,

  status              TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued','sent','delivered','bounced','failed','complained')),
  external_message_id TEXT,           -- Resend message ID
  error_message       TEXT,

  sent_by             UUID REFERENCES auth.users(id),
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.16 church_receipt_sequences
Contador atómico por (church_id, year). Usado por `rpc_assign_receipt_number()`.

```sql
CREATE TABLE church_receipt_sequences (
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  tax_year      SMALLINT NOT NULL,
  next_number   INTEGER NOT NULL DEFAULT 1,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, tax_year)
);
```

### 3.17 portal_settings
Una fila por iglesia. Draft/published patrón via dos columnas JSONB.

```sql
CREATE TABLE portal_settings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id           UUID NOT NULL UNIQUE REFERENCES churches(id) ON DELETE CASCADE,

  publish_status      TEXT NOT NULL DEFAULT 'draft'
                      CHECK (publish_status IN ('draft','published','unsaved_changes')),

  draft_data          JSONB NOT NULL DEFAULT '{}',
  published_data      JSONB NOT NULL DEFAULT '{}',

  published_at        TIMESTAMPTZ,
  published_by        UUID REFERENCES auth.users(id),
  draft_updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  draft_updated_by    UUID REFERENCES auth.users(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Estructura de `draft_data` / `published_data`** (JSON schema documentado en MODULE_REQUIREMENTS.md §Portal):
```json
{
  "identity": {
    "logo_url": "...",
    "public_name": "Casa de Restauración",
    "primary_color": "#8A6A4A"
  },
  "hero": {
    "title": "Una casa de fe...",
    "message": "Somos una iglesia hispana...",
    "image_url": "...",
    "cta_text": "Donar ahora"
  },
  "donations": {
    "button_text": "Donar ahora",
    "default_fund_id": "uuid",
    "show_recurring": true,
    "visible_frequencies": ["one_time","monthly","annual"]
  },
  "contact": {
    "address": "...",
    "phone": "...",
    "email": "...",
    "map_url": "...",
    "social": {
      "facebook": "@...",
      "instagram": "@...",
      "youtube": "@...",
      "whatsapp": "@..."
    }
  }
}
```

`service_times` y `campaigns visibles` viven en sus propias tablas, no en JSON.

### 3.18 service_times
Horarios de culto/reuniones.

```sql
CREATE TABLE service_times (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id     UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
  start_time    TIME NOT NULL,
  duration_min  INTEGER DEFAULT 90,
  meeting_type  TEXT NOT NULL,                -- "Servicio dominical", "Estudio bíblico", etc.
  location      TEXT,                          -- "Sede principal", "Online", etc.
  address       TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.19 audit_logs
Acciones sensibles. **Inmutable**.

```sql
CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  church_id       UUID REFERENCES churches(id) ON DELETE SET NULL,
  actor_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name      TEXT,                       -- snapshot
  action          TEXT NOT NULL,              -- 'donation.create', 'receipt.resend', etc.
  entity_type     TEXT,                       -- 'donation', 'receipt', 'portal', etc.
  entity_id       UUID,
  before_data     JSONB,
  after_data      JSONB,
  diff            JSONB,                      -- computed: changed fields
  metadata        JSONB,                      -- additional context (ip, user_agent, reason)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Particionar por `created_at` (mensual) si supera ~10M filas** — no se hace en v1.

---

## 4. Índices

```sql
-- ========== Tenant base ==========
-- people
CREATE INDEX idx_people_church_status ON people (church_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_people_church_last_activity ON people (church_id, last_activity_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_people_email_lower ON people (church_id, lower(email::text)) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_people_phone ON people (church_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_people_next_followup ON people (church_id, next_followup_at) WHERE next_followup_at IS NOT NULL AND deleted_at IS NULL;

-- Full text-ish search on name
CREATE INDEX idx_people_name_trgm ON people USING gin (
  church_id,
  (coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(organization_name,'')) gin_trgm_ops
) WHERE deleted_at IS NULL;

-- donations
CREATE INDEX idx_donations_church_date ON donations (church_id, donation_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_donations_church_status ON donations (church_id, payment_status, donation_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_donations_church_fund ON donations (church_id, fund_id, donation_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_donations_church_campaign ON donations (church_id, campaign_id, donation_date DESC) WHERE campaign_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_donations_church_method ON donations (church_id, payment_method, donation_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_donations_church_frequency ON donations (church_id, frequency) WHERE deleted_at IS NULL;
CREATE INDEX idx_donations_donor ON donations (donor_person_id, donation_date DESC) WHERE donor_person_id IS NOT NULL;
CREATE INDEX idx_donations_recurring ON donations (recurring_profile_id) WHERE recurring_profile_id IS NOT NULL;
CREATE INDEX idx_donations_stripe_pi ON donations (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- campaigns
CREATE INDEX idx_campaigns_church_status ON campaigns (church_id, status, start_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_campaigns_portal_visible ON campaigns (church_id) WHERE is_visible_on_portal = true AND status = 'active' AND deleted_at IS NULL;

-- funds
CREATE INDEX idx_funds_church_active ON funds (church_id, sort_order) WHERE is_active = true AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_funds_church_default ON funds (church_id) WHERE is_default = true AND deleted_at IS NULL;

-- recurring profiles
CREATE INDEX idx_recurring_church_status ON recurring_donation_profiles (church_id, status);
CREATE INDEX idx_recurring_next_charge ON recurring_donation_profiles (next_charge_date) WHERE status = 'active';

-- receipts
CREATE INDEX idx_receipts_church_number ON contribution_receipts (church_id, receipt_number);
CREATE INDEX idx_receipts_church_donation ON contribution_receipts (church_id, donation_id) WHERE donation_id IS NOT NULL;
CREATE INDEX idx_receipts_church_person ON contribution_receipts (church_id, person_id, created_at DESC);
CREATE INDEX idx_receipts_status ON contribution_receipts (church_id, status, created_at DESC);

-- deliveries
CREATE INDEX idx_deliveries_receipt ON receipt_deliveries (receipt_id, sent_at DESC);
CREATE INDEX idx_deliveries_church ON receipt_deliveries (church_id, sent_at DESC);

-- followups
CREATE INDEX idx_followups_church_person ON person_followups (church_id, person_id, occurred_at DESC);
CREATE INDEX idx_followups_next_action ON person_followups (church_id, next_action_at) WHERE next_action_at IS NOT NULL;

-- households
CREATE INDEX idx_households_church ON households (church_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_household_members_person ON household_members (person_id);

-- tags
CREATE INDEX idx_tags_church ON person_tags (church_id);
CREATE INDEX idx_tag_assignments_tag ON person_tag_assignments (tag_id);

-- service_times
CREATE INDEX idx_service_times_church ON service_times (church_id, day_of_week, start_time) WHERE is_active = true;

-- church_users
CREATE INDEX idx_church_users_user ON church_users (user_id) WHERE is_active = true;
CREATE INDEX idx_church_users_church_active ON church_users (church_id, is_active);

-- invitations
CREATE INDEX idx_invitations_email_active ON church_invitations (email) WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now();
CREATE INDEX idx_invitations_token ON church_invitations (token);

-- audit_logs
CREATE INDEX idx_audit_church_created ON audit_logs (church_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs (actor_user_id, created_at DESC);
```

---

## 5. Vistas y Materialized Views

### 5.1 vw_campaign_progress
Vista en vivo del progreso de cada campaña.

```sql
CREATE VIEW vw_campaign_progress AS
SELECT
  c.id AS campaign_id,
  c.church_id,
  c.name,
  c.slug,
  c.goal_cents,
  COALESCE(SUM(d.amount_cents) FILTER (WHERE d.payment_status = 'paid'), 0) AS collected_cents,
  COUNT(DISTINCT d.donor_person_id) FILTER (WHERE d.payment_status = 'paid') AS donor_count,
  c.start_date,
  c.end_date,
  c.status,
  CASE
    WHEN c.goal_cents = 0 THEN 0
    ELSE LEAST(100, (COALESCE(SUM(d.amount_cents) FILTER (WHERE d.payment_status = 'paid'), 0) * 100.0 / c.goal_cents))
  END AS progress_pct
FROM campaigns c
LEFT JOIN donations d ON d.campaign_id = c.id AND d.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id;
```

### 5.2 vw_active_recurring
KPI "Donantes recurrentes".

```sql
CREATE VIEW vw_active_recurring AS
SELECT
  r.id,
  r.church_id,
  r.donor_person_id,
  r.amount_cents,
  r.frequency,
  r.next_charge_date,
  p.first_name,
  p.last_name,
  p.organization_name
FROM recurring_donation_profiles r
JOIN people p ON p.id = r.donor_person_id
WHERE r.status = 'active'
  AND p.deleted_at IS NULL;
```

### 5.3 mv_church_monthly_donations
Pre-agregación para dashboard y reportes. Refresh con `pg_cron` cada 5 min.

```sql
CREATE MATERIALIZED VIEW mv_church_monthly_donations AS
SELECT
  church_id,
  EXTRACT(YEAR FROM donation_date)::int AS year,
  EXTRACT(MONTH FROM donation_date)::int AS month,
  fund_id,
  payment_method,
  frequency,
  COUNT(*) AS donation_count,
  COUNT(DISTINCT donor_person_id) AS unique_donor_count,
  SUM(amount_cents) AS total_cents,
  SUM(processing_fee_cents) AS total_fees_cents
FROM donations
WHERE payment_status = 'paid'
  AND deleted_at IS NULL
GROUP BY church_id, year, month, fund_id, payment_method, frequency
WITH DATA;

CREATE UNIQUE INDEX idx_mv_monthly_donations_pk ON mv_church_monthly_donations
  (church_id, year, month, fund_id, payment_method, frequency);

-- Refresh helper
CREATE OR REPLACE FUNCTION refresh_monthly_donations()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_church_monthly_donations;
END $$;

-- pg_cron schedule (Fase 2)
-- SELECT cron.schedule('refresh-monthly-donations', '*/5 * * * *', 'SELECT refresh_monthly_donations()');
```

---

## 6. RLS — Row Level Security

### 6.1 Helper function

```sql
CREATE OR REPLACE FUNCTION user_church_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(church_id), '{}')
  FROM church_users
  WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION user_role_in_church(p_church_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM church_users
  WHERE user_id = auth.uid() AND church_id = p_church_id AND is_active = true
  LIMIT 1;
$$;
```

### 6.2 Patrón estándar de policies

Para cada tabla tenant-scoped:

```sql
-- Enable RLS
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- SELECT: any active member of the church
CREATE POLICY <table>_select ON <table> FOR SELECT
  USING (church_id = ANY (user_church_ids()));

-- INSERT: only roles allowed for this action
CREATE POLICY <table>_insert ON <table> FOR INSERT
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer')  -- per table
  );

-- UPDATE
CREATE POLICY <table>_update ON <table> FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer')
  );

-- DELETE (soft delete via UPDATE deleted_at; restrict hard delete)
CREATE POLICY <table>_delete ON <table> FOR DELETE
  USING (false);  -- prevent hard delete; use soft delete via UPDATE
```

### 6.3 Matriz de roles (operaciones)

| Tabla / Acción | admin | pastor | treasurer | secretary | leader | viewer |
|---|---|---|---|---|---|---|
| `people` SELECT | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `people` INSERT/UPDATE | ✅ | ✅ | — | ✅ | — | — |
| `person_followups` SELECT (privadas) | ✅ | ✅ | — | — | — | — |
| `person_followups` SELECT (públicas) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `person_followups` INSERT/UPDATE | ✅ | ✅ | — | ✅ | — | — |
| `funds` INSERT/UPDATE | ✅ | — | ✅ | — | — | — |
| `campaigns` INSERT/UPDATE | ✅ | ✅ | ✅ | ✅ | — | — |
| `donations` INSERT | ✅ | ✅ | ✅ | — | — | — |
| `donations` UPDATE | ✅ | — | ✅ | — | — | — |
| `recurring_donation_profiles` INSERT/UPDATE | ✅ | ✅ | ✅ | — | — | — |
| `contribution_receipts` INSERT (via RPC) | ✅ | ✅ | ✅ | ✅ | — | — |
| `receipt_deliveries` INSERT (resend) | ✅ | ✅ | ✅ | ✅ | — | — |
| `portal_settings` UPDATE | ✅ | ✅ | — | ✅ | — | — |
| `service_times` INSERT/UPDATE | ✅ | ✅ | — | ✅ | — | — |
| `churches` UPDATE | ✅ | ✅ | — | — | — | — |
| `church_users` INSERT/UPDATE | ✅ | — | — | — | — | — |
| `church_invitations` INSERT | ✅ | — | — | — | — | — |

`viewer` y `leader` son read-only por defecto en v1.

### 6.4 Receipts policies especiales

`contribution_receipts` y `receipt_deliveries` son inmutables:
```sql
-- No UPDATE allowed
CREATE POLICY receipts_no_update ON contribution_receipts FOR UPDATE USING (false);
CREATE POLICY deliveries_no_update ON receipt_deliveries FOR UPDATE USING (false);
```

INSERT solo via RPC `rpc_register_donation` / `rpc_resend_receipt` con `SECURITY DEFINER`.

### 6.5 Anonymous access (portal público)

El portal público lee `portal_settings.published_data` y `campaigns` visibles sin auth:

```sql
CREATE POLICY portal_public_select ON portal_settings FOR SELECT
  USING (publish_status = 'published');

CREATE POLICY campaigns_public_select ON campaigns FOR SELECT
  USING (is_visible_on_portal = true AND status = 'active' AND deleted_at IS NULL);

CREATE POLICY service_times_public_select ON service_times FOR SELECT
  USING (is_active = true);

CREATE POLICY churches_public_select ON churches FOR SELECT
  USING (true);  -- but only specific columns via view
```

Alternativa más segura: crear view `vw_public_portal(slug)` que joinea las tablas y solo expone columnas públicas.

---

## 7. Funciones / RPCs

### 7.1 set_updated_at trigger

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- Aplicar a cada tabla con updated_at:
CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <table>
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### 7.2 rpc_assign_receipt_number

```sql
CREATE OR REPLACE FUNCTION rpc_assign_receipt_number(p_church_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year smallint := EXTRACT(YEAR FROM now())::smallint;
  v_next integer;
BEGIN
  -- Atomic increment per (church, year)
  INSERT INTO church_receipt_sequences (church_id, tax_year, next_number)
    VALUES (p_church_id, v_year, 1)
  ON CONFLICT (church_id, tax_year) DO UPDATE
    SET next_number = church_receipt_sequences.next_number + 1,
        updated_at = now()
  RETURNING next_number INTO v_next;

  RETURN v_year::text || '-' || LPAD(v_next::text, 6, '0');
END $$;
```

### 7.3 rpc_register_donation

```sql
CREATE OR REPLACE FUNCTION rpc_register_donation(
  p_church_id uuid,
  p_donor_person_id uuid,
  p_amount_cents bigint,
  p_fund_id uuid,
  p_campaign_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT 'cash',
  p_payment_status text DEFAULT 'paid',
  p_frequency text DEFAULT 'one_time',
  p_donation_date timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL,
  p_auto_generate_receipt boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation_id uuid;
  v_receipt_id uuid;
  v_receipt_number text;
  v_donor_name text;
  v_donor_email text;
  v_role text;
BEGIN
  -- Permission check
  v_role := user_role_in_church(p_church_id);
  IF v_role NOT IN ('admin','pastor','treasurer') THEN
    RAISE EXCEPTION 'forbidden: role % cannot register donations', v_role USING ERRCODE = '42501';
  END IF;

  -- Snapshot donor info
  SELECT
    COALESCE(first_name || ' ' || last_name, organization_name),
    email::text
  INTO v_donor_name, v_donor_email
  FROM people WHERE id = p_donor_person_id AND church_id = p_church_id;

  IF v_donor_name IS NULL THEN
    RAISE EXCEPTION 'donor not found in church';
  END IF;

  -- Insert donation
  INSERT INTO donations (
    church_id, donor_person_id, donor_name_snapshot, donor_email_snapshot,
    fund_id, campaign_id, amount_cents, payment_method, payment_status,
    frequency, donation_date, notes, created_by
  ) VALUES (
    p_church_id, p_donor_person_id, v_donor_name, v_donor_email,
    p_fund_id, p_campaign_id, p_amount_cents, p_payment_method, p_payment_status,
    p_frequency, p_donation_date, p_notes, auth.uid()
  ) RETURNING id INTO v_donation_id;

  -- Generate receipt if paid + flag enabled
  IF p_auto_generate_receipt AND p_payment_status = 'paid' THEN
    v_receipt_number := rpc_assign_receipt_number(p_church_id);

    INSERT INTO contribution_receipts (
      church_id, receipt_number, receipt_type, donation_id,
      total_amount_cents, person_id, person_name_snapshot, person_email_snapshot,
      created_by
    ) VALUES (
      p_church_id, v_receipt_number, 'per_donation', v_donation_id,
      p_amount_cents, p_donor_person_id, v_donor_name, v_donor_email,
      auth.uid()
    ) RETURNING id INTO v_receipt_id;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (
    p_church_id, auth.uid(), 'donation.create', 'donation', v_donation_id,
    jsonb_build_object('amount_cents', p_amount_cents, 'fund_id', p_fund_id, 'method', p_payment_method)
  );

  RETURN jsonb_build_object(
    'donation_id', v_donation_id,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number
  );
END $$;
```

### 7.4 rpc_resend_receipt

```sql
CREATE OR REPLACE FUNCTION rpc_resend_receipt(
  p_receipt_id uuid,
  p_reason text,
  p_reason_notes text DEFAULT NULL,
  p_recipient_email text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id uuid;
  v_role text;
  v_delivery_id uuid;
  v_recipient citext;
BEGIN
  SELECT church_id, COALESCE(p_recipient_email::citext, person_email_snapshot)
  INTO v_church_id, v_recipient
  FROM contribution_receipts
  WHERE id = p_receipt_id;

  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'receipt not found';
  END IF;

  v_role := user_role_in_church(v_church_id);
  IF v_role NOT IN ('admin','pastor','treasurer','secretary') THEN
    RAISE EXCEPTION 'forbidden: role % cannot resend receipts', v_role USING ERRCODE = '42501';
  END IF;

  -- Insert delivery row (NO new donation, NO new receipt)
  INSERT INTO receipt_deliveries (
    church_id, receipt_id, delivery_channel, recipient_email,
    reason, reason_notes, status, sent_by
  ) VALUES (
    v_church_id, p_receipt_id, 'email', v_recipient,
    p_reason, p_reason_notes, 'queued', auth.uid()
  ) RETURNING id INTO v_delivery_id;

  -- Update receipt status
  UPDATE contribution_receipts SET status = 'sent' WHERE id = p_receipt_id AND status != 'sent';

  -- Audit
  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_church_id, auth.uid(), 'receipt.resend', 'receipt', p_receipt_id,
    jsonb_build_object('reason', p_reason, 'recipient', v_recipient)
  );

  RETURN jsonb_build_object('delivery_id', v_delivery_id, 'recipient', v_recipient);
END $$;
```

### 7.5 rpc_publish_portal

```sql
CREATE OR REPLACE FUNCTION rpc_publish_portal(p_church_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := user_role_in_church(p_church_id);
  IF v_role NOT IN ('admin','pastor','secretary') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE portal_settings
  SET
    published_data = draft_data,
    publish_status = 'published',
    published_at = now(),
    published_by = auth.uid()
  WHERE church_id = p_church_id;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id)
  VALUES (p_church_id, auth.uid(), 'portal.publish', 'portal', p_church_id);

  RETURN jsonb_build_object('published_at', now());
END $$;
```

### 7.6 rpc_dashboard_kpis

```sql
CREATE OR REPLACE FUNCTION rpc_dashboard_kpis(
  p_church_id uuid,
  p_month_anchor timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start timestamptz := date_trunc('month', p_month_anchor);
  v_month_end timestamptz := v_month_start + INTERVAL '1 month';
  v_prev_start timestamptz := v_month_start - INTERVAL '1 month';
  v_kpis jsonb;
BEGIN
  IF NOT (p_church_id = ANY (user_church_ids())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'donations_month_cents', (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM donations
      WHERE church_id = p_church_id
        AND donation_date >= v_month_start AND donation_date < v_month_end
        AND payment_status = 'paid' AND deleted_at IS NULL
    ),
    'donations_prev_month_cents', (
      SELECT COALESCE(SUM(amount_cents), 0)
      FROM donations
      WHERE church_id = p_church_id
        AND donation_date >= v_prev_start AND donation_date < v_month_start
        AND payment_status = 'paid' AND deleted_at IS NULL
    ),
    'active_recurring_count', (
      SELECT COUNT(*) FROM recurring_donation_profiles
      WHERE church_id = p_church_id AND status = 'active'
    ),
    'new_recurring_month', (
      SELECT COUNT(*) FROM recurring_donation_profiles
      WHERE church_id = p_church_id AND started_at >= v_month_start
    ),
    'active_campaigns_count', (
      SELECT COUNT(*) FROM campaigns
      WHERE church_id = p_church_id AND status = 'active' AND deleted_at IS NULL
    ),
    'receipts_sent_month', (
      SELECT COUNT(*) FROM receipt_deliveries
      WHERE church_id = p_church_id AND sent_at >= v_month_start AND sent_at < v_month_end
    ),
    'receipts_resent_month', (
      SELECT COUNT(*) FROM receipt_deliveries
      WHERE church_id = p_church_id AND sent_at >= v_month_start AND sent_at < v_month_end
        AND reason != 'initial'
    )
  ) INTO v_kpis;

  RETURN v_kpis;
END $$;
```

### 7.7 on_auth_user_created trigger

```sql
CREATE OR REPLACE FUNCTION on_auth_user_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_invitation church_invitations%ROWTYPE;
BEGIN
  -- Extract invitation token from user metadata
  v_token := (NEW.raw_user_meta_data ->> 'invitation_token')::uuid;

  IF v_token IS NULL THEN
    -- User created without invitation = block (shouldn't happen since signup is disabled)
    RAISE EXCEPTION 'public signup is disabled';
  END IF;

  -- Find matching active invitation
  SELECT * INTO v_invitation
  FROM church_invitations
  WHERE token = v_token
    AND lower(email::text) = lower(NEW.email)
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now();

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'invitation invalid, expired, or already used';
  END IF;

  -- Create church_users row
  INSERT INTO church_users (church_id, user_id, email_snapshot, role, invited_at, joined_at)
  VALUES (v_invitation.church_id, NEW.id, NEW.email, v_invitation.role, v_invitation.invited_at, now());

  -- Mark invitation accepted
  UPDATE church_invitations
  SET accepted_at = now(), accepted_by = NEW.id
  WHERE id = v_invitation.id;

  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_auth_user_created();
```

---

## 8. Queries críticas (con plan esperado)

### 8.1 Dashboard: donaciones del mes
```sql
SELECT SUM(amount_cents)
FROM donations
WHERE church_id = $1
  AND donation_date >= date_trunc('month', now())
  AND payment_status = 'paid'
  AND deleted_at IS NULL;
```
Index used: `idx_donations_church_date` + `idx_donations_church_status`. Estimated < 50ms con 100K donaciones por iglesia.

### 8.2 Búsqueda de persona por nombre
```sql
SELECT * FROM people
WHERE church_id = $1
  AND (coalesce(first_name,'') || ' ' || coalesce(last_name,'') || ' ' || coalesce(organization_name,'')) ILIKE '%' || $2 || '%'
  AND deleted_at IS NULL
ORDER BY last_activity_at DESC
LIMIT 100;
```
Index used: `idx_people_name_trgm` (GIN). Estimated < 20ms con 10K personas.

### 8.3 Historial de donaciones por persona
```sql
SELECT d.*, f.name AS fund_name, c.name AS campaign_name
FROM donations d
LEFT JOIN funds f ON f.id = d.fund_id
LEFT JOIN campaigns c ON c.id = d.campaign_id
WHERE d.donor_person_id = $1
ORDER BY d.donation_date DESC
LIMIT 50;
```
Index used: `idx_donations_donor`.

### 8.4 Receipts por año fiscal
```sql
SELECT * FROM contribution_receipts
WHERE church_id = $1
  AND receipt_type = 'per_donation'
  AND donation_id IN (
    SELECT id FROM donations
    WHERE church_id = $1
      AND donation_date >= make_date($2, 1, 1)
      AND donation_date < make_date($2 + 1, 1, 1)
      AND payment_status = 'paid'
  );
```

### 8.5 Top campañas por recaudación
```sql
SELECT campaign_id, name, collected_cents, goal_cents, progress_pct
FROM vw_campaign_progress
WHERE church_id = $1
ORDER BY collected_cents DESC
LIMIT 5;
```

---

## 9. Auditoría: acciones a registrar

Cada una de estas operaciones debe insertar en `audit_logs`:

| Acción | entity_type | Disparado por |
|---|---|---|
| `donation.create` | donation | `rpc_register_donation` |
| `donation.update` | donation | trigger |
| `donation.delete` | donation | trigger |
| `receipt.create` | receipt | `rpc_register_donation` (via cascade) |
| `receipt.resend` | receipt | `rpc_resend_receipt` |
| `receipt.void` | receipt | future UPDATE |
| `portal.publish` | portal | `rpc_publish_portal` |
| `portal.save_draft` | portal | trigger |
| `church.update` | church | trigger |
| `church_users.invite` | invitation | Edge function |
| `church_users.accept` | church_user | `on_auth_user_created` |
| `church_users.role_change` | church_user | trigger |
| `church_users.deactivate` | church_user | trigger |
| `auth.login` | session | app-layer |
| `auth.logout` | session | app-layer |
| `auth.failed_login` | session | Supabase Auth event |

---

## 10. Migración: orden de archivos

`supabase/migrations/`:
```
20260528120001_extensions.sql       # pg_trgm, citext, pgcrypto
20260528120002_core_tables.sql      # churches, church_users, church_invitations
20260528120003_people.sql           # people, tags, assignments, households, members, followups
20260528120004_finance.sql          # funds, campaigns, donations, recurring, receipts, deliveries, sequences
20260528120005_portal.sql           # portal_settings, service_times
20260528120006_audit.sql            # audit_logs
20260528120007_indexes.sql          # todos los CREATE INDEX
20260528120008_functions.sql        # set_updated_at, user_church_ids, user_role_in_church, rpc_*
20260528120009_views.sql            # vw_campaign_progress, vw_active_recurring, mv_church_monthly_donations
20260528120010_rls.sql              # ENABLE RLS + policies
20260528120011_triggers.sql         # updated_at triggers, on_auth_user_created
```

---

## 11. Diagrama de cardinalidades

```
churches 1 ──────∞ church_users          (M:N con auth.users)
churches 1 ──────∞ church_invitations
churches 1 ──────∞ people
churches 1 ──────∞ funds
churches 1 ──────∞ campaigns
churches 1 ──────∞ donations
churches 1 ──────∞ recurring_donation_profiles
churches 1 ──────∞ contribution_receipts
churches 1 ──────∞ receipt_deliveries
churches 1 ──────1 portal_settings
churches 1 ──────∞ service_times
churches 1 ──────∞ audit_logs

funds 1 ─────────∞ campaigns                (opcional)
funds 1 ─────────∞ donations
funds 1 ─────────∞ recurring_donation_profiles

campaigns 1 ─────∞ donations                (opcional, vía campaign_id)

people 1 ────────∞ donations                (donor_person_id)
people 1 ────────∞ recurring_donation_profiles
people 1 ────────∞ contribution_receipts
people 1 ────────∞ person_followups
people ∞ ────────∞ person_tags              (via person_tag_assignments)
people ∞ ────────∞ households               (via household_members)

donations 1 ─────1 contribution_receipts    (1:0..1 per_donation)
contribution_receipts 1 ──∞ receipt_deliveries

recurring_donation_profiles 1 ──∞ donations
```
