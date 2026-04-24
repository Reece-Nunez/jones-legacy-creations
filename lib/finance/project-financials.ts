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
 *   accrued_interest   = per-funded-draw simple interest from funded_date to endDate,
 *                        where endDate = project.end_date ?? asOf ?? today
 *                        (mathematically equivalent to running-balance between events
 *                        under simple daily interest)
 *   projected_profit   = sale_price - total_costs - origination_fee - accrued_interest
 *   profit_margin      = projected_profit / sale_price     (0 if sale_price <= 0)
 *
 * If you change any of these, update the v_project_financials view too.
 */

import type {
  ContractorPayment,
  DrawRequest,
  Project,
} from "@/lib/types/database";

export interface ProjectFinancials {
  project: Project;
  salePrice: number;
  totalCosts: number;
  loanAmount: number;
  drawsFunded: number;
  drawsPending: number;
  drawsTotal: number;
  originationFeePercent: number;
  originationFee: number;
  interestRate: number;
  accruedInterest: number;
  projectedProfit: number;
  profitMargin: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Simple-interest accrual on funded draws.
 *
 * Each funded draw accrues `amount * rate * (days_outstanding / 365)` from
 * its funded_date to `endDate`. Summed across all funded draws, this is
 * mathematically identical to a running-balance integration between draw
 * events (under simple daily interest), so long as no draw amount changes
 * after funding.
 *
 * `endDate` resolves as:
 *   project completed with end_date   → end_date (clamp — loan stopped there)
 *   project still in progress         → asOf (interest to date)
 *
 * We deliberately do NOT project through a future end_date on in-progress
 * projects. "Projected profit" on the dashboard should reflect what's
 * actually accrued so far, not a rosy forecast that assumes the build
 * finishes on schedule. Once the project is marked completed, the end_date
 * becomes authoritative.
 */
export function computeAccruedInterest(
  project: Project,
  projectDraws: DrawRequest[],
  asOf: Date = new Date(),
): number {
  const ratePct = project.interest_rate ?? 0;
  if (!ratePct) return 0;
  const rate = Number(ratePct) / 100;

  const fundedDraws = projectDraws.filter(
    (d) => d.status === "funded" && d.funded_date,
  );
  if (fundedDraws.length === 0) return 0;

  const endDate =
    project.status === "completed" && project.end_date
      ? new Date(project.end_date)
      : asOf;

  let interest = 0;
  for (const d of fundedDraws) {
    const fundedDate = new Date(d.funded_date!);
    const days = Math.max(0, (endDate.getTime() - fundedDate.getTime()) / MS_PER_DAY);
    interest += Number(d.amount) * rate * (days / 365);
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

  const salePrice = Number(project.sale_price ?? 0);
  const loanAmount = Number(project.loan_amount ?? 0);
  const originationFeePercent = Number(project.origination_fee_percent ?? 0);
  const interestRate = Number(project.interest_rate ?? 0);

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
  const projectedProfit =
    salePrice - totalCosts - originationFee - accruedInterest;
  const profitMargin = salePrice > 0 ? projectedProfit / salePrice : 0;

  return {
    project,
    salePrice,
    totalCosts,
    loanAmount,
    drawsFunded,
    drawsPending,
    drawsTotal,
    originationFeePercent,
    originationFee,
    interestRate,
    accruedInterest,
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
