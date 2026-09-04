/**
 * Single source of truth for per-project financial calculations.
 *
 * Any page, report, or export that shows "Total Costs", "Draws Funded",
 * "Projected Profit", "Accrued Interest", or "Profit Margin" MUST use these
 * functions. Do not re-implement the math inline — the dashboard and the
 * Financials page disagreed in the past because each had its own reducer,
 * and Peach Springs appeared ~$90k more profitable on the dashboard than
 * it really was.
 *
 * Invariants enforced here:
 *   total_costs        = sum(contractor_payments.amount)              per project
 *   misc_charges       = sum(project_misc_charges.amount)             per project
 *   all_in_costs       = total_costs + misc_charges
 *   draws_funded       = sum(draw_requests.amount where status=funded) per project
 *   draws_pending      = sum(draw_requests.amount where status in (submitted, approved))
 *   draws_total        = sum(draw_requests.amount)                     per project
 *   origination_fee    = loan_amount * origination_fee_percent / 100
 *   accrued_interest   = simple interest on each funded draw + on the
 *                        down_payment principal (treated as a closing-day
 *                        draw on the loan, which is how the lender accrues
 *                        it). Each component runs from its own start_date
 *                        to `endDate` at `interest_rate`.
 *   budgeted_costs     = sum(budget_line_items.budgeted_amount)       per project
 *   forecast_costs     = max(budgeted_costs, all_in_costs) when a budget
 *                        exists, else all_in_costs
 *   actual_profit      = sale_price - all_in_costs + financing_impact
 *   projected_profit   = sale_price - forecast_costs + financing_impact
 *   profit_margin      = projected_profit / sale_price     (0 if sale_price <= 0)
 *
 * About projected vs actual profit:
 *   These answer two different questions and were previously conflated.
 *   "Projected" is what the job should make when it is finished, so it has to
 *   cost the work still to come — that is what the budget is for. "Actual" is
 *   where the money stands today: sale price less what has genuinely been
 *   spent. Before this split, a project 8% built showed its projected profit
 *   as sale_price minus the 8% spent so far — Chelsey Lot 27 read $477,296 at
 *   a 90.9% margin, which is not a forecast of anything.
 *
 *   forecast_costs takes the LARGER of budget and actual on purpose. Peach
 *   Springs is budgeted at $125,913 and has spent $255,335; trusting the
 *   budget there would invent ~$129k of profit that has already been spent.
 *   A budget is a forecast only until it is overrun, after which the money
 *   out of the door is the better number.
 *
 *   With no budget on file, forecast_costs falls back to all_in_costs, so
 *   projected_profit keeps its old value and old projects do not shift.
 *
 * About the profit formula (Formula 1 / "walk-away cash"):
 *   We want the displayed Projected Profit to equal the net wire Blake
 *   actually receives at sale, minus any costs he covered out of pocket
 *   that the loan didn't reimburse. For Peach Springs:
 *     sale wire = $240,847.54
 *     paid_personal not yet covered by a draw = $45,744
 *     "walk-away" ≈ $195k
 *   Our formula gets the same answer because total_costs already includes
 *   paid_personal AND the down_payment captures the cash Blake brought to
 *   the construction loan closing. We deliberately do NOT subtract
 *   origination_fee separately for external_loan projects — Blake's
 *   down_payment input includes closing costs (origination + title fees
 *   at the construction loan closing). Subtracting both would double-count.
 *
 * About the interest formula:
 *   The lender accrues interest on the closing-day disbursement (the amount
 *   stored in projects.down_payment, per Blake's data-entry convention)
 *   AND on every subsequent funded draw. Until 5/27/26 we only counted
 *   draws, which undercounted Peach Springs interest by ~$3k. Now both are
 *   counted. Interest payments Blake makes in cash to the lender are NOT
 *   currently tracked (would require a separate table) — total interest
 *   cost (paid + outstanding) is what shows up.
 *
 * If you change any of these, update the v_project_financials view too
 * (supabase/migrations/20260527_accurate_financials.sql).
 */

import type {
  BudgetLineItem,
  ContractorPayment,
  DrawRequest,
  FinancingType,
  LoanLedgerEntry,
  Project,
  ProjectMiscCharge,
  ProjectSettlement,
  SettlementOtherFee,
} from "@/lib/types/database";

