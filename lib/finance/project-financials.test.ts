import { describe, it, expect } from "vitest";
import {
  computeProjectFinancials,
  sumProjectedProfit,
  resolveFinancingType,
  computeAccruedInterest,
  type ProjectFinancials,
} from "./project-financials";
import fixture from "./__fixtures__/projects.json";

/**
 * Golden master for the money math.
 *
 * project-financials.ts is the declared single source of truth for the
 * dashboard, the financials page and the project page, and it had no test
 * coverage at all. Every discrepancy found during the Peach Springs audit was
 * in code *around* it, but nothing would have caught a change *inside* it.
 *
 * The fixture is a snapshot of real production rows, trimmed to the columns
 * the calculator reads. It's a snapshot on purpose: the point is that these
 * numbers do not move unless someone means to move them. If a change here is
 * intentional, update the expectations in the same commit and say why.
 *
 * `asOf` is pinned so interest-to-date on in-progress projects can't drift
 * with the wall clock.
 */

const AS_OF = new Date("2026-08-21T00:00:00Z");

function financialsFor(project: unknown): ProjectFinancials {
  return computeProjectFinancials(
    project as never,
    fixture.payments as never,
    fixture.draws as never,
    fixture.miscCharges as never,
    AS_OF,
    fixture.loanLedger as never,
    fixture.settlements as never,
  );
}

const byName = (name: string): ProjectFinancials => {
  const project = fixture.projects.find((p) => p.name.trim() === name);
  if (!project) throw new Error(`fixture missing project ${name}`);
  return financialsFor(project);
};

const allFinancials = () => fixture.projects.map(financialsFor);

describe("Peach Springs — the fully-populated case", () => {
  // Completed, sold, external loan, full lender ledger and a recorded ALTA.
  // The only project exercising every branch, so it anchors the suite.
  const f = () => byName("Peach Springs");

  it("sums costs from contractor payments", () => {
    expect(f().totalCosts).toBeCloseTo(255335.12, 2);
  });

  it("takes closing costs from the ALTA, not the stale manual field", () => {
    // projects.sale_closing_costs still reads 3,703.10 — short by exactly the
    // 15,000 seller concession.
    expect(f().saleClosingCosts).toBeCloseTo(18703.1, 2);
    expect(f().hasSaleSettlement).toBe(true);
  });

  it("takes interest from lender actuals, not the formula", () => {
    expect(f().hasLoanLedger).toBe(true);
    expect(f().accruedInterest).toBeCloseTo(5707.81, 2);
  });

  it("counts only funded draws", () => {
    expect(f().drawsFunded).toBeCloseTo(209591.12, 2);
    expect(f().drawsPending).toBe(0);
  });

  it("subtracts down payment, interest and closing costs for an external loan", () => {
    expect(f().financingImpact).toBeCloseTo(-106320.21, 2);
  });

  it("lands on the audited profit and margin", () => {
    expect(f().projectedProfit).toBeCloseTo(199344.67, 2);
    expect(f().profitMargin * 100).toBeCloseTo(35.53, 1);
  });

  it("does not subtract the origination fee separately", () => {
    // It is bundled into down_payment by the data-entry convention;
    // subtracting both would double-count.
    expect(f().originationFee).toBeCloseTo(7000, 2);
    expect(f().projectedProfit).toBeCloseTo(
      f().salePrice - f().totalCosts + f().financingImpact,
      2,
    );
  });
});

describe("Chelsey Lot 42 — sale price with no cost basis", () => {
  // Documents current behaviour rather than endorsing it: an approved project
  // with a sale price and nothing else reports nearly the whole sale price as
  // profit. Raised for a decision; pinned so it cannot change unnoticed.
  const f = () => byName("Chelsey Lot 42");

  it("has no recorded costs", () => {
    expect(f().totalCosts).toBe(0);
  });

  it("reports an implausible margin, which is the point of the flag", () => {
    expect(f().projectedProfit).toBeCloseTo(550000, 2);
    expect(f().profitMargin * 100).toBeGreaterThan(80);
  });

  it("accrues no interest because loan_start_date is missing", () => {
    // computeAccruedInterest cannot measure days outstanding without it, so a
    // $400k loan at 8.75% contributes nothing.
    expect(f().accruedInterest).toBe(0);
  });
});

