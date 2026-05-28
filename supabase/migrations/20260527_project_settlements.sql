-- ── Project Settlements ──────────────────────────────────────────────────
-- Itemized record of a closing event — either the construction-loan
-- origination (settlement_type='purchase') or the final sale
-- (settlement_type='sale'). Captures the ALTA Settlement Statement
-- breakdown that drives Blake's sale_closing_costs number.
--
-- Why a table instead of more columns on projects:
--   • A project can have multiple settlements (lot purchase + sale, or
--     refinance events). One row per event lets us model that cleanly.
--   • The ALTA breakdown has 8-15 line items most of which are rare.
--     Common ones get their own columns for fast queries; uncommon ones
--     live in other_fees JSONB so we never need a schema migration for
--     "this lender called the doc-prep fee something weird".
--   • Lets us upload the original ALTA PDF and link to it for audit.
--
-- How the helper uses it (lib/finance/project-financials.ts):
--   When a settlement_type='sale' row exists for a project, the helper
--   derives sale_closing_costs from its line items (title + escrow +
--   recording + prorated_taxes + seller_concessions + other_fees_sum)
--   instead of using the manual projects.sale_closing_costs field. This
--   replaces the manual entry with an itemized derivation. The
--   projects.sale_closing_costs field becomes the fallback for projects
--   that don't have a settlement record yet.
--
-- Caveat (user discipline):
--   Anything that appears on an ALTA settlement belongs in this table.
--   project_misc_charges should NOT duplicate ALTA line items — that
--   would double-count. The helper can't auto-detect this; we leave it
--   to Blake's data discipline and surface it in the UI as a warning if
--   we ever see overlap.

CREATE TABLE IF NOT EXISTS public.project_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  settlement_date DATE NOT NULL,
  settlement_type TEXT NOT NULL CHECK (settlement_type IN ('purchase', 'sale')),

  -- ── Common / sale-side ─────────────────────────────────────────────
  -- sale_price duplicates projects.sale_price for sale settlements; we
  -- keep it here too because the ALTA might list a different number
  -- (e.g. price reduction not yet reflected on the project record).
  sale_price NUMERIC,
  -- Buyer credits paid by the seller — rate buy-downs, repair credits.
  seller_concessions NUMERIC,
  title_insurance NUMERIC,
  escrow_fee NUMERIC,
  -- All government/title recording-type fees rolled together (doc prep,
  -- e-filing, reconveyance recording, SCR filing, etc.) — these are
  -- typically small individually and grouping them keeps the schema
  -- manageable. Individual items can still live in other_fees if Blake
  -- wants to track them separately.
  recording_fees NUMERIC,
  prorated_taxes NUMERIC,
  -- HOA dues, transfer taxes, home warranty, anything one-off:
  -- [{ "label": "Termite inspection", "amount": 75 }, …]
  other_fees JSONB DEFAULT '[]'::jsonb,
  -- What the lender pulled at closing (sale side).
  loan_payoff NUMERIC,
  -- The wire amount Blake actually received. For a sale settlement,
  -- net_to_seller = sale_price - seller_concessions - title_insurance -
  -- escrow_fee - recording_fees - prorated_taxes - sum(other_fees) -
  -- loan_payoff. If the ALTA shows a different number we trust the ALTA
  -- and surface the discrepancy.
  net_to_seller NUMERIC,

  -- ── Purchase-side ─────────────────────────────────────────────────
  purchase_price NUMERIC,
  earnest_money NUMERIC,
  loan_amount NUMERIC,
  -- Cash Blake brought to closing (out of pocket).
  cash_to_close NUMERIC,

  -- ── Audit + provenance ────────────────────────────────────────────
  document_url TEXT,
  document_name TEXT,
  notes TEXT,
  ai_extracted BOOLEAN NOT NULL DEFAULT FALSE,
  user_verified BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_settlements_project
  ON public.project_settlements (project_id, settlement_type, settlement_date);