export interface ProjectFinancials {
  project: Project;
  financingType: FinancingType;
  salePrice: number;
  totalCosts: number;
  loanAmount: number;
  downPayment: number;
  drawsFunded: number;
  drawsPending: number;
  drawsTotal: number;
  originationFeePercent: number;
  originationFee: number;
  interestRate: number;
  accruedInterest: number;
  saleClosingCosts: number;
  /** True when a sale settlement record exists and provided itemized
   *  closing costs. UI uses this to surface "from ALTA" vs "estimated"
   *  labels next to the closing-cost number. */
  hasSaleSettlement: boolean;
  /** Sum of project_misc_charges.amount for this project. Always
   *  subtracted from projected_profit regardless of financing type. */
  miscCharges: number;
  /** totalCosts + miscCharges — every dollar spent on the job.
   *
   *  `totalCosts` is contractor payments only, and that invariant is mirrored
   *  in v_project_financials, so it can't absorb misc charges. But a summary
   *  card labelled "Costs" has to mean all of them: a project with no lender
   *  fields shows a plain Costs/Gross Profit pair with nowhere else for a
   *  $400 equipment rental to appear, and leaving it out let a real cost land
   *  in the database while every number on the page stayed put. Financed
   *  projects itemize the two separately and keep using the split fields. */
  allInCosts: number;
  /** True when this project has at least one loan_ledger entry — the
   *  helper has used the ledger's actuals for accruedInterest instead of
   *  the running-balance formula. UI can use this to show "lender actuals"
   *  vs "estimated" labels. */
  hasLoanLedger: boolean;
  /** Combined effect of financing on profit (negative for external_loan,
   *  positive for seller_financed, near-zero for cash). Equal to
   *  (projectedProfit − (salePrice − totalCosts)) — kept as its own field
   *  so callers don't have to re-derive it. */
  financingImpact: number;
  /** Sum of budget_line_items.budgeted_amount for this project. */
  budgetedCosts: number;
  /** True when the project has a budget with a non-zero total. When false,
   *  projectedProfit falls back to actualProfit rather than pretending a job
   *  with no budget will cost nothing. */
  hasBudget: boolean;
  /** What the finished job is expected to cost: the budget, or actual spend
   *  once that has overrun the budget. */
  forecastCosts: number;
  /** Sale price less every dollar actually spent, with financing applied.
   *  Where the job stands today, not a forecast. */
  actualProfit: number;
  actualProfitMargin: number;
  /** Sale price less the FORECAST cost of the finished job. */
  projectedProfit: number;
  profitMargin: number;
}

/**
 * Resolve financing type, preferring the explicit field and falling back
 * to the legacy is_cash_job flag so old records (and test fixtures) still
 * work. Callers should never branch on is_cash_job directly.
 */
export function resolveFinancingType(project: Project): FinancingType {
  if (project.financing_type) return project.financing_type;
  if (project.is_cash_job) return "cash";
  return "external_loan";
}

export type SaleSettlementCosts = Pick<
  ProjectSettlement,
  | "seller_concessions"
  | "title_insurance"
  | "escrow_fee"
  | "recording_fees"
  | "prorated_taxes"
  | "other_fees"
>;

/**
 * Seller-side closing costs from a recorded settlement (the ALTA).
 *
 * Exported because more than one surface needs the number: the profit formula
 * consumes it, and the project edit form has to show operators that their
 * manual `sale_closing_costs` estimate has been superseded. Computing it twice
 * is how the manual field and the settlement drifted $15,000 apart on Peach
 * Springs — the estimate omitted the seller concession.
 */
export function saleClosingCostsFromSettlement(
  settlement: SaleSettlementCosts,
): number {
  const otherFeesSum = Array.isArray(settlement.other_fees)
    ? (settlement.other_fees as SettlementOtherFee[]).reduce(
        (acc, f) => acc + Number(f?.amount || 0),
        0,
      )
    : 0;
  return (
    Number(settlement.seller_concessions ?? 0) +
    Number(settlement.title_insurance ?? 0) +
    Number(settlement.escrow_fee ?? 0) +
    Number(settlement.recording_fees ?? 0) +
    Number(settlement.prorated_taxes ?? 0) +
    otherFeesSum
  );
}

/**
 * Primitive sums over money collections.
 *
 * Small enough to feel like overkill, which is exactly why they kept getting
 * re-typed inline across the dashboard, the financials page, the pending-draws
 * page and the draws tab. Each copy is a place the definition of "funded" or
 * "total" can quietly diverge. One definition, imported everywhere; the
 * no-restricted-syntax rule in eslint.config.mjs enforces it.
 */

