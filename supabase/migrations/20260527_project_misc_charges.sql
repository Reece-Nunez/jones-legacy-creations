-- ── Project miscellaneous charges ─────────────────────────────────────────
-- One-off line items that don't fit the existing cost buckets:
--   • Buyer rate buy-downs paid outside of closing
--   • Anomalous first-month interest (lender fees rolled in)
--   • Late fees, prepayment penalties
--   • Anything else that has to be subtracted from projected_profit but
--     doesn't belong in contractor_payments, sale_closing_costs, or any
--     other existing field.
--
-- The view (v_project_financials) is extended with a `total_misc_charges`
-- aggregate so consumers can reconstruct projected_profit themselves; the
-- helper (lib/finance/project-financials.ts) subtracts the same sum so the
-- displayed number matches.

CREATE TABLE IF NOT EXISTS public.project_misc_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  charge_date DATE,
  category TEXT,  -- optional free-text tag: 'buyer_credit', 'lender_fee', etc.
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_misc_charges_project
  ON public.project_misc_charges (project_id);

COMMENT ON TABLE public.project_misc_charges IS
  'Misc one-off costs subtracted from projected_profit. For items not '
  'captured by contractor_payments, sale_closing_costs, origination, '
  'interest, or down_payment. See lib/finance/project-financials.ts.';

-- RLS: admin-only, matching the convention from 20260514_tighten_rls.sql
ALTER TABLE public.project_misc_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all on project_misc_charges"
  ON public.project_misc_charges
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Rebuild v_project_financials to expose total_misc_charges
DROP VIEW IF EXISTS public.v_project_financials;
CREATE VIEW public.v_project_financials AS
SELECT
  p.id AS project_id,
  p.name,
  p.status,
  p.financing_type,
  p.sale_price,
  p.loan_amount,
  p.down_payment,
  p.origination_fee_percent,
  p.interest_rate,
  p.loan_start_date,
  p.end_date,
  p.sale_closing_costs,
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
  COALESCE((
    SELECT SUM(mc.amount)
    FROM project_misc_charges mc
    WHERE mc.project_id = p.id
  ), 0) AS total_misc_charges,
  (COALESCE(p.loan_amount, 0) * COALESCE(p.origination_fee_percent, 0) / 100)::numeric AS origination_fee
FROM projects p;

ALTER VIEW public.v_project_financials SET (security_invoker = true);

COMMENT ON VIEW public.v_project_financials IS
  'Source of truth for per-project totals. Accrued interest and projected '
  'profit stay in app code (lib/finance/project-financials.ts) because they '
  'depend on asOf date. sale_closing_costs, down_payment, and '
  'total_misc_charges are exposed so consumers can reconstruct the '
  'projected_profit formula themselves if needed.';
