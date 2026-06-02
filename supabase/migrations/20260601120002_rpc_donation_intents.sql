-- =====================================================================
-- FASE 14 · 02 — RPCs para donation_intents
-- =====================================================================
-- 1) rpc_create_public_donation_intent — pública (GRANT anon).
--    SECURITY DEFINER: anon nunca toca la tabla, toda la validación corre acá.
-- 2) rpc_link_intent_to_donation — auth. Vincula intent → donation tras
--    conversion manual del admin.
-- 3) rpc_update_intent_status — auth. Marcar contactado, cancelar.

-- =====================================================================
-- 1) rpc_create_public_donation_intent
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_create_public_donation_intent(
  p_church_slug          TEXT,
  p_amount_cents         BIGINT,
  p_frequency            TEXT,
  p_donor_type           TEXT,
  p_donor_email          TEXT,
  p_fund_id              UUID DEFAULT NULL,
  p_campaign_id          UUID DEFAULT NULL,
  p_donor_first_name     TEXT DEFAULT NULL,
  p_donor_last_name      TEXT DEFAULT NULL,
  p_donor_business_name  TEXT DEFAULT NULL,
  p_donor_contact_name   TEXT DEFAULT NULL,
  p_donor_phone          TEXT DEFAULT NULL,
  p_note                 TEXT DEFAULT NULL,
  p_honeypot             TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id     UUID;
  v_fund_id       UUID := p_fund_id;
  v_campaign      campaigns%ROWTYPE;
  v_intent_id     UUID;
  v_recent_count  INT;
BEGIN
  -- 1. Honeypot: si tiene contenido, simular éxito sin insertar.
  IF p_honeypot IS NOT NULL AND length(btrim(p_honeypot)) > 0 THEN
    RETURN jsonb_build_object(
      'donation_intent_id', NULL,
      'status', 'pending_payment',
      'payment_available', false,
      'next_action', 'offline_followup',
      'provider_redirect_url', NULL,
      'message', 'Tu intención de donación fue registrada.'
    );
  END IF;

  -- 2. Iglesia existe Y portal publicado.
  SELECT c.id INTO v_church_id
  FROM churches c
  JOIN portal_settings ps
    ON ps.church_id = c.id AND ps.publish_status = 'published'
  WHERE c.slug = lower(btrim(p_church_slug)) AND c.deleted_at IS NULL;

  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'church_not_found_or_not_published' USING ERRCODE = 'P0001';
  END IF;

  -- 3. Monto sanity (entre $1 y $1M).
  IF p_amount_cents IS NULL OR p_amount_cents < 100 OR p_amount_cents > 100000000 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Frequency whitelist.
  IF p_frequency NOT IN ('one_time','monthly','annual') THEN
    RAISE EXCEPTION 'invalid_frequency' USING ERRCODE = 'P0003';
  END IF;

  -- 5. Donor type whitelist.
  IF p_donor_type NOT IN ('individual','business','anonymous') THEN
    RAISE EXCEPTION 'invalid_donor_type' USING ERRCODE = 'P0004';
  END IF;

  -- 6. Email regex básico.
  IF p_donor_email IS NULL OR p_donor_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'P0005';
  END IF;

  -- 7-8. Campos por tipo de donante.
  IF p_donor_type = 'individual'
     AND (p_donor_first_name IS NULL OR length(btrim(p_donor_first_name)) = 0
          OR p_donor_last_name IS NULL  OR length(btrim(p_donor_last_name))  = 0) THEN
    RAISE EXCEPTION 'individual_donor_requires_name' USING ERRCODE = 'P0006';
  END IF;
  IF p_donor_type = 'business'
     AND (p_donor_business_name IS NULL OR length(btrim(p_donor_business_name)) = 0) THEN
    RAISE EXCEPTION 'business_donor_requires_name' USING ERRCODE = 'P0007';
  END IF;

  -- 9. Campaign válida + hereda fund.
  IF p_campaign_id IS NOT NULL THEN
    SELECT * INTO v_campaign FROM campaigns
    WHERE id = p_campaign_id
      AND church_id = v_church_id
      AND is_visible_on_portal = true
      AND status = 'active'
      AND deleted_at IS NULL;
    IF v_campaign.id IS NULL THEN
      RAISE EXCEPTION 'campaign_not_available' USING ERRCODE = 'P0008';
    END IF;
    IF v_fund_id IS NULL THEN
      v_fund_id := v_campaign.fund_id;
    END IF;
  END IF;

  -- 10. Fund válido (explícito o derivado de campaña o default de iglesia).
  IF v_fund_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM funds
      WHERE id = v_fund_id AND church_id = v_church_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'fund_not_available' USING ERRCODE = 'P0009';
    END IF;
  ELSE
    SELECT id INTO v_fund_id FROM funds
    WHERE church_id = v_church_id AND is_default = true AND is_active = true
    LIMIT 1;
    IF v_fund_id IS NULL THEN
      RAISE EXCEPTION 'no_default_fund_for_church' USING ERRCODE = 'P0010';
    END IF;
  END IF;

  -- 11. Rate limit: máx 5 intents/email/hora en esta iglesia.
  SELECT COUNT(*) INTO v_recent_count FROM donation_intents
  WHERE church_id = v_church_id
    AND lower(donor_email::text) = lower(p_donor_email)
    AND created_at > now() - INTERVAL '1 hour';
  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0011';
  END IF;

  -- Insertar
  INSERT INTO donation_intents (
    church_id, fund_id, campaign_id,
    donor_type, donor_email, donor_phone,
    donor_first_name, donor_last_name,
    donor_business_name, donor_contact_name,
    amount_cents, currency, frequency, note, source, status
  ) VALUES (
    v_church_id, v_fund_id, p_campaign_id,
    p_donor_type, lower(btrim(p_donor_email)), nullif(btrim(p_donor_phone), ''),
    nullif(btrim(p_donor_first_name), ''), nullif(btrim(p_donor_last_name), ''),
    nullif(btrim(p_donor_business_name), ''), nullif(btrim(p_donor_contact_name), ''),
    p_amount_cents, 'USD', p_frequency, nullif(btrim(p_note), ''), 'public_portal', 'pending_payment'
  ) RETURNING id INTO v_intent_id;

  RETURN jsonb_build_object(
    'donation_intent_id', v_intent_id,
    'status', 'pending_payment',
    'payment_available', false,
    'next_action', 'offline_followup',
    'provider_redirect_url', NULL,
    'message', 'Tu intención de donación fue registrada. La iglesia podrá contactarte para completar el proceso.'
  );
END $$;

COMMENT ON FUNCTION rpc_create_public_donation_intent IS
  'Pública (GRANT anon). Crea una donation_intent con validación server-side. Honeypot, rate limit, formato de email. NO mueve dinero, NO crea receipt.';

GRANT EXECUTE ON FUNCTION rpc_create_public_donation_intent(
  TEXT, BIGINT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon;
GRANT EXECUTE ON FUNCTION rpc_create_public_donation_intent(
  TEXT, BIGINT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- =====================================================================
-- 2) rpc_link_intent_to_donation
-- =====================================================================
-- Llamada después de un rpc_register_donation exitoso para vincular el intent
-- a la donation real. Marca el intent como 'completed'.
CREATE OR REPLACE FUNCTION rpc_link_intent_to_donation(
  p_intent_id    UUID,
  p_donation_id  UUID
) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent    donation_intents%ROWTYPE;
  v_donation  donations%ROWTYPE;
  v_role      TEXT;
BEGIN
  SELECT * INTO v_intent FROM donation_intents WHERE id = p_intent_id;
  IF v_intent.id IS NULL THEN
    RAISE EXCEPTION 'intent_not_found' USING ERRCODE = 'P0101';
  END IF;

  SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
  IF v_donation.id IS NULL THEN
    RAISE EXCEPTION 'donation_not_found' USING ERRCODE = 'P0102';
  END IF;

  -- Misma iglesia
  IF v_intent.church_id <> v_donation.church_id THEN
    RAISE EXCEPTION 'church_mismatch' USING ERRCODE = 'P0103';
  END IF;

  -- Permiso del caller
  v_role := user_role_in_church(v_intent.church_id);
  IF v_role NOT IN ('admin','pastor','treasurer','secretary') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Idempotente: si ya está completed con otra donation, error.
  IF v_intent.status = 'completed' AND v_intent.donation_id IS NOT NULL
     AND v_intent.donation_id <> p_donation_id THEN
    RAISE EXCEPTION 'intent_already_linked_to_other_donation' USING ERRCODE = 'P0104';
  END IF;

  UPDATE donation_intents
     SET status        = 'completed',
         donation_id   = p_donation_id,
         completed_at  = now(),
         updated_at    = now()
   WHERE id = p_intent_id;

  -- Audit
  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_intent.church_id, auth.uid(), 'intent.complete', 'donation_intent', p_intent_id,
    jsonb_build_object('donation_id', p_donation_id)
  );

  RETURN jsonb_build_object('intent_id', p_intent_id, 'donation_id', p_donation_id, 'status', 'completed');
END $$;

COMMENT ON FUNCTION rpc_link_intent_to_donation IS
  'Vincula un donation_intent con la donation real que lo materializó. NO crea donation ni receipt — solo enlaza.';

GRANT EXECUTE ON FUNCTION rpc_link_intent_to_donation(UUID, UUID) TO authenticated;

-- =====================================================================
-- 3) rpc_update_intent_status
-- =====================================================================
-- Acciones admin sobre un intent: marcar contactado o cancelar.
-- "Marcar contactado" no cambia status, solo set contacted_at/contacted_by.
-- "Cancelar" cambia status='canceled'.
CREATE OR REPLACE FUNCTION rpc_update_intent_status(
  p_intent_id    UUID,
  p_action       TEXT,            -- 'mark_contacted' | 'cancel'
  p_admin_notes  TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_intent  donation_intents%ROWTYPE;
  v_role    TEXT;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_intent FROM donation_intents WHERE id = p_intent_id;
  IF v_intent.id IS NULL THEN
    RAISE EXCEPTION 'intent_not_found' USING ERRCODE = 'P0201';
  END IF;

  v_role := user_role_in_church(v_intent.church_id);
  IF v_role NOT IN ('admin','pastor','treasurer','secretary') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_action = 'mark_contacted' THEN
    UPDATE donation_intents
       SET contacted_at = now(),
           contacted_by = auth.uid(),
           admin_notes  = COALESCE(p_admin_notes, admin_notes),
           updated_at   = now()
     WHERE id = p_intent_id;
    v_new_status := v_intent.status;
  ELSIF p_action = 'cancel' THEN
    IF v_intent.status NOT IN ('pending_payment','payment_provider_pending') THEN
      RAISE EXCEPTION 'cannot_cancel_in_current_status' USING ERRCODE = 'P0202';
    END IF;
    UPDATE donation_intents
       SET status      = 'canceled',
           admin_notes = COALESCE(p_admin_notes, admin_notes),
           updated_at  = now()
     WHERE id = p_intent_id;
    v_new_status := 'canceled';
  ELSE
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = 'P0203';
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_intent.church_id, auth.uid(), 'intent.' || p_action, 'donation_intent', p_intent_id,
    jsonb_build_object('previous_status', v_intent.status, 'new_status', v_new_status)
  );

  RETURN jsonb_build_object('intent_id', p_intent_id, 'status', v_new_status, 'action', p_action);
END $$;

COMMENT ON FUNCTION rpc_update_intent_status IS
  'Acciones admin sobre un intent: mark_contacted o cancel. Audit log incluido.';

GRANT EXECUTE ON FUNCTION rpc_update_intent_status(UUID, TEXT, TEXT) TO authenticated;
