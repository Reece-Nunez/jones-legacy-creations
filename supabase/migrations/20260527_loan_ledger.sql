-- ── Loan Ledger ──────────────────────────────────────────────────────────
-- Event-per-row record of every lender-side transaction. This is the
-- source of truth for what the loan actually cost. The helper in
-- lib/finance/project-financials.ts prefers the ledger when entries exist
-- and falls back to formula-based estimates otherwise — so existing
-- projects keep working unchanged, while completed projects with full
-- lender statements get reconciled to the penny.
--
-- Why event-per-row instead of monthly summary:
--   The lender's own statements ARE event-driven: a draw event, a
--   month-end accrual, an interest payment from escrow on a specific
--   date. Storing one row per event lets us reconstruct the running
--   balance at any moment, match each payment to its accrual period,
--   and handle irregular events (mid-month draws, prepayments, fees).
--
-- entry_type values and what they mean:
--   disbursement       Lender funded money (closing draw or construction draw).
--                      Increases principal balance. Usually corresponds to a
--                      draw_requests row (linked via related_draw_id).
--   interest_accrual   Interest accrued for a period (month-end, or at a
--                      mid-month draw event). Does NOT move cash — it's the
--                      lender saying "you owe this much more in interest".
--                      Increases interest-owed balance.
--   interest_payment   Cash interest paid. Records who paid (escrow, DD,
--                      check, bill_pay) in payment_method. Decreases
--                      interest-owed balance.
--   principal_payment  Principal paid down ahead of payoff. Rare on
--                      construction loans but possible.
--   fee                One-time charge: origination, late fee, prepayment
--                      penalty, doc prep. Increases total cost.
--   payoff             Final payoff at sale. amount = principal + unpaid
--                      interest sent to lender. Closes out the loan.
--
-- Sign convention: amount is always POSITIVE. The entry_type implies the
-- sign for balance math (disbursement/accrual/fee add, payments/payoff
-- subtract). Storing positive amounts everywhere makes manual entry less
-- error-prone and the running_balance check unambiguous.

CREATE TABLE IF NOT EXISTS public.loan_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'disbursement',
    'interest_accrual',
    'interest_payment',
    'principal_payment',
    'fee',
    'payoff'
  )),
  description TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),

  -- Lender's stated running balance after this entry. Optional, but if
  -- present we can flag discrepancies between our computed balance and
  -- the lender's claimed balance — catches data-entry errors fast.
  running_balance NUMERIC,

  -- 'escrow', 'DD' (direct debit), 'check #1234', 'bill_pay', 'wire',
  -- 'cash', etc. Free-form so it can match whatever the lender calls it.
  payment_method TEXT,

  -- Link an interest_payment to the accrual period(s) it covers, or a
  -- disbursement to a contractor draw. Soft link (SET NULL on delete) so
  -- the ledger survives if the related row is deleted.
  related_draw_id UUID REFERENCES public.draw_requests(id) ON DELETE SET NULL,
  related_ledger_id UUID REFERENCES public.loan_ledger(id) ON DELETE SET NULL,

  notes TEXT,

  -- AI extraction provenance. When Claude parses a lender PDF, we mark
  -- the row ai_extracted=true and require the user to verify before the
  -- helper trusts it. source_document_url points at the original PDF for
  -- audit.
  source_document_url TEXT,
  ai_extracted BOOLEAN NOT NULL DEFAULT FALSE,
  user_verified BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_ledger_project_date
  ON public.loan_ledger (project_id, entry_date, created_at);

COMMENT ON TABLE public.loan_ledger IS
  'Event-per-row lender activity. Source of truth for loan cost when '
  'entries exist; lib/finance/project-financials.ts prefers it over '
  'formula-based estimates. Entries can be added manually or extracted '
  'from a lender PDF via Claude (ai_extracted=true until user_verified).';

ALTER TABLE public.loan_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin all on loan_ledger"
  ON public.loan_ledger
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Rebuild v_project_financials to expose the loan-ledger aggregates.
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
  -- Loan ledger aggregates: counted only when entries exist for this
  -- project. Consumers can detect "ledger-backed" by checking
  -- has_loan_ledger.
  EXISTS (
    SELECT 1 FROM loan_ledger ll WHERE ll.project_id = p.id
  ) AS has_loan_ledger,
  COALESCE((
    SELECT SUM(ll.amount)
    FROM loan_ledger ll
    WHERE ll.project_id = p.id AND ll.entry_type = 'disbursement'
  ), 0) AS ledger_disbursements,
  COALESCE((
    SELECT SUM(ll.amount)
    FROM loan_ledger ll
    WHERE ll.project_id = p.id AND ll.entry_type = 'interest_accrual'
  ), 0) AS ledger_interest_accrued,
  COALESCE((
    SELECT SUM(ll.amount)
    FROM loan_ledger ll
    WHERE ll.project_id = p.id AND ll.entry_type = 'interest_payment'
  ), 0) AS ledger_interest_paid,
  COALESCE((
    SELECT SUM(ll.amount)
    FROM loan_ledger ll
    WHERE ll.project_id = p.id AND ll.entry_type = 'principal_payment'
  ), 0) AS ledger_principal_paid,
  COALESCE((
    SELECT SUM(ll.amount)
    FROM loan_ledger ll
    WHERE ll.project_id = p.id AND ll.entry_type = 'fee'
  ), 0) AS ledger_fees,
  COALESCE((
    SELECT SUM(ll.amount)
    FROM loan_ledger ll
    WHERE ll.project_id = p.id AND ll.entry_type = 'payoff'
  ), 0) AS ledger_payoff,
  (COALESCE(p.loan_amount, 0) * COALESCE(p.origination_fee_percent, 0) / 100)::numeric AS origination_fee
FROM projects p;

ALTER VIEW public.v_project_financials SET (security_invoker = true);

COMMENT ON VIEW public.v_project_financials IS
  'Source of truth for per-project totals. Time-dependent figures '
  '(accrued_interest by asOf-date, projected_profit) stay in app code. '
  'has_loan_ledger=true means the project has lender-actuals; consumers '
  'should prefer ledger_* aggregates over formula-based estimates in '
  'that case.';
