-- =====================================================================
-- Donation-target auto-wiring — lifecycle hardening (Phases 1-3).
-- Multi-expert review of 62 donation-target scenarios found a few real gaps
-- where a target could be shown-but-uncharchgeable or a gift mis-attributed.
--   P1: rpc_complete_donation_from_payment re-validates campaign + fund at
--       fulfillment (owned + alive); rpc_create_public_donation_intent gets
--       deleted_at on the fund check + an any-active-fund fallback.
--   P2: featuredProjects (portal) + rpc_public_projects_by_slug expose a
--       project's donation target ONLY when it is currently chargeable, so the
--       "Give" button never appears for a dead/hidden target.
--   P3: a defensive trigger detaches dependents when a campaign/fund is
--       soft-deleted (no UI delete path today — future-proofing).
-- Every CREATE OR REPLACE copies the LATEST body verbatim and changes only the
-- targeted lines (favicon-regression lesson).
-- =====================================================================

-- =====================================================================
-- PHASE 1a — rpc_complete_donation_from_payment (from 20260605120021)
--   + campaign/fund validation before recording the donation.
-- =====================================================================
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
  v_existing        UUID;
  v_fund_id         UUID;
  v_person_id       UUID;
  v_profile_id      UUID;
  v_donation_id     UUID;
  v_receipt_id      UUID;
  v_receipt_number  TEXT;
  v_name            TEXT;
  v_email           CITEXT;
  v_campaign_id     UUID;
  v_freq            TEXT;
  v_intent          donation_intents%ROWTYPE;
  v_campaign_dropped BOOLEAN := false;
  v_fund_fellback    BOOLEAN := false;
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

  -- HARDENING: the target must still belong to the church and be alive at
  -- fulfillment time (a campaign could be deleted between intent and webhook,
  -- incl. each recurring cycle). If gone, drop it and record the gift against
  -- the fund (still counts in reports); flag it for the audit log.
  IF v_campaign_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM campaigns WHERE id = v_campaign_id AND church_id = p_church_id AND deleted_at IS NULL
  ) THEN
    v_campaign_id := NULL;
    v_campaign_dropped := true;
  END IF;

  -- Resolve + validate fund: an explicit/intent fund must belong to the church,
  -- be active and not deleted; else fall back to default → any active fund.
  v_fund_id := COALESCE(p_fund_id, v_intent.fund_id);
  IF v_fund_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM funds WHERE id = v_fund_id AND church_id = p_church_id AND is_active = true AND deleted_at IS NULL
  ) THEN
    v_fund_id := NULL;
    v_fund_fellback := true;
  END IF;
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
                       'receipt_id', v_receipt_id,
                       'campaign_dropped', v_campaign_dropped, 'fund_fellback', v_fund_fellback));

  RETURN jsonb_build_object(
    'donation_id', v_donation_id,
    'recurring_profile_id', v_profile_id,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number);
END $$;

GRANT EXECUTE ON FUNCTION rpc_complete_donation_from_payment(
  UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ
) TO service_role;

-- =====================================================================
-- PHASE 1b — rpc_create_public_donation_intent (from 20260601120002)
--   + deleted_at on the fund check + any-active-fund fallback.
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
      WHERE id = v_fund_id AND church_id = v_church_id AND is_active = true AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'fund_not_available' USING ERRCODE = 'P0009';
    END IF;
  ELSE
    -- Default fund; si no hay, cualquier fondo activo (resiliencia).
    SELECT id INTO v_fund_id FROM funds
    WHERE church_id = v_church_id AND is_default = true AND is_active = true AND deleted_at IS NULL
    LIMIT 1;
    IF v_fund_id IS NULL THEN
      SELECT id INTO v_fund_id FROM funds
      WHERE church_id = v_church_id AND is_active = true AND deleted_at IS NULL
      ORDER BY sort_order, name LIMIT 1;
    END IF;
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

