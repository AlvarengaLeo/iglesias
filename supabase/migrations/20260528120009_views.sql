-- =====================================================================
-- 09 — Views & Materialized Views
-- =====================================================================

-- ---------- vw_campaign_progress ----------
CREATE VIEW vw_campaign_progress AS
SELECT
  c.id                                                                  AS campaign_id,
  c.church_id,
  c.name,
  c.slug,
  c.fund_id,
  c.goal_cents,
  c.currency,
  c.start_date,
  c.end_date,
  c.status,
  c.is_visible_on_portal,
  c.image_url,
  COALESCE(SUM(d.amount_cents) FILTER (WHERE d.payment_status = 'paid'), 0)        AS collected_cents,
  COUNT(DISTINCT d.donor_person_id) FILTER (WHERE d.payment_status = 'paid')       AS donor_count,
  COUNT(*) FILTER (WHERE d.payment_status = 'paid')                                AS donation_count,
  CASE
    WHEN c.goal_cents = 0 THEN 0
    ELSE LEAST(
      100,
      ROUND(
        (COALESCE(SUM(d.amount_cents) FILTER (WHERE d.payment_status = 'paid'), 0) * 100.0)
        / c.goal_cents,
        2
      )
    )
  END AS progress_pct
FROM campaigns c
LEFT JOIN donations d
  ON d.campaign_id = c.id AND d.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id;

COMMENT ON VIEW vw_campaign_progress IS 'Progreso live de cada campaña: collected_cents, donor_count, progress_pct.';

-- ---------- vw_active_recurring ----------
CREATE VIEW vw_active_recurring AS
SELECT
  r.id,
  r.church_id,
  r.donor_person_id,
  r.fund_id,
  r.campaign_id,
  r.amount_cents,
  r.currency,
  r.frequency,
  r.payment_method,
  r.next_charge_date,
  r.started_at,
  p.first_name,
  p.last_name,
  p.organization_name,
  p.email AS donor_email
FROM recurring_donation_profiles r
JOIN people p ON p.id = r.donor_person_id
WHERE r.status = 'active'
  AND p.deleted_at IS NULL;

COMMENT ON VIEW vw_active_recurring IS 'Perfiles recurrentes activos con info del donante para KPI "Donantes recurrentes".';

-- ---------- mv_church_monthly_donations ----------
CREATE MATERIALIZED VIEW mv_church_monthly_donations AS
SELECT
  church_id,
  EXTRACT(YEAR FROM donation_date)::INT  AS year,
  EXTRACT(MONTH FROM donation_date)::INT AS month,
  fund_id,
  payment_method,
  frequency,
  COUNT(*)                                AS donation_count,
  COUNT(DISTINCT donor_person_id)         AS unique_donor_count,
  SUM(amount_cents)                       AS total_cents,
  SUM(processing_fee_cents)               AS total_fees_cents
FROM donations
WHERE payment_status = 'paid'
  AND deleted_at IS NULL
GROUP BY church_id,
         EXTRACT(YEAR FROM donation_date),
         EXTRACT(MONTH FROM donation_date),
         fund_id,
         payment_method,
         frequency
WITH DATA;

COMMENT ON MATERIALIZED VIEW mv_church_monthly_donations IS 'Pre-agregación mensual para dashboard y reportes. Refresh con pg_cron cada 5 min.';

CREATE UNIQUE INDEX idx_mv_monthly_donations_pk
  ON mv_church_monthly_donations (church_id, year, month, fund_id, payment_method, frequency);

-- pg_cron schedule (only if pg_cron is available):
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'refresh-monthly-donations',
      '*/5 * * * *',
      $cron$SELECT refresh_monthly_donations();$cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron no disponible. Refresh manual de mv_church_monthly_donations via refresh_monthly_donations().';
  END IF;
END $$;
