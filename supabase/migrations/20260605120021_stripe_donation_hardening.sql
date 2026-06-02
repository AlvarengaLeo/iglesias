-- =====================================================================
-- Stripe donation hardening (post multi-expert audit).
-- The connected-account donation flow was functionally correct but had three
-- real gaps that bite in production:
--   1. Idempotency relied on a SELECT-then-INSERT with only a NON-unique index
--      on donations.stripe_payment_intent_id → two concurrent webhook deliveries
--      of the same event could BOTH insert → duplicate donation + receipt +
--      inflated campaign progress. Fix: a partial UNIQUE index + a unique_violation
--      handler inside the RPC.
--   2. Online donors never got a contribution_receipt (only the manual
--      rpc_register_donation created one) → no tax receipt for Stripe gifts.
--      Fix: create the per-donation receipt atomically at fulfillment.
--   3. No event-level dedup ledger → add stripe_webhook_events so the webhook
--      can skip already-processed events across retries.
-- =====================================================================

-- 1. Race-safe idempotency on the Stripe PaymentIntent id. -----------------
DROP INDEX IF EXISTS idx_donations_stripe_pi;
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_stripe_pi_unique
  ON donations (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- 2. Webhook event ledger (recorded AFTER successful handling, so a failed
--    handler returns 5xx and Stripe safely retries). RLS on, no policies →
--    only the service role (webhook) and SECURITY DEFINER functions touch it.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id   TEXT PRIMARY KEY,
  event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE stripe_webhook_events IS 'Processed Stripe event ids — recorded after successful handling so retries are no-ops.';
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- 3. Fulfillment RPC — race-safe + creates donor person + tax receipt. ------
CREATE OR REPLACE FUNCTION rpc_complete_donation_from_payment(
  p_church_id                UUID,
  p_amount_cents             BIGINT,
  p_stripe_payment_intent_id TEXT,
  p_stripe_charge_id         TEXT DEFAULT NULL,
  p_payment_method           TEXT DEFAULT 'card',
  p_frequency                TEXT DEFAULT 'one_time',
  p_fund_id                  UUID DEFAULT NULL,
  p_campaign_id              UUID DEFAULT NULL,
  p_donor_name               TEXT DEFAULT NULL,
  p_donor_email              TEXT DEFAULT NULL,
  p_intent_id                UUID DEFAULT NULL,
  p_stripe_subscription_id   TEXT DEFAULT NULL,
  p_paid_at                  TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing       UUID;
  v_fund_id        UUID;
  v_person_id      UUID;
  v_profile_id     UUID;
  v_donation_id    UUID;
  v_receipt_id     UUID;
  v_receipt_number TEXT;
  v_name           TEXT;
  v_email          CITEXT;
  v_campaign_id    UUID;
  v_freq           TEXT;
  v_intent         donation_intents%ROWTYPE;
BEGIN
  -- Fast-path idempotency for sequential retries (the UNIQUE index below is the
  -- hard guard against truly concurrent deliveries).
  SELECT id INTO v_existing FROM donations
   WHERE stripe_payment_intent_id = p_stripe_payment_intent_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('donation_id', v_existing, 'idempotent', true);
  END IF;

  IF p_intent_id IS NOT NULL THEN
    SELECT * INTO v_intent FROM donation_intents WHERE id = p_intent_id;
  END IF;

  v_name := COALESCE(
    p_donor_name,
    NULLIF(btrim(coalesce(v_intent.donor_first_name,'') || ' ' || coalesce(v_intent.donor_last_name,'')), ''),
    v_intent.donor_business_name,
    'Donante en línea');
  v_email       := COALESCE(p_donor_email, v_intent.donor_email);
  v_campaign_id := COALESCE(p_campaign_id, v_intent.campaign_id);
  v_freq        := COALESCE(NULLIF(p_frequency, ''), 'one_time');

  -- Resolve fund: explicit → intent → church default → any active.
  v_fund_id := COALESCE(p_fund_id, v_intent.fund_id);
  IF v_fund_id IS NULL THEN
    SELECT id INTO v_fund_id FROM funds
     WHERE church_id = p_church_id AND is_active = true AND deleted_at IS NULL
     ORDER BY is_default DESC, sort_order, name LIMIT 1;
  END IF;

  -- Resolve or CREATE the donor person. A contribution_receipt requires a
  -- non-null person_id, so online donors are linked by email or created here.
  IF v_intent.donor_person_id IS NOT NULL THEN
    v_person_id := v_intent.donor_person_id;
  ELSIF v_email IS NOT NULL THEN
    SELECT id INTO v_person_id FROM people
     WHERE church_id = p_church_id AND email = v_email AND deleted_at IS NULL
     ORDER BY created_at LIMIT 1;
  END IF;
  IF v_person_id IS NULL THEN
    INSERT INTO people (church_id, person_type, first_name, email, status)
    VALUES (p_church_id, 'individual', v_name, v_email, 'donor')
    RETURNING id INTO v_person_id;
  END IF;

  -- Recurring profile — idempotent on the Stripe subscription.
  IF p_stripe_subscription_id IS NOT NULL THEN
    INSERT INTO recurring_donation_profiles
      (church_id, donor_person_id, fund_id, campaign_id, amount_cents, frequency,
       payment_method, stripe_subscription_id, status, started_at)
    VALUES
      (p_church_id, v_person_id, v_fund_id, v_campaign_id, p_amount_cents,
       CASE WHEN v_freq IN ('monthly','annual') THEN v_freq ELSE 'monthly' END,
       'card', p_stripe_subscription_id, 'active', p_paid_at)
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET updated_at = now()
    RETURNING id INTO v_profile_id;
  END IF;

  -- The paid donation row — race-safe against concurrent webhook deliveries.
  BEGIN
    INSERT INTO donations (
      church_id, donor_person_id, donor_name_snapshot, donor_email_snapshot,
      fund_id, campaign_id, recurring_profile_id, amount_cents, payment_method,
      payment_status, frequency, donation_date, stripe_payment_intent_id, stripe_charge_id
    ) VALUES (
      p_church_id, v_person_id, v_name, v_email,
      v_fund_id, v_campaign_id, v_profile_id, p_amount_cents, p_payment_method,
      'paid', v_freq, p_paid_at, p_stripe_payment_intent_id, p_stripe_charge_id
    ) RETURNING id INTO v_donation_id;
  EXCEPTION WHEN unique_violation THEN
    -- A concurrent delivery already recorded this PaymentIntent — no-op.
    SELECT id INTO v_existing FROM donations
     WHERE stripe_payment_intent_id = p_stripe_payment_intent_id LIMIT 1;
    RETURN jsonb_build_object('donation_id', v_existing, 'idempotent', true);
  END;

  UPDATE people SET last_activity_at = p_paid_at WHERE id = v_person_id;

  -- Tax receipt (1:1 with the donation) — same behaviour as the manual flow.
  IF p_amount_cents > 0 THEN
    v_receipt_number := rpc_assign_receipt_number(p_church_id);
    INSERT INTO contribution_receipts (
      church_id, receipt_number, receipt_type, donation_id,
      total_amount_cents, person_id, person_name_snapshot, person_email_snapshot
    ) VALUES (
      p_church_id, v_receipt_number, 'per_donation', v_donation_id,
      p_amount_cents, v_person_id, v_name, v_email
    ) RETURNING id INTO v_receipt_id;
  END IF;

  -- Mark the originating intent completed (one-time + first recurring cycle).
  IF p_intent_id IS NOT NULL AND v_intent.id IS NOT NULL AND v_intent.status <> 'completed' THEN
    UPDATE donation_intents
       SET status = 'completed', donation_id = v_donation_id, completed_at = now(),
           provider = 'stripe', provider_payment_intent_id = p_stripe_payment_intent_id,
           updated_at = now()
     WHERE id = p_intent_id;
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, after_data)
  VALUES (p_church_id, NULL, 'donation.create', 'donation', v_donation_id,
    jsonb_build_object('amount_cents', p_amount_cents, 'source', 'stripe_connect',
                       'payment_intent', p_stripe_payment_intent_id, 'frequency', v_freq,
                       'receipt_id', v_receipt_id));

  RETURN jsonb_build_object(
    'donation_id', v_donation_id,
    'recurring_profile_id', v_profile_id,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number);
END $$;

GRANT EXECUTE ON FUNCTION rpc_complete_donation_from_payment(
  UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ
) TO service_role;
