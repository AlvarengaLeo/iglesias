-- =====================================================================
-- 08 — Functions & RPCs
-- =====================================================================

-- ---------- set_updated_at: trigger genérico ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

COMMENT ON FUNCTION set_updated_at IS 'Trigger function to auto-update updated_at column.';

-- ---------- user_church_ids: helper RLS ----------
CREATE OR REPLACE FUNCTION user_church_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(church_id), '{}'::uuid[])
  FROM church_users
  WHERE user_id = auth.uid() AND is_active = true;
$$;

COMMENT ON FUNCTION user_church_ids IS 'Returns array of church IDs the current user belongs to. Used by RLS policies.';

-- ---------- user_role_in_church: helper RLS ----------
CREATE OR REPLACE FUNCTION user_role_in_church(p_church_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM church_users
  WHERE user_id = auth.uid()
    AND church_id = p_church_id
    AND is_active = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION user_role_in_church IS 'Returns the role of the current user in a specific church. NULL if not member.';

-- ---------- rpc_assign_receipt_number: numeración atómica ----------
CREATE OR REPLACE FUNCTION rpc_assign_receipt_number(p_church_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year SMALLINT := EXTRACT(YEAR FROM now())::SMALLINT;
  v_next INTEGER;
BEGIN
  INSERT INTO church_receipt_sequences (church_id, tax_year, next_number)
    VALUES (p_church_id, v_year, 1)
  ON CONFLICT (church_id, tax_year) DO UPDATE
    SET next_number = church_receipt_sequences.next_number + 1,
        updated_at = now()
  RETURNING next_number INTO v_next;

  RETURN v_year::text || '-' || LPAD(v_next::text, 6, '0');
END $$;

COMMENT ON FUNCTION rpc_assign_receipt_number IS 'Lock-safe atomic increment de receipt number por (church, year). Formato: YYYY-NNNNNN.';

-- ---------- rpc_register_donation ----------
CREATE OR REPLACE FUNCTION rpc_register_donation(
  p_church_id UUID,
  p_donor_person_id UUID,
  p_amount_cents BIGINT,
  p_fund_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_payment_status TEXT DEFAULT 'paid',
  p_frequency TEXT DEFAULT 'one_time',
  p_donation_date TIMESTAMPTZ DEFAULT now(),
  p_notes TEXT DEFAULT NULL,
  p_auto_generate_receipt BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_donation_id UUID;
  v_receipt_id UUID;
  v_receipt_number TEXT;
  v_donor_name TEXT;
  v_donor_email CITEXT;
  v_role TEXT;
BEGIN
  -- Permission check
  v_role := user_role_in_church(p_church_id);
  IF v_role NOT IN ('admin','pastor','treasurer') THEN
    RAISE EXCEPTION 'forbidden: role % cannot register donations', v_role USING ERRCODE = '42501';
  END IF;

  -- Snapshot donor info
  SELECT
    COALESCE(NULLIF(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')), ''), organization_name),
    email
  INTO v_donor_name, v_donor_email
  FROM people
  WHERE id = p_donor_person_id AND church_id = p_church_id AND deleted_at IS NULL;

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

  -- Update last_activity_at on donor
  UPDATE people SET last_activity_at = p_donation_date WHERE id = p_donor_person_id;

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
    jsonb_build_object(
      'amount_cents', p_amount_cents,
      'fund_id', p_fund_id,
      'campaign_id', p_campaign_id,
      'payment_method', p_payment_method,
      'frequency', p_frequency,
      'receipt_id', v_receipt_id
    )
  );

  RETURN jsonb_build_object(
    'donation_id', v_donation_id,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number
  );
END $$;

COMMENT ON FUNCTION rpc_register_donation IS 'Crea donation + opcionalmente receipt en una transacción. Verifica role del caller.';

-- ---------- rpc_resend_receipt ----------
CREATE OR REPLACE FUNCTION rpc_resend_receipt(
  p_receipt_id UUID,
  p_reason TEXT,
  p_reason_notes TEXT DEFAULT NULL,
  p_recipient_email TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id UUID;
  v_recipient CITEXT;
  v_role TEXT;
  v_delivery_id UUID;
BEGIN
  SELECT
    church_id,
    COALESCE(p_recipient_email::citext, person_email_snapshot)
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

  IF v_recipient IS NULL THEN
    RAISE EXCEPTION 'no recipient email available';
  END IF;

  -- Insert delivery row (NO new donation, NO new receipt)
  INSERT INTO receipt_deliveries (
    church_id, receipt_id, delivery_channel, recipient_email,
    reason, reason_notes, status, sent_by
  ) VALUES (
    v_church_id, p_receipt_id, 'email', v_recipient,
    p_reason, p_reason_notes, 'queued', auth.uid()
  ) RETURNING id INTO v_delivery_id;

  -- Update receipt status to 'sent' if not already
  UPDATE contribution_receipts
  SET status = 'sent'
  WHERE id = p_receipt_id AND status NOT IN ('sent','superseded','void');

  -- Audit log
  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_church_id, auth.uid(), 'receipt.resend', 'receipt', p_receipt_id,
    jsonb_build_object('reason', p_reason, 'recipient', v_recipient)
  );

  RETURN jsonb_build_object(
    'delivery_id', v_delivery_id,
    'recipient', v_recipient
  );
END $$;

COMMENT ON FUNCTION rpc_resend_receipt IS 'Reenvía un recibo. NO crea donation ni receipt nuevos. Solo inserta receipt_deliveries.';

-- ---------- rpc_publish_portal ----------
CREATE OR REPLACE FUNCTION rpc_publish_portal(p_church_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := user_role_in_church(p_church_id);
  IF v_role NOT IN ('admin','pastor','secretary') THEN
    RAISE EXCEPTION 'forbidden: role % cannot publish portal', v_role USING ERRCODE = '42501';
  END IF;

  UPDATE portal_settings
  SET
    published_data = draft_data,
    publish_status = 'published',
    published_at = now(),
    published_by = auth.uid()
  WHERE church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'portal_settings not found for church';
  END IF;

  INSERT INTO audit_logs (church_id, actor_user_id, action, entity_type, entity_id)
  VALUES (p_church_id, auth.uid(), 'portal.publish', 'portal', p_church_id);

  RETURN jsonb_build_object(
    'church_id', p_church_id,
    'published_at', now()
  );
END $$;

COMMENT ON FUNCTION rpc_publish_portal IS 'Copia draft_data → published_data. Marca publish_status. Audit log.';

-- ---------- rpc_discard_portal_draft ----------
CREATE OR REPLACE FUNCTION rpc_discard_portal_draft(p_church_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := user_role_in_church(p_church_id);
  IF v_role NOT IN ('admin','pastor','secretary') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE portal_settings
  SET
    draft_data = published_data,
    publish_status = CASE WHEN published_at IS NOT NULL THEN 'published' ELSE 'draft' END,
    draft_updated_at = now(),
    draft_updated_by = auth.uid()
  WHERE church_id = p_church_id;

  RETURN jsonb_build_object('discarded_at', now());
END $$;

-- ---------- rpc_dashboard_kpis ----------
CREATE OR REPLACE FUNCTION rpc_dashboard_kpis(
  p_church_id UUID,
  p_month_anchor TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start TIMESTAMPTZ := date_trunc('month', p_month_anchor);
  v_month_end   TIMESTAMPTZ := v_month_start + INTERVAL '1 month';
  v_prev_start  TIMESTAMPTZ := v_month_start - INTERVAL '1 month';
  v_kpis        JSONB;
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
      WHERE church_id = p_church_id AND started_at >= v_month_start AND started_at < v_month_end
    ),
    'active_campaigns_count', (
      SELECT COUNT(*) FROM campaigns
      WHERE church_id = p_church_id AND status = 'active' AND deleted_at IS NULL
    ),
    'campaigns_near_goal', (
      SELECT COUNT(*) FROM vw_campaign_progress
      WHERE church_id = p_church_id AND progress_pct >= 90 AND progress_pct < 100
    ),
    'receipts_sent_month', (
      SELECT COUNT(*) FROM receipt_deliveries
      WHERE church_id = p_church_id
        AND sent_at >= v_month_start AND sent_at < v_month_end
    ),
    'receipts_resent_month', (
      SELECT COUNT(*) FROM receipt_deliveries
      WHERE church_id = p_church_id
        AND sent_at >= v_month_start AND sent_at < v_month_end
        AND reason != 'initial'
    ),
    'unique_donors_month', (
      SELECT COUNT(DISTINCT donor_person_id)
      FROM donations
      WHERE church_id = p_church_id
        AND donation_date >= v_month_start AND donation_date < v_month_end
        AND payment_status = 'paid' AND deleted_at IS NULL
    )
  ) INTO v_kpis;

  RETURN v_kpis;
END $$;

COMMENT ON FUNCTION rpc_dashboard_kpis IS 'Devuelve todos los KPIs del dashboard en una sola llamada. p_month_anchor define el mes target (default: ahora).';

-- ---------- refresh_monthly_donations ----------
CREATE OR REPLACE FUNCTION refresh_monthly_donations()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_church_monthly_donations;
END $$;

COMMENT ON FUNCTION refresh_monthly_donations IS 'Refresh wrapper para mv_church_monthly_donations. Llamado por pg_cron o manualmente.';
