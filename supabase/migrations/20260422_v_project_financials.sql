-- Raw per-project financial aggregates. Time-dependent figures (accrued
-- interest) are NOT included — compute those in app code with asOf control
-- using lib/finance/project-financials.ts. Reports, BI tools, and exports
-- can hit this view directly to guarantee the same numbers the UI shows.

CREATE OR REPLACE VIEW v_project_financials AS
SELECT
  p.id AS project_id,
  p.name,
  p.status,
  p.sale_price,
  p.loan_amount,
  p.origination_fee_percent,
  p.interest_rate,
  p.end_date,
  COALESCE((
    SELECT SUM(cp.amount)
    FROM contractor_payments cp
    WHERE cp.project_id = p.id
  ), 0) AS total_costs,
  COALESCE((
    SELECT SUM(dr.amount)
    FROM draw_requests dr
    WHERE dr.project_id = p.id AND dr.status = 'funded'
  ), 0) AS draws_funded,
  COALESCE((
    SELECT SUM(dr.amount)
    FROM draw_requests dr
    WHERE dr.project_id = p.id AND dr.status IN ('submitted', 'approved')
  ), 0) AS draws_pending,
  COALESCE((
    SELECT SUM(dr.amount)
    FROM draw_requests dr
    WHERE dr.project_id = p.id
  ), 0) AS draws_total,
  (COALESCE(p.loan_amount, 0) * COALESCE(p.origination_fee_percent, 0) / 100)::numeric AS origination_fee
FROM projects p;

COMMENT ON VIEW v_project_financials IS
  'Source of truth for per-project totals. Accrued interest is computed in app code (time-dependent). Keep in sync with lib/finance/project-financials.ts.';
