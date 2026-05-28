-- =====================================================================
-- 02 — Core: Tenancy & Users
-- =====================================================================
-- Tablas base de multi-tenancy y autenticación:
--   churches              — una fila por iglesia (tenant)
--   church_users          — M:N entre auth.users y churches con rol
--   church_invitations    — invitaciones pendientes (invite-only signup)

-- ---------- churches ----------
CREATE TABLE churches (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name               TEXT NOT NULL,
  public_name              TEXT NOT NULL,
  slug                     CITEXT UNIQUE NOT NULL,
  ein                      TEXT,
  address                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  phone                    TEXT,
  email                    CITEXT,
  pastor_name              TEXT,
  treasurer_name           TEXT,
  primary_color            TEXT DEFAULT '#1F2B38',
  logo_url                 TEXT,
  timezone                 TEXT NOT NULL DEFAULT 'America/New_York',
  locale                   TEXT NOT NULL DEFAULT 'es'
                           CHECK (locale IN ('es','en')),

  -- Stripe Connect (Phase 4+; scaffolded for v1)
  stripe_account_id        TEXT,
  stripe_charges_enabled   BOOLEAN NOT NULL DEFAULT false,

  -- Receipt template fields
  receipt_authorized_rep   TEXT,
  receipt_default_message  TEXT,
  receipt_fiscal_notice    TEXT DEFAULT 'No se entregaron bienes ni servicios a cambio de esta contribución, excepto beneficios religiosos intangibles.',
  receipt_include_signature BOOLEAN NOT NULL DEFAULT false,

  -- Subscription
  plan                     TEXT NOT NULL DEFAULT 'ministerio'
                           CHECK (plan IN ('ministerio','comunidad','enterprise')),
  plan_status              TEXT NOT NULL DEFAULT 'active'
                           CHECK (plan_status IN ('active','past_due','canceled','trialing')),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);

COMMENT ON TABLE  churches IS 'Una fila por iglesia (tenant). church_id de las demás tablas apunta aquí.';
COMMENT ON COLUMN churches.slug IS 'Identificador URL-safe único (case-insensitive). Ej: casa-de-restauracion';
COMMENT ON COLUMN churches.ein IS 'Federal Tax ID (formato XX-XXXXXXX). Opcional pero recomendado para recibos US.';

-- ---------- church_users ----------
CREATE TABLE church_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id       UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_snapshot  CITEXT NOT NULL,
  full_name       TEXT,
  role            TEXT NOT NULL
                  CHECK (role IN ('admin','pastor','treasurer','secretary','leader','viewer')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  invited_at      TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (church_id, user_id)
);

COMMENT ON TABLE church_users IS 'M:N entre auth.users (Supabase) y churches. Un mismo user puede pertenecer a varias iglesias con distintos roles.';

-- ---------- church_invitations ----------
CREATE TABLE church_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  email        CITEXT NOT NULL,
  role         TEXT NOT NULL
               CHECK (role IN ('admin','pastor','treasurer','secretary','leader','viewer')),
  token        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by   UUID NOT NULL REFERENCES auth.users(id),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  accepted_by  UUID REFERENCES auth.users(id),
  revoked_at   TIMESTAMPTZ
);

COMMENT ON TABLE church_invitations IS 'Invitaciones pendientes. Match con auth.users.raw_user_meta_data.invitation_token al aceptar.';

-- Unique active invitation per (church, email):
-- Solo puede existir una invitación PENDIENTE (no accepted, no revoked) por email/church.
CREATE UNIQUE INDEX idx_invitations_unique_active
  ON church_invitations (church_id, lower(email::text))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