COMMENT ON TABLE public.project_settlements IS
  'Itemized closing-event records (ALTA settlement statements). One row '
  'per closing — typically one purchase (construction loan origination) '
  'and one sale per project. When a sale settlement exists, the helper '
  'derives sale_closing_costs from its line items instead of using the '
  'manual projects.sale_closing_costs field.';

ALTER TABLE public.project_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all on project_settlements"
  ON public.project_settlements
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Extend v_project_financials with settlement aggregates. Consumers can
-- check has_sale_settlement to know whether they're looking at itemized
-- closing costs or a manual estimate.
DROP VIEW IF EXISTS public.v_project_financials;
CREATE VIEW public.v_project_financials AS
SELECT
  p.id AS project_id, p.name, p.status, p.financing_type,
  p.sale_price, p.loan_amount, p.down_payment,
  p.origination_fee_percent, p.interest_rate, p.loan_start_date,
  p.end_date, p.sale_closing_costs,
  COALESCE((SELECT SUM(cp.amount) FROM contractor_payments cp WHERE cp.project_id = p.id), 0) AS total_costs,
  COALESCE((SELECT SUM(dr.amount) FROM draw_requests dr WHERE dr.project_id = p.id AND dr.status = 'funded'), 0) AS draws_funded,
  COALESCE((SELECT SUM(dr.amount) FROM draw_requests dr WHERE dr.project_id = p.id AND dr.status IN ('submitted', 'approved')), 0) AS draws_pending,
  COALESCE((SELECT SUM(dr.amount) FROM draw_requests dr WHERE dr.project_id = p.id), 0) AS draws_total,
  COALESCE((SELECT SUM(mc.amount) FROM project_misc_charges mc WHERE mc.project_id = p.id), 0) AS total_misc_charges,
  EXISTS (SELECT 1 FROM loan_ledger ll WHERE ll.project_id = p.id) AS has_loan_ledger,
  COALESCE((SELECT SUM(ll.amount) FROM loan_ledger ll WHERE ll.project_id = p.id AND ll.entry_type = 'disbursement'), 0) AS ledger_disbursements,
  COALESCE((SELECT SUM(ll.amount) FROM loan_ledger ll WHERE ll.project_id = p.id AND ll.entry_type = 'interest_accrual'), 0) AS ledger_interest_accrued,
  COALESCE((SELECT SUM(ll.amount) FROM loan_ledger ll WHERE ll.project_id = p.id AND ll.entry_type = 'interest_payment'), 0) AS ledger_interest_paid,
  COALESCE((SELECT SUM(ll.amount) FROM loan_ledger ll WHERE ll.project_id = p.id AND ll.entry_type = 'principal_payment'), 0) AS ledger_principal_paid,
  COALESCE((SELECT SUM(ll.amount) FROM loan_ledger ll WHERE ll.project_id = p.id AND ll.entry_type = 'fee'), 0) AS ledger_fees,
  COALESCE((SELECT SUM(ll.amount) FROM loan_ledger ll WHERE ll.project_id = p.id AND ll.entry_type = 'payoff'), 0) AS ledger_payoff,
  EXISTS (SELECT 1 FROM project_settlements ps WHERE ps.project_id = p.id AND ps.settlement_type = 'sale') AS has_sale_settlement,
  EXISTS (SELECT 1 FROM project_settlements ps WHERE ps.project_id = p.id AND ps.settlement_type = 'purchase') AS has_purchase_settlement,
  (
    SELECT ps.net_to_seller
    FROM project_settlements ps
    WHERE ps.project_id = p.id AND ps.settlement_type = 'sale'
    ORDER BY ps.settlement_date DESC
    LIMIT 1
  ) AS sale_net_to_seller,
  (COALESCE(p.loan_amount, 0) * COALESCE(p.origination_fee_percent, 0) / 100)::numeric AS origination_fee
FROM projects p;

ALTER VIEW public.v_project_financials SET (security_invoker = true);
