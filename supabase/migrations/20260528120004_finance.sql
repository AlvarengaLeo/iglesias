-- =====================================================================
-- 04 — Finance: Funds, Campaigns, Donations, Receipts
-- =====================================================================

-- ---------- funds ----------
CREATE TABLE funds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,
  description  TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_funds_church_code_unique ON funds (church_id, lower(code));
CREATE UNIQUE INDEX idx_funds_church_name_unique ON funds (church_id, lower(name));

COMMENT ON TABLE funds IS 'Catálogo de fondos contables por iglesia (General, Misiones, Construcción, etc.).';

-- ---------- campaigns ----------
CREATE TABLE campaigns (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id              UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  fund_id                UUID REFERENCES funds(id) ON DELETE SET NULL,
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
  UNIQUE (church_id, slug),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE campaigns IS 'Campañas con meta de recaudación. collected_amount NO se almacena; se obtiene de vw_campaign_progress.';

-- ---------- recurring_donation_profiles ----------
-- (Definida antes que donations porque donations referencia a esta vía FK)
CREATE TABLE recurring_donation_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  donor_person_id          UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  fund_id                  UUID NOT NULL REFERENCES funds(id) ON DELETE RESTRICT,
  campaign_id              UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  amount_cents             BIGINT NOT NULL CHECK (amount_cents > 0),
  currency                 CHAR(3) NOT NULL DEFAULT 'USD',
  frequency                TEXT NOT NULL
                           CHECK (frequency IN ('monthly','annual')),
  payment_method           TEXT NOT NULL
                           CHECK (payment_method IN ('card','ach','stripe','other')),

  -- Stripe scaffolding
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

COMMENT ON TABLE recurring_donation_profiles IS 'Intención recurrente. Cada cobro exitoso crea una fila en donations.';

-- ---------- donations ----------
CREATE TABLE donations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                   UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  donor_person_id             UUID REFERENCES people(id) ON DELETE SET NULL,
  donor_name_snapshot         TEXT NOT NULL,
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

  -- Stripe scaffolding
  stripe_payment_intent_id    TEXT,
  stripe_charge_id            TEXT,

  check_number                TEXT,
  notes                       TEXT,
  internal_notes              TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID REFERENCES auth.users(id),
  updated_by                  UUID REFERENCES auth.users(id),
  deleted_at                  TIMESTAMPTZ
);

COMMENT ON TABLE donations IS 'Cada pago/donación individual. Frecuencias one_time/monthly/annual. Recurring profiles generan filas aquí.';

-- ---------- church_receipt_sequences ----------
-- Contador atómico por (church, year) para receipt_number lock-safe.
CREATE TABLE church_receipt_sequences (
  church_id    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  tax_year     SMALLINT NOT NULL,
  next_number  INTEGER NOT NULL DEFAULT 1,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, tax_year)
);

COMMENT ON TABLE church_receipt_sequences IS 'Secuencia atómica para receipt_number. Usar via rpc_assign_receipt_number().';

-- ---------- contribution_receipts ----------
CREATE TABLE contribution_receipts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id             UUID NOT NULL REFERENCES churches(id) ON DELETE RESTRICT,
  receipt_number        TEXT NOT NULL,
  receipt_type          TEXT NOT NULL DEFAULT 'per_donation'
                        CHECK (receipt_type IN ('per_donation','annual_statement')),

  donation_id           UUID REFERENCES donations(id) ON DELETE RESTRICT,
  tax_year              SMALLINT,
  total_amount_cents    BIGINT NOT NULL CHECK (total_amount_cents > 0),
  donations_count       INTEGER NOT NULL DEFAULT 1,

  person_id             UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  person_name_snapshot  TEXT NOT NULL,
  person_email_snapshot CITEXT,

  pdf_storage_path      TEXT,
  pdf_generated_at      TIMESTAMPTZ,

  status                TEXT NOT NULL DEFAULT 'generated'
                        CHECK (status IN ('generated','sent','failed','superseded','void')),

  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES auth.users(id),

  UNIQUE (church_id, receipt_number),
  CONSTRAINT receipt_type_consistency CHECK (
    (receipt_type = 'per_donation' AND donation_id IS NOT NULL AND tax_year IS NULL)
    OR
    (receipt_type = 'annual_statement' AND donation_id IS NULL AND tax_year IS NOT NULL)
  )
);

COMMENT ON TABLE contribution_receipts IS 'Comprobantes. Tipo per_donation (1:1) o annual_statement (agregado por donor/año). INMUTABLE: no se actualiza después de crear.';

-- ---------- receipt_deliveries ----------
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
  external_message_id TEXT,
  error_message       TEXT,

  sent_by             UUID REFERENCES auth.users(id),
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at        TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE receipt_deliveries IS 'Cada envío o reenvío. INMUTABLE. Reenviar receipt NO crea nueva donation.';
