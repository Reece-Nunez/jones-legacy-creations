/**
 * Cross-checks between the records that are supposed to describe the same
 * money.
 *
 * Every discrepancy found during the Peach Springs audit was the same shape:
 * two places that should agree, quietly disagreeing. The Cash Flow tab counted
 * the loan payoff three times; the manual closing-cost field sat $15,000 below
 * the ALTA; a project with a sale price and no costs reported an 84.6% margin
 * into the company-wide total. None of it surfaced anywhere — it had to be
 * found by hand.
 *
 * These checks are pure so they can run in tests, in CI against a fixture, or
 * behind an admin health-check page. They report; they never mutate.
 *
 * Severity is about who needs to look, not how large the number is:
 *   error   — the records contradict each other, someone has to reconcile them
 *   warning — a figure is missing or stale and a displayed number is wrong
 *             because of it
 *   info    — a difference that is expected but worth surfacing
 */

import type {
  ContractorPayment,
  DrawRequest,
  LoanLedgerEntry,
  Project,
  ProjectSettlement,
} from "@/lib/types/database";
import {
  saleClosingCostsFromSettlement,
  sumDrawAmounts,
  sumFundedDraws,
  sumPaymentAmounts,
} from "./project-financials";

export type ReconcileSeverity = "error" | "warning" | "info";

export interface Discrepancy {
  /** Stable identifier so a finding can be referenced or suppressed. */
  code: string;
  severity: ReconcileSeverity;
  message: string;
  expected?: number;
  actual?: number;
  /** actual − expected, when both are numeric. */
  delta?: number;
}

export interface ReconcileInput {
  project: Project;
  payments: ContractorPayment[];
  draws: DrawRequest[];
  loanLedger: LoanLedgerEntry[];
  settlements: ProjectSettlement[];
}

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Within a cent — these are stored as numerics and summed in floating point. */
const differs = (a: number, b: number) => Math.abs(a - b) > 0.01;

