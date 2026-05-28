-- ── Accurate financials migration ─────────────────────────────────────────
-- Adds the two columns needed to make the project Financial Summary match
-- the lender / closing-statement reality:
--
--   contractor_payments.budget_line_number  — explicit assignment of a
--       payment to a budget line item. BudgetTab previously inferred this
--       from invoice_file_name (regex `^\d+[a-z]?[_ ]`) or from a linked
--       document.line_item_number. Manually-entered paid_personal payments
--       with `image.jpg`/null filenames slipped through both and silently
--       vanished from totalSpent — see Peach Springs: $30,744 of paid_personal
--       was invisible in BudgetTab while FinancialSummary's totalCosts was
--       correct. New column gives Blake an explicit override.
--
--   projects.sale_closing_costs  — seller-side closing costs at sale
--       (title fees, recording, prorated taxes, seller concessions). These
--       come out of the sale wire to Blake; ignoring them inflated projected
--       profit. For Peach Springs the closing statement shows $18,703.10.
--       Required input from the Project form going forward (whenever
--       sale_price is set) — see lib/finance/project-financials.ts header
--       for the new formula:
--           projected_profit = sale_price
--                             − total_costs
--                             − accrued_interest
--                             − sale_closing_costs
--                             − down_payment
--
-- This file also rebuilds v_project_financials to surface the new field.

ALTER TABLE public.contractor_payments
  ADD COLUMN IF NOT EXISTS budget_line_number TEXT;

COMMENT ON COLUMN public.contractor_payments.budget_line_number IS
  'Explicit budget line assignment for this payment. Takes priority over '
  'document-link or filename-derived matching in BudgetTab.spentByLine. '
  'Stored as text (not FK) so that line-number renames don''t cascade and '
  'so payments survive budget restructures.';

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS sale_closing_costs NUMERIC;

COMMENT ON COLUMN public.projects.sale_closing_costs IS
  'Seller-side closing costs at sale (title, escrow, recording, prorated '
  'taxes, concessions). Subtracted from projected_profit so the displayed '
  'number matches the wire Blake actually receives at closing. Required '
  'whenever sale_price is set; entered as an estimate up-front and the '
  'actual once the property closes.';

-- Rebuild the view to expose sale_closing_costs. Accrued interest stays
-- time-dependent in app code (lib/finance/project-financials.ts).
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
  (COALESCE(p.loan_amount, 0) * COALESCE(p.origination_fee_percent, 0) / 100)::numeric AS origination_fee
FROM projects p;

ALTER VIEW public.v_project_financials SET (security_invoker = true);

COMMENT ON VIEW public.v_project_financials IS
  'Source of truth for per-project totals. Accrued interest and projected '
  'profit stay in app code (lib/finance/project-financials.ts) because they '
  'depend on asOf date. sale_closing_costs and down_payment are exposed so '
  'consumers can reconstruct the projected_profit formula themselves if '
  'needed.';