export function sumPaymentAmounts(
  payments: Pick<ContractorPayment, "amount">[],
): number {
  return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

export function sumDrawAmounts(draws: Pick<DrawRequest, "amount">[]): number {
  return draws.reduce((sum, d) => sum + Number(d.amount || 0), 0);
}

/** Draws the lender has actually released. */
export function sumFundedDraws(
  draws: Pick<DrawRequest, "amount" | "status">[],
): number {
  return sumDrawAmounts(draws.filter((d) => d.status === "funded"));
}

/** Draws requested but not yet released — submitted or approved. */
export function sumPendingDraws(
  draws: Pick<DrawRequest, "amount" | "status">[],
): number {
  return sumDrawAmounts(
    draws.filter((d) => d.status === "submitted" || d.status === "approved"),
  );
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Simple-interest accrual on the loan.
 *
 * Two components, summed:
 *   1. Each funded draw accrues from its `funded_date` to `endDate`.
 *   2. The `projects.down_payment` amount accrues from `loan_start_date`
 *      to `endDate`. The lender treats the closing-day disbursement as
 *      principal (it's how the loan balance grows), and Blake's input
 *      convention stores that amount in `down_payment`. Without this
 *      component, Peach Springs interest was ~$3k short of reality.
 *
 * Each component: `amount * rate * (days_outstanding / 365)`.
 *
 * `endDate` resolves as:
 *   project completed with end_date   → end_date (clamp — loan stopped there)
 *   project still in progress         → asOf (interest to date)
 *
 * We deliberately do NOT project through a future end_date on in-progress
 * projects. "Projected profit" on the dashboard should reflect what's
 * actually accrued so far, not a rosy forecast that assumes the build
 * finishes on schedule.
 *
 * Cash jobs accrue no interest (no loan). For seller_financed, the formula
 * is identical — Blake is the lender so the same number represents revenue
 * to him rather than cost, but the accrual math is the same.
 */
export function computeAccruedInterest(
  project: Project,
  projectDraws: DrawRequest[],
  asOf: Date = new Date(),
): number {
  const ratePct = project.interest_rate ?? 0;
  if (!ratePct) return 0;
  const rate = Number(ratePct) / 100;

  const endDate =
    project.status === "completed" && project.end_date
      ? new Date(project.end_date)
      : asOf;

  let interest = 0;

  // (1) Funded draws
  for (const d of projectDraws) {
    if (d.status !== "funded" || !d.funded_date) continue;
    const fundedDate = new Date(d.funded_date);
    const days = Math.max(0, (endDate.getTime() - fundedDate.getTime()) / MS_PER_DAY);
    interest += Number(d.amount) * rate * (days / 365);
  }

  // (2) Down-payment principal from loan_start_date. Skip if no
  //     loan_start_date is recorded — we can't compute days outstanding.
  const downPayment = Number(project.down_payment ?? 0);
  if (downPayment > 0 && project.loan_start_date) {
    const startDate = new Date(project.loan_start_date);
    const days = Math.max(0, (endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
    interest += downPayment * rate * (days / 365);
  }

  return interest;
}

/**
 * Compute the full financial picture for one project. Pass in the global
 * payments, draws, misc charges, and loan-ledger arrays — this function
 * filters each to the project itself.
 *
 * Trailing args are optional for backward compat. `asOf` controls
 * time-travel calcs for interest-to-date. `allLoanLedger`, when present,
 * makes the helper use lender-actuals (sum of interest_accrual entries +
 * fees) instead of the running-balance formula. This is the "lender
 * statement is the source of truth" mode and is preferred for any
 * project with full ledger entry.
 */
export function computeProjectFinancials(
  project: Project,
  allPayments: Pick<ContractorPayment, "project_id" | "amount">[],
  allDraws: DrawRequest[],
  allMiscCharges: Pick<ProjectMiscCharge, "project_id" | "amount">[] = [],
  asOf: Date = new Date(),
  allLoanLedger: Pick<LoanLedgerEntry, "project_id" | "entry_type" | "amount" | "entry_date">[] = [],
  allSettlements: Pick<
    ProjectSettlement,
    | "project_id"
    | "settlement_type"
    | "seller_concessions"
    | "title_insurance"
    | "escrow_fee"
    | "recording_fees"
    | "prorated_taxes"
    | "other_fees"
    | "settlement_date"
  >[] = [],
  allBudgetLineItems: Pick<BudgetLineItem, "project_id" | "budgeted_amount">[] = [],
): ProjectFinancials {
  const projPayments = allPayments.filter((p) => p.project_id === project.id);
  const projDraws = allDraws.filter((d) => d.project_id === project.id);
  const projMisc = allMiscCharges.filter((m) => m.project_id === project.id);
  const projLedger = allLoanLedger.filter((l) => l.project_id === project.id);
  const projSaleSettlements = allSettlements
    .filter((s) => s.project_id === project.id && s.settlement_type === "sale")
    .sort((a, b) => b.settlement_date.localeCompare(a.settlement_date));

  const financingType = resolveFinancingType(project);
  const salePrice = Number(project.sale_price ?? 0);
  const loanAmount = Number(project.loan_amount ?? 0);
  const downPayment = Number(project.down_payment ?? 0);
  const originationFeePercent = Number(project.origination_fee_percent ?? 0);
  const interestRate = Number(project.interest_rate ?? 0);

  // Sale closing costs: prefer the most recent sale settlement's
  // itemized breakdown when one exists. Falls back to the manual
  // projects.sale_closing_costs field for projects without a settlement
  // record (in-progress or legacy). This automates the data flow —
  // upload an ALTA, Claude extracts the line items, the helper picks
  // them up. No re-keying of sale_closing_costs needed.
  const hasSaleSettlement = projSaleSettlements.length > 0;
  let saleClosingCosts: number;
  if (hasSaleSettlement) {
    saleClosingCosts = saleClosingCostsFromSettlement(projSaleSettlements[0]);
  } else {
    saleClosingCosts = Number(project.sale_closing_costs ?? 0);
  }

  const totalCosts = sumPaymentAmounts(projPayments);
  const miscCharges = projMisc.reduce((s, m) => s + Number(m.amount || 0), 0);
  const allInCosts = totalCosts + miscCharges;

  const drawsFunded = sumFundedDraws(projDraws);
  const drawsPending = sumPendingDraws(projDraws);
  const drawsTotal = sumDrawAmounts(projDraws);

  const originationFee = (loanAmount * originationFeePercent) / 100;

  // Prefer ledger-actuals when present. Ledger represents what the
  // lender actually charged — including anomalies like first-month fee-
  // rolled interest that the simple-interest formula can't reproduce.
  // We sum accruals + fees because both are interest-equivalent costs to
  // Blake (origination fee, late fees, etc.).
  //
  // When ledger is empty, fall back to the formula. Both branches end
  // here so callers don't have to know which mode they're in.
  const hasLoanLedger = projLedger.length > 0;
  let accruedInterest: number;
  if (hasLoanLedger) {
    accruedInterest = projLedger
      .filter((l) => l.entry_type === "interest_accrual" || l.entry_type === "fee")
      .reduce((s, l) => s + Number(l.amount || 0), 0);
  } else {
    accruedInterest = computeAccruedInterest(project, projDraws, asOf);
  }

  // How financing affects profit. See file header for the rationale.
  //
  //   external_loan   — Blake borrows. He paid down_payment cash at the
  //                     construction-loan closing (which includes origination
  //                     and title fees), accrues interest on the principal,
  //                     and pays sale_closing_costs to the title company at
  //                     sale. All subtract from profit. Origination is NOT
  //                     subtracted separately — it's bundled in down_payment.
  //
  //   seller_financed — Blake IS the bank. Down payment + interest are
  //                     revenue. Sale closing costs still come out of his
  //                     proceeds.
  //
  //   cash            — only sale_closing_costs applies.
  //
  // miscCharges is always a cost regardless of financing type — it's the
  // catch-all for one-off items that don't fit anywhere else.
  let financingImpact = 0;
  if (financingType === "external_loan") {
    financingImpact = -(downPayment + accruedInterest + saleClosingCosts);
  } else if (financingType === "seller_financed") {
    financingImpact = downPayment + accruedInterest - saleClosingCosts;
  } else {
    financingImpact = -saleClosingCosts;
  }

  // Where the job stands today. Equivalent to the old projectedProfit —
  // salePrice - totalCosts - miscCharges is exactly salePrice - allInCosts.
  const actualProfit = salePrice - allInCosts + financingImpact;
  const actualProfitMargin = salePrice > 0 ? actualProfit / salePrice : 0;

  const budgetedCosts = allBudgetLineItems
    .filter((b) => b.project_id === project.id)
    .reduce((sum, b) => sum + Number(b.budgeted_amount || 0), 0);
  const hasBudget = budgetedCosts > 0;

  // The larger of the two: a budget is a forecast only until it is overrun,
  // and money already out of the door cannot be un-spent by a stale budget.
  const forecastCosts = hasBudget ? Math.max(budgetedCosts, allInCosts) : allInCosts;

  const projectedProfit = salePrice - forecastCosts + financingImpact;
  const profitMargin = salePrice > 0 ? projectedProfit / salePrice : 0;

  return {
    project,
    financingType,
    salePrice,
    totalCosts,
    loanAmount,
    downPayment,
    drawsFunded,
    drawsPending,
    drawsTotal,
    originationFeePercent,
    originationFee,
    interestRate,
    accruedInterest,
    saleClosingCosts,
    hasSaleSettlement,
    miscCharges,
    allInCosts,
    hasLoanLedger,
    financingImpact,
    budgetedCosts,
    hasBudget,
    forecastCosts,
    actualProfit,
    actualProfitMargin,
    projectedProfit,
    profitMargin,
  };
}

/**
 * Sum the projected profit across a set of projects, skipping any without
 * a sale price (we can't project profit without a revenue side).
 */
export function sumProjectedProfit(financials: ProjectFinancials[]): number {
  return financials
    .filter((f) => f.salePrice > 0)
    .reduce((s, f) => s + f.projectedProfit, 0);
}