export function reconcileProject(input: ReconcileInput): Discrepancy[] {
  const { project } = input;
  const found: Discrepancy[] = [];

  const payments = input.payments.filter((p) => p.project_id === project.id);
  const draws = input.draws.filter((d) => d.project_id === project.id);
  const ledger = input.loanLedger.filter((l) => l.project_id === project.id);
  const saleSettlement = input.settlements.find(
    (s) => s.project_id === project.id && s.settlement_type === "sale",
  );

  const totalCosts = sumPaymentAmounts(payments);
  const salePrice = Number(project.sale_price ?? 0);

  // ── Draws should cover exactly the payments they funded ──────────────────
  // Peach Springs ties to the cent here, which is what makes it a useful
  // signal: a break means a payment was mis-statused or a draw mis-keyed.
  const drawFundedPayments = sumPaymentAmounts(
    payments.filter(
      (p) => p.status === "reimbursed" || p.status === "paid_from_draw",
    ),
  );
  const fundedDraws = sumFundedDraws(draws);
  if (draws.length > 0 && differs(drawFundedPayments, fundedDraws)) {
    found.push({
      code: "draws_vs_funded_payments",
      severity: "error",
      message: `Payments marked as draw-funded total ${money(drawFundedPayments)}, but funded draws total ${money(fundedDraws)}.`,
      expected: fundedDraws,
      actual: drawFundedPayments,
      delta: drawFundedPayments - fundedDraws,
    });
  }

  // ── Lender disbursements vs our draw records ─────────────────────────────
  // The lender also disburses on closing day, which is not a construction
  // draw, so the expected gap is the down payment. Anything beyond that is
  // money the two records disagree about.
  const disbursed = ledger
    .filter((l) => l.entry_type === "disbursement")
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  if (ledger.length > 0 && disbursed > 0) {
    const expectedGap = Number(project.down_payment ?? 0);
    const actualGap = disbursed - fundedDraws;
    if (differs(actualGap, expectedGap)) {
      found.push({
        code: "ledger_vs_draws",
        severity: "info",
        message: `Lender disbursed ${money(disbursed)} but funded draws total ${money(fundedDraws)}. After the ${money(expectedGap)} closing-day disbursement, ${money(actualGap - expectedGap)} is unaccounted for.`,
        expected: expectedGap,
        actual: actualGap,
        delta: actualGap - expectedGap,
      });
    }
  }

  // ── The ALTA should add up ───────────────────────────────────────────────
  if (saleSettlement) {
    const closingCosts = saleClosingCostsFromSettlement(saleSettlement);
    const payoff = Number(saleSettlement.loan_payoff ?? 0);
    const settlementSalePrice = Number(
      saleSettlement.sale_price ?? project.sale_price ?? 0,
    );
    const netToSeller = Number(saleSettlement.net_to_seller ?? 0);

    if (netToSeller > 0 && settlementSalePrice > 0) {
      const derived = settlementSalePrice - closingCosts - payoff;
      if (differs(derived, netToSeller)) {
        found.push({
          code: "settlement_net_mismatch",
          severity: "error",
          message: `Net to seller reads ${money(netToSeller)}, but sale price less closing costs and payoff comes to ${money(derived)}.`,
          expected: derived,
          actual: netToSeller,
          delta: netToSeller - derived,
        });
      }
    }

    // The manual estimate is superseded once a settlement exists, but a stale
    // value still misleads anyone reading the row directly — and it is what
    // gets used if the settlement is ever removed.
    const manual = Number(project.sale_closing_costs ?? 0);
    if (manual > 0 && differs(manual, closingCosts)) {
      found.push({
        code: "stale_manual_closing_costs",
        severity: "warning",
        message: `projects.sale_closing_costs reads ${money(manual)} but the recorded settlement itemises ${money(closingCosts)}. The settlement is used; the stored estimate is stale.`,
        expected: closingCosts,
        actual: manual,
        delta: manual - closingCosts,
      });
    }
  }

  // ── Figures that silently read as zero ───────────────────────────────────
  if (salePrice > 0 && totalCosts === 0) {
    found.push({
      code: "sale_price_without_costs",
      severity: "warning",
      message: `Sale price of ${money(salePrice)} with no recorded costs, so projected profit is close to the full sale price and feeds the company-wide total.`,
      actual: salePrice,
    });
  }

  if (salePrice > 0 && !saleSettlement && !Number(project.sale_closing_costs)) {
    found.push({
      code: "missing_closing_costs",
      severity: "warning",
      message: `Sale price of ${money(salePrice)} with no closing costs recorded and no settlement, so projected profit is overstated.`,
      actual: salePrice,
    });
  }

  if (Number(project.loan_amount ?? 0) > 0 && !project.loan_start_date && ledger.length === 0) {
    found.push({
      code: "loan_without_start_date",
      severity: "warning",
      message: `Loan of ${money(Number(project.loan_amount))} has no loan_start_date and no ledger, so no interest accrues and profit is overstated.`,
      actual: Number(project.loan_amount),
    });
  }

  // ── Interest sanity ──────────────────────────────────────────────────────
  const accrued = ledger
    .filter((l) => l.entry_type === "interest_accrual")
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  const paid = ledger
    .filter((l) => l.entry_type === "interest_payment")
    .reduce((s, l) => s + Number(l.amount || 0), 0);
  if (accrued > 0 && paid - accrued > 0.01) {
    found.push({
      code: "interest_paid_exceeds_accrued",
      severity: "error",
      message: `Interest paid ${money(paid)} exceeds interest accrued ${money(accrued)}.`,
      expected: accrued,
      actual: paid,
      delta: paid - accrued,
    });
  }

  // ── Draw totals should not exceed the loan ───────────────────────────────
  const loanAmount = Number(project.loan_amount ?? 0);
  const drawsTotal = sumDrawAmounts(draws);
  if (loanAmount > 0 && drawsTotal - loanAmount > 0.01) {
    found.push({
      code: "draws_exceed_loan",
      severity: "error",
      message: `Draws total ${money(drawsTotal)}, more than the ${money(loanAmount)} loan.`,
      expected: loanAmount,
      actual: drawsTotal,
      delta: drawsTotal - loanAmount,
    });
  }

  return found;
}

/** Reconcile every project, dropping the ones that come back clean. */
export function reconcileAll(
  projects: Project[],
  shared: Omit<ReconcileInput, "project">,
): { project: Project; discrepancies: Discrepancy[] }[] {
  return projects
    .map((project) => ({
      project,
      discrepancies: reconcileProject({ ...shared, project }),
    }))
    .filter((r) => r.discrepancies.length > 0);
}
