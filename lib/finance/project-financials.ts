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
 *   draws_funded       = sum(draw_requests.amount where status=funded) per project
 *   draws_pending      = sum(draw_requests.amount where status in (submitted, approved))
 *   draws_total        = sum(draw_requests.amount)                     per project
 *   origination_fee    = loan_amount * origination_fee_percent / 100
 *   accrued_interest   = simple interest on each funded draw + on the
 *                        down_payment principal (treated as a closing-day
 *                        draw on the loan, which is how the lender accrues
 *                        it). Each component runs from its own start_date
 *                        to `endDate` at `interest_rate`.
 *   projected_profit:
 *     external_loan   → sale_price - total_costs - accrued_interest
 *                       - sale_closing_costs - down_payment
 *     seller_financed → sale_price - total_costs + accrued_interest
 *                       + down_payment - sale_closing_costs
 *                       (Blake IS the bank — he receives both)
 *     cash            → sale_price - total_costs - sale_closing_costs
 *   profit_margin      = projected_profit / sale_price     (0 if sale_price <= 0)
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
  ContractorPayment,
  DrawRequest,
  FinancingType,
  Project,
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
  /** Combined effect of financing on profit (negative for external_loan,
   *  positive for seller_financed, near-zero for cash). Equal to
   *  (projectedProfit − (salePrice − totalCosts)) — kept as its own field
   *  so callers don't have to re-derive it. */
  financingImpact: number;
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
 * payments and draws arrays — this function filters to the project itself.
 * Pass `asOf` to compute "interest as of that date" for time-travel views.
 */
export function computeProjectFinancials(
  project: Project,
  allPayments: Pick<ContractorPayment, "project_id" | "amount">[],
  allDraws: DrawRequest[],
  asOf: Date = new Date(),
): ProjectFinancials {
  const projPayments = allPayments.filter((p) => p.project_id === project.id);
  const projDraws = allDraws.filter((d) => d.project_id === project.id);

  const financingType = resolveFinancingType(project);
  const salePrice = Number(project.sale_price ?? 0);
  const loanAmount = Number(project.loan_amount ?? 0);
  const downPayment = Number(project.down_payment ?? 0);
  const originationFeePercent = Number(project.origination_fee_percent ?? 0);
  const interestRate = Number(project.interest_rate ?? 0);
  const saleClosingCosts = Number(project.sale_closing_costs ?? 0);

  const totalCosts = projPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const drawsFunded = projDraws
    .filter((d) => d.status === "funded")
    .reduce((s, d) => s + Number(d.amount || 0), 0);
  const drawsPending = projDraws
    .filter((d) => d.status === "submitted" || d.status === "approved")
    .reduce((s, d) => s + Number(d.amount || 0), 0);
  const drawsTotal = projDraws.reduce((s, d) => s + Number(d.amount || 0), 0);

  const originationFee = (loanAmount * originationFeePercent) / 100;
  const accruedInterest = computeAccruedInterest(project, projDraws, asOf);

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
  let financingImpact = 0;
  if (financingType === "external_loan") {
    financingImpact = -(downPayment + accruedInterest + saleClosingCosts);
  } else if (financingType === "seller_financed") {
    financingImpact = downPayment + accruedInterest - saleClosingCosts;
  } else {
    financingImpact = -saleClosingCosts;
  }

  const projectedProfit = salePrice - totalCosts + financingImpact;
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
    financingImpact,
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
