-- =====================================================================
-- Stripe Connect (Express) for churches to RECEIVE online donations into
-- THEIR OWN bank account (direct charges on the connected account).
--   1. Extra status columns on churches (for the onboarding checklist UI).
--   2. Flip rpc_public_portal_by_slug.payment_available + expose
--      stripe_account_id (the Payment Element needs it client-side).
--   3. Service-role fulfillment RPCs called only by the Connect webhook:
--        rpc_set_church_stripe_status        (account.updated)
--        rpc_complete_donation_from_payment  (payment_intent / invoice paid)
-- churches.stripe_account_id + stripe_charges_enabled already exist
-- (20260528120002_core_tables.sql).
-- =====================================================================

ALTER TABLE churches ADD COLUMN IF NOT EXISTS stripe_payouts_enabled   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS stripe_onboarded_at      TIMESTAMPTZ;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS stripe_requirements      JSONB;

-- =====================================================================
-- rpc_public_portal_by_slug — full body copied from 20260605120016
-- (the latest correct version) with TWO changes:
--   * payment_available now reflects the church's Connect status
--   * the church object now exposes stripe_account_id
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
          pr.fund_id, pr.campaign_id
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
-- rpc_set_church_stripe_status — webhook-driven Connect status sync.
-- =====================================================================
CREATE OR REPLACE FUNCTION rpc_set_church_stripe_status(
  p_account_id   TEXT,
  p_charges      BOOLEAN,
  p_payouts      BOOLEAN,
  p_details      BOOLEAN,
  p_requirements JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE churches
     SET stripe_charges_enabled   = COALESCE(p_charges, stripe_charges_enabled),
         stripe_payouts_enabled   = COALESCE(p_payouts, stripe_payouts_enabled),
         stripe_details_submitted = COALESCE(p_details, stripe_details_submitted),
         stripe_requirements      = COALESCE(p_requirements, stripe_requirements),
         stripe_onboarded_at      = CASE WHEN COALESCE(p_charges, false) AND stripe_onboarded_at IS NULL
                                         THEN now() ELSE stripe_onboarded_at END,
         updated_at = now()
   WHERE stripe_account_id = p_account_id;
END $$;

GRANT EXECUTE ON FUNCTION rpc_set_church_stripe_status(TEXT, BOOLEAN, BOOLEAN, BOOLEAN, JSONB) TO service_role;

-- =====================================================================
-- rpc_complete_donation_from_payment — webhook-driven donation fulfillment.
-- Idempotent on stripe_payment_intent_id. Handles one-time (intent linked)
-- and each recurring cycle (subscription → profile + per-cycle donation).
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
  v_existing    UUID;
  v_fund_id     UUID;
  v_person_id   UUID;
  v_profile_id  UUID;
  v_donation_id UUID;
  v_name        TEXT;
  v_email       CITEXT;
  v_campaign_id UUID;
  v_freq        TEXT;
  v_intent      donation_intents%ROWTYPE;
BEGIN
  -- Idempotency: one donation per Stripe PaymentIntent.
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

  -- Donor person: link by email if it exists; create one only when recurring
  -- (the recurring profile requires a non-null donor_person_id).
  IF v_intent.donor_person_id IS NOT NULL THEN
    v_person_id := v_intent.donor_person_id;
  ELSIF v_email IS NOT NULL THEN
    SELECT id INTO v_person_id FROM people
     WHERE church_id = p_church_id AND email = v_email AND deleted_at IS NULL
     ORDER BY created_at LIMIT 1;
  END IF;
  IF v_person_id IS NULL AND v_freq <> 'one_time' THEN
    INSERT INTO people (church_id, person_type, first_name, email, status)
    VALUES (p_church_id, 'individual', v_name, v_email, 'donor')
    RETURNING id INTO v_person_id;
  END IF;

  -- Recurring profile (one per Stripe subscription).
  IF p_stripe_subscription_id IS NOT NULL AND v_person_id IS NOT NULL THEN
    SELECT id INTO v_profile_id FROM recurring_donation_profiles
     WHERE stripe_subscription_id = p_stripe_subscription_id;
    IF v_profile_id IS NULL THEN
      INSERT INTO recurring_donation_profiles
        (church_id, donor_person_id, fund_id, campaign_id, amount_cents, frequency,
         payment_method, stripe_subscription_id, status, started_at)
      VALUES
        (p_church_id, v_person_id, v_fund_id, v_campaign_id, p_amount_cents,
         CASE WHEN v_freq IN ('monthly','annual') THEN v_freq ELSE 'monthly' END,
         'card', p_stripe_subscription_id, 'active', p_paid_at)
      RETURNING id INTO v_profile_id;
    END IF;
  END IF;

  -- The paid donation row.
  INSERT INTO donations (
    church_id, donor_person_id, donor_name_snapshot, donor_email_snapshot,
    fund_id, campaign_id, recurring_profile_id, amount_cents, payment_method,
    payment_status, frequency, donation_date, stripe_payment_intent_id, stripe_charge_id
  ) VALUES (
    p_church_id, v_person_id, v_name, v_email,
    v_fund_id, v_campaign_id, v_profile_id, p_amount_cents, p_payment_method,
    'paid', v_freq, p_paid_at, p_stripe_payment_intent_id, p_stripe_charge_id
  ) RETURNING id INTO v_donation_id;

  IF v_person_id IS NOT NULL THEN
    UPDATE people SET last_activity_at = p_paid_at WHERE id = v_person_id;
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
                       'payment_intent', p_stripe_payment_intent_id, 'frequency', v_freq));

  RETURN jsonb_build_object('donation_id', v_donation_id, 'recurring_profile_id', v_profile_id);
END $$;

GRANT EXECUTE ON FUNCTION rpc_complete_donation_from_payment(
  UUID, BIGINT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ
) TO service_role;
