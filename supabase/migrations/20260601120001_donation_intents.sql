-- =====================================================================
-- FASE 14 · 01 — Tabla donation_intents
-- =====================================================================
-- Una donation_intent representa la INTENCIÓN PÚBLICA de un visitante
-- anónimo del portal de donar a una iglesia/campaña/fondo.
-- NO mueve dinero. NO genera receipt. NO afecta reportes.
-- Se convierte a `donations` (real) solo cuando:
--   a) un admin la marca como recibida manualmente (efectivo, cheque, etc), o
--   b) Stripe confirma el pago vía webhook (fase futura).
--
-- Stripe-ready: las columnas provider_* quedan reservadas (null) hasta wire.
-- Inserción pública SOLO vía rpc_create_public_donation_intent (SECURITY DEFINER).
-- Modificación SOLO por admins/pastor/treasurer/secretary de la misma iglesia.

CREATE TABLE donation_intents (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id                    UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  fund_id                      UUID REFERENCES funds(id) ON DELETE SET NULL,
  campaign_id                  UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Donor identity
  donor_person_id              UUID REFERENCES people(id) ON DELETE SET NULL,
  donor_type                   TEXT NOT NULL
                               CHECK (donor_type IN ('individual','business','anonymous')),
  donor_first_name             TEXT,
  donor_last_name              TEXT,
  donor_business_name          TEXT,
  donor_contact_name           TEXT,
  donor_email                  CITEXT NOT NULL,
  donor_phone                  TEXT,

  -- Amount intent
  amount_cents                 BIGINT NOT NULL
                               CHECK (amount_cents >= 100 AND amount_cents <= 100000000),
  currency                     CHAR(3) NOT NULL DEFAULT 'USD',
  frequency                    TEXT NOT NULL
                               CHECK (frequency IN ('one_time','monthly','annual')),

  -- Meta
  note                         TEXT,
  source                       TEXT NOT NULL DEFAULT 'public_portal',

  -- Lifecycle
  status                       TEXT NOT NULL DEFAULT 'pending_payment'
                               CHECK (status IN ('pending_payment','payment_provider_pending',
                                                 'completed','canceled','expired','failed')),
  admin_notes                  TEXT,
  contacted_at                 TIMESTAMPTZ,
  contacted_by                 UUID REFERENCES auth.users(id),

  -- Conversion: when an intent becomes a real donation
  donation_id                  UUID REFERENCES donations(id) ON DELETE SET NULL,
  completed_at                 TIMESTAMPTZ,

  -- Provider scaffolding (null until Stripe is wired)
  provider                     TEXT,
  provider_checkout_session_id TEXT,
  provider_payment_intent_id   TEXT,
  provider_subscription_id     TEXT,
  provider_customer_id         TEXT,
  provider_redirect_url        TEXT,

  -- Forensics / anti-abuse
  ip_address                   INET,
  user_agent                   TEXT,
  metadata                     JSONB NOT NULL DEFAULT '{}'::jsonb,

  expires_at                   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT donor_data_valid CHECK (
    (donor_type = 'individual'  AND donor_first_name IS NOT NULL AND donor_last_name IS NOT NULL) OR
    (donor_type = 'business'    AND donor_business_name IS NOT NULL) OR
    (donor_type = 'anonymous')
  )
);

COMMENT ON TABLE  donation_intents IS 'Intenciones públicas de donación sin pago confirmado. Se convierten a donations al confirmar.';
COMMENT ON COLUMN donation_intents.status IS
  'pending_payment: registrado sin pago | payment_provider_pending: redirigido a Stripe | completed: convertido a donation | canceled/expired/failed';
COMMENT ON COLUMN donation_intents.provider IS 'Reservado para Stripe (valor futuro: ''stripe''). NULL hoy.';
COMMENT ON COLUMN donation_intents.donation_id IS 'FK al donations.id que materializó esta intención (set al convertir).';

-- ========== Índices ==========
CREATE INDEX idx_intents_church_created
  ON donation_intents (church_id, created_at DESC);

CREATE INDEX idx_intents_church_status
  ON donation_intents (church_id, status);

CREATE INDEX idx_intents_church_pending
  ON donation_intents (church_id, created_at DESC)
  WHERE status IN ('pending_payment','payment_provider_pending');

CREATE INDEX idx_intents_church_campaign
  ON donation_intents (church_id, campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX idx_intents_church_fund
  ON donation_intents (church_id, fund_id)
  WHERE fund_id IS NOT NULL;

CREATE INDEX idx_intents_email_lower
  ON donation_intents (church_id, lower(donor_email::text));

CREATE UNIQUE INDEX idx_intents_provider_session
  ON donation_intents (provider_checkout_session_id)
  WHERE provider_checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX idx_intents_provider_pi
  ON donation_intents (provider_payment_intent_id)
  WHERE provider_payment_intent_id IS NOT NULL;

CREATE INDEX idx_intents_expires_sweep
  ON donation_intents (expires_at)
  WHERE status = 'pending_payment';

-- ========== Trigger updated_at ==========
CREATE TRIGGER trg_donation_intents_updated_at
  BEFORE UPDATE ON donation_intents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========== RLS ==========
ALTER TABLE donation_intents ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier miembro activo de la iglesia
CREATE POLICY intents_select ON donation_intents FOR SELECT
  USING (church_id = ANY (user_church_ids()));

-- UPDATE: solo roles operacionales (no leader/viewer)
CREATE POLICY intents_update ON donation_intents FOR UPDATE
  USING (church_id = ANY (user_church_ids()))
  WITH CHECK (
    church_id = ANY (user_church_ids())
    AND user_role_in_church(church_id) IN ('admin','pastor','treasurer','secretary')
  );

-- INSERT directo bloqueado: usar rpc_create_public_donation_intent (SECURITY DEFINER)
CREATE POLICY intents_no_insert ON donation_intents FOR INSERT WITH CHECK (false);

-- DELETE bloqueado: intents son historial inmutable (usar status='canceled')
CREATE POLICY intents_no_delete ON donation_intents FOR DELETE USING (false);