GRANT EXECUTE ON FUNCTION rpc_create_public_donation_intent(
  TEXT, BIGINT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon;
GRANT EXECUTE ON FUNCTION rpc_create_public_donation_intent(
  TEXT, BIGINT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO authenticated;

-- =====================================================================
-- PHASE 2a — rpc_public_portal_by_slug (full body from 20260605120020)
--   ONLY change: featuredProjects exposes a project's donation target only
--   when that campaign/fund is currently chargeable.
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_public_portal_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_result JSONB;
  v_payment_available BOOLEAN;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_church_id
  FROM churches
  WHERE slug = lower(btrim(p_slug))
    AND deleted_at IS NULL;

  IF v_church_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings
  WHERE church_id = v_church_id;

  IF NOT COALESCE(v_published, false) THEN
    RETURN NULL;
  END IF;

  SELECT (stripe_account_id IS NOT NULL AND stripe_charges_enabled)
  INTO v_payment_available
  FROM churches WHERE id = v_church_id;

  SELECT jsonb_build_object(
    'church', (
      SELECT jsonb_build_object(
        'id',                c.id,
        'public_name',       c.public_name,
        'slug',              c.slug,
        'primary_color',     c.primary_color,
        'logo_url',          c.logo_url,
        'favicon_url',       c.favicon_url,
        'stripe_account_id', CASE WHEN COALESCE(v_payment_available, false) THEN c.stripe_account_id ELSE NULL END
      )
      FROM churches c WHERE c.id = v_church_id
    ),
    'portal', (
      SELECT jsonb_build_object(
        'published_data', ps.published_data,
        'published_at',   ps.published_at
      )
      FROM portal_settings ps WHERE ps.church_id = v_church_id
    ),
    'campaigns', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',              c.id,
          'name',            c.name,
          'description',     c.description,
          'goal_cents',      c.goal_cents,
          'currency',        c.currency,
          'end_date',        c.end_date,
          'image_url',       c.image_url,
          'fund_id',         c.fund_id,
          'collected_cents', COALESCE(cp.collected_cents, 0),
          'donor_count',     COALESCE(cp.donor_count, 0),
          'progress_pct',    COALESCE(cp.progress_pct, 0)
        )
        ORDER BY c.end_date NULLS LAST
      )
      FROM campaigns c
      LEFT JOIN vw_campaign_progress cp ON cp.campaign_id = c.id
      WHERE c.church_id = v_church_id
        AND c.is_visible_on_portal = true
        AND c.status = 'active'
        AND c.deleted_at IS NULL
    ), '[]'::jsonb),
    'serviceTimes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',           st.id,
          'day_of_week',  st.day_of_week,
          'start_time',   st.start_time,
          'duration_min', st.duration_min,
          'meeting_type', st.meeting_type,
          'location',     st.location,
          'address',      st.address,
          'sort_order',   st.sort_order
        )
        ORDER BY st.day_of_week, st.start_time
      )
      FROM service_times st
      WHERE st.church_id = v_church_id
        AND st.is_active = true
    ), '[]'::jsonb),
    'funds', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',         f.id,
          'name',       f.name,
          'is_default', f.is_default
        )
        ORDER BY f.is_default DESC, f.sort_order, f.name
      )
      FROM funds f
      WHERE f.church_id = v_church_id
        AND f.is_active = true
    ), '[]'::jsonb),
    'payment_available', COALESCE(v_payment_available, false),
    'latestSermons', COALESCE((
      SELECT jsonb_agg(row_to_json(s)) FROM (
        SELECT
          se.id, se.title, se.speaker, se.series, se.scripture_reference,
          se.sermon_date, se.video_url, se.audio_url, se.thumbnail_url, se.duration_seconds
        FROM sermons se
        WHERE se.church_id = v_church_id
          AND se.is_visible_on_portal = true
          AND se.deleted_at IS NULL
        ORDER BY se.sermon_date DESC, se.sort_order, se.created_at DESC
        LIMIT 3
      ) s
    ), '[]'::jsonb),
    'upcomingEvents', COALESCE((
      SELECT jsonb_agg(row_to_json(e)) FROM (
        SELECT
          ev.id, ev.title, ev.description, ev.starts_at, ev.ends_at,
          ev.location, ev.address, ev.image_url, ev.registration_url,
          ev.category, ev.is_featured
        FROM events ev
        WHERE ev.church_id = v_church_id
          AND ev.is_visible_on_portal = true
          AND ev.deleted_at IS NULL
          AND ev.starts_at >= now()
        ORDER BY ev.starts_at ASC
        LIMIT 4
      ) e
    ), '[]'::jsonb),
    'featuredProjects', COALESCE((
      SELECT jsonb_agg(row_to_json(p)) FROM (
        SELECT
          pr.id, pr.name, pr.description, pr.category,
          pr.image_url, pr.link_url, pr.leader_name,
          -- Only expose a donation target the donor can actually give to,
          -- so MinistryCard's "Give" button never appears for a dead target.
          CASE WHEN EXISTS (
            SELECT 1 FROM campaigns c
            WHERE c.id = pr.campaign_id AND c.church_id = v_church_id
              AND c.is_visible_on_portal = true AND c.status = 'active' AND c.deleted_at IS NULL
          ) THEN pr.campaign_id END AS campaign_id,
          CASE WHEN EXISTS (
            SELECT 1 FROM funds f
            WHERE f.id = pr.fund_id AND f.church_id = v_church_id
              AND f.is_active = true AND f.deleted_at IS NULL
          ) THEN pr.fund_id END AS fund_id
        FROM projects pr
        WHERE pr.church_id = v_church_id
          AND pr.is_visible_on_portal = true
          AND pr.deleted_at IS NULL
        ORDER BY pr.is_featured DESC, pr.sort_order, pr.name
        LIMIT 6
      ) p
    ), '[]'::jsonb),
    'latestPodcast', COALESCE((
      SELECT jsonb_agg(row_to_json(pe)) FROM (
        SELECT
          ep.id, ep.title, ep.season, ep.episode_number,
          ep.spotify_url, ep.apple_url, ep.youtube_url, ep.audio_url,
          ep.cover_image_url, ep.published_at, ep.duration_seconds
        FROM podcast_episodes ep
        WHERE ep.church_id = v_church_id
          AND ep.is_visible_on_portal = true
          AND ep.deleted_at IS NULL
        ORDER BY ep.season DESC NULLS LAST, ep.episode_number DESC NULLS LAST, ep.published_at DESC
        LIMIT 3
      ) pe
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_portal_by_slug(TEXT) TO authenticated;

-- =====================================================================
-- PHASE 2b — rpc_public_projects_by_slug (full body from 20260603120001)
--   Same donation-target gating for the Ministries page.
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_public_projects_by_slug(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_published BOOLEAN;
  v_items JSONB;
BEGIN
  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN RETURN NULL; END IF;

  SELECT id INTO v_church_id FROM churches
  WHERE slug = lower(btrim(p_slug)) AND deleted_at IS NULL;
  IF v_church_id IS NULL THEN RETURN NULL; END IF;

  SELECT (publish_status = 'published') INTO v_published
  FROM portal_settings WHERE church_id = v_church_id;
  IF NOT COALESCE(v_published, false) THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT
      pr.id, pr.name, pr.description, pr.category,
      pr.image_url, pr.link_url, pr.leader_name,
      CASE WHEN EXISTS (
        SELECT 1 FROM campaigns c
        WHERE c.id = pr.campaign_id AND c.church_id = v_church_id
          AND c.is_visible_on_portal = true AND c.status = 'active' AND c.deleted_at IS NULL
      ) THEN pr.campaign_id END AS campaign_id,
      CASE WHEN EXISTS (
        SELECT 1 FROM funds f
        WHERE f.id = pr.fund_id AND f.church_id = v_church_id
          AND f.is_active = true AND f.deleted_at IS NULL
      ) THEN pr.fund_id END AS fund_id
    FROM projects pr
    WHERE pr.church_id = v_church_id
      AND pr.is_visible_on_portal = true
      AND pr.deleted_at IS NULL
    ORDER BY pr.is_featured DESC, pr.sort_order, pr.name
  ) t;

  RETURN jsonb_build_object('items', v_items);
END $$;

GRANT EXECUTE ON FUNCTION rpc_public_projects_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION rpc_public_projects_by_slug(TEXT) TO authenticated;

-- =====================================================================
-- PHASE 3 — Soft-delete safety net (defensive; no UI delete path today).
-- When a campaign/fund is soft-deleted, detach dependents so a future delete
-- can't leave a charging subscription or a dead "Give" target.
-- =====================================================================
CREATE OR REPLACE FUNCTION _trg_donation_target_soft_deleted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fallback_fund UUID;
BEGIN
  IF TG_TABLE_NAME = 'campaigns' THEN
    -- campaign_id is nullable on both → just detach.
    UPDATE recurring_donation_profiles SET campaign_id = NULL WHERE campaign_id = NEW.id;
    UPDATE projects SET campaign_id = NULL WHERE campaign_id = NEW.id AND deleted_at IS NULL;
  ELSIF TG_TABLE_NAME = 'funds' THEN
    -- recurring_donation_profiles.fund_id is NOT NULL → move to another fund.
    SELECT id INTO v_fallback_fund FROM funds
     WHERE church_id = NEW.church_id AND is_active = true AND deleted_at IS NULL AND id <> NEW.id
     ORDER BY is_default DESC, sort_order, name LIMIT 1;
    IF v_fallback_fund IS NOT NULL THEN
      UPDATE recurring_donation_profiles SET fund_id = v_fallback_fund WHERE fund_id = NEW.id;
    END IF;
    UPDATE projects SET fund_id = NULL WHERE fund_id = NEW.id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_campaign_soft_delete_cleanup
  AFTER UPDATE OF deleted_at ON campaigns
  FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION _trg_donation_target_soft_deleted();

CREATE TRIGGER trg_fund_soft_delete_cleanup
  AFTER UPDATE OF deleted_at ON funds
  FOR EACH ROW WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION _trg_donation_target_soft_deleted();
