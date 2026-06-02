-- =====================================================================
-- FASE 13 · 02 — Dashboard real-time RPC
-- =====================================================================
-- Reemplaza el uso de mv_church_monthly_donations (stale sin refresh)
-- por una RPC que calcula la serie mensual en tiempo real. Con el volumen
-- actual (<10k donaciones) corre en <10 ms. Escala bien hasta ~100k.
--
-- La materialized view queda en la base de datos pero deja de usarse desde
-- el frontend. Documentado como "no-mantenida" en ARCHITECTURE.md.

CREATE OR REPLACE FUNCTION rpc_monthly_donations_series(
  p_church_id   UUID,
  p_months_back INT DEFAULT 8
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_result JSONB;
BEGIN
  IF NOT (p_church_id = ANY (user_church_ids())) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_months_back IS NULL OR p_months_back < 1 THEN
    p_months_back := 8;
  ELSIF p_months_back > 60 THEN
    p_months_back := 60;
  END IF;

  v_start_date := date_trunc('month', now()) - (p_months_back - 1 || ' months')::INTERVAL;

  WITH month_series AS (
    SELECT generate_series(
      v_start_date,
      date_trunc('month', now()),
      INTERVAL '1 month'
    ) AS month_start
  ),
  agg AS (
    SELECT
      date_trunc('month', donation_date) AS month_start,
      COUNT(*)                            AS donation_count,
      SUM(amount_cents)::BIGINT           AS total_cents
    FROM donations
    WHERE church_id = p_church_id
      AND payment_status = 'paid'
      AND deleted_at IS NULL
      AND donation_date >= v_start_date
    GROUP BY date_trunc('month', donation_date)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'year',           EXTRACT(YEAR  FROM ms.month_start)::INT,
      'month',          EXTRACT(MONTH FROM ms.month_start)::INT,
      'month_label',    to_char(ms.month_start, 'YYYY-MM'),
      'total_cents',    COALESCE(a.total_cents, 0),
      'donation_count', COALESCE(a.donation_count, 0)
    )
    ORDER BY ms.month_start
  ) INTO v_result
  FROM month_series ms
  LEFT JOIN agg a ON a.month_start = ms.month_start;

  RETURN COALESCE(v_result, '[]'::jsonb);
END $$;

COMMENT ON FUNCTION rpc_monthly_donations_series IS
  'Serie mensual de donaciones pagadas. Real-time, reemplaza mv_church_monthly_donations para dashboard y reportes.';

GRANT EXECUTE ON FUNCTION rpc_monthly_donations_series(UUID, INT) TO authenticated;