describe("in-progress projects", () => {
  it("shows costs-so-far as negative profit while unsold", () => {
    for (const name of ["Dixie Springs", "Gunlock", "Desert Color"]) {
      const f = byName(name);
      expect(f.salePrice, name).toBe(0);
      expect(f.projectedProfit, name).toBeCloseTo(-f.totalCosts, 2);
      expect(f.profitMargin, name).toBe(0);
    }
  });

  it("charges a cash job no financing costs", () => {
    const f = byName("Desert Color");
    expect(f.financingType).toBe("cash");
    expect(f.accruedInterest).toBe(0);
    expect(f.financingImpact).toBe(-f.saleClosingCosts);
  });
});

describe("sumProjectedProfit", () => {
  it("totals only projects with a sale price", () => {
    // Chelsey Lot 42 contributes 550,000 of this. See the flag above.
    expect(sumProjectedProfit(allFinancials())).toBeCloseTo(749344.67, 2);
  });

  it("ignores unsold projects entirely, including their losses", () => {
    const unsold = allFinancials().filter((f) => f.salePrice === 0);
    expect(unsold.length).toBeGreaterThan(0);
    expect(sumProjectedProfit(unsold)).toBe(0);
  });
});

describe("resolveFinancingType", () => {
  it("prefers the explicit field over the legacy flag", () => {
    expect(
      resolveFinancingType({ financing_type: "seller_financed", is_cash_job: true } as never),
    ).toBe("seller_financed");
  });

  it("falls back to is_cash_job for legacy rows", () => {
    expect(resolveFinancingType({ financing_type: null, is_cash_job: true } as never)).toBe("cash");
    expect(resolveFinancingType({ financing_type: null, is_cash_job: false } as never)).toBe(
      "external_loan",
    );
  });
});

describe("computeAccruedInterest", () => {
  const project = {
    interest_rate: 8.75,
    down_payment: 0,
    loan_start_date: null,
    status: "in_progress",
    end_date: null,
  };

  it("returns zero without a rate", () => {
    expect(computeAccruedInterest({ ...project, interest_rate: 0 } as never, [], AS_OF)).toBe(0);
  });

  it("accrues simple interest on a funded draw", () => {
    const draws = [{ status: "funded", funded_date: "2026-08-21", amount: 100000 }];
    const oneYearOn = new Date("2027-08-21T00:00:00Z");
    expect(computeAccruedInterest(project as never, draws as never, oneYearOn)).toBeCloseTo(8750, 0);
  });

  it("ignores draws that were never funded", () => {
    const draws = [{ status: "submitted", funded_date: null, amount: 100000 }];
    expect(computeAccruedInterest(project as never, draws as never, AS_OF)).toBe(0);
  });

  it("clamps a completed project at its end date instead of running to today", () => {
    const completed = { ...project, status: "completed", end_date: "2026-01-01" };
    const draws = [{ status: "funded", funded_date: "2025-12-01", amount: 100000 }];
    const stopped = computeAccruedInterest(completed as never, draws as never, AS_OF);
    const stillRunning = computeAccruedInterest(project as never, draws as never, AS_OF);
    expect(stopped).toBeLessThan(stillRunning);
    expect(stopped).toBeCloseTo(100000 * 0.0875 * (31 / 365), 2);
  });

  it("skips the down-payment component without a loan_start_date", () => {
    // This is why Chelsey Lot 42 accrues nothing on a $400k loan.
    const withDown = { ...project, down_payment: 100000 };
    expect(computeAccruedInterest(withDown as never, [], AS_OF)).toBe(0);
  });
});
