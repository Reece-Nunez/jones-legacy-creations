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

describe("all-in costs", () => {
  // `totalCosts` is contractor payments only — an invariant mirrored in
  // v_project_financials, so it can't absorb job costs. `allInCosts` is the
  // number a summary card labelled "Costs" needs: a project with no lender
  // fields shows only Costs and Gross Profit, and before this existed a
  // logged tank of fuel moved neither one.

  function withMiscCharges(
    name: string,
    charges: { amount: number }[],
  ): ProjectFinancials {
    const project = fixture.projects.find((p) => p.name.trim() === name);
    if (!project) throw new Error(`fixture missing project ${name}`);
    return computeProjectFinancials(
      project as never,
      fixture.payments as never,
      fixture.draws as never,
      charges.map((c, i) => ({
        id: `synthetic-${i}`,
        project_id: project.id,
        description: "job cost",
        amount: c.amount,
        charge_date: null,
        category: null,
      })) as never,
      AS_OF,
      fixture.loanLedger as never,
      fixture.settlements as never,
    );
  }

  it("equals total costs when the project has no job costs", () => {
    // Production has never had a row in project_misc_charges — the section
    // was gated behind sale_price AND loan_amount — so the whole fixture
    // exercises this branch.
    for (const f of allFinancials()) {
      expect(f.allInCosts, f.project.name).toBeCloseTo(f.totalCosts, 2);
    }
  });

  it("adds job costs on top of contractor payments", () => {
    const f = withMiscCharges("Peach Springs", [
      { amount: 412.5 },
      { amount: 1800 },
    ]);
    expect(f.miscCharges).toBeCloseTo(2212.5, 2);
    expect(f.totalCosts).toBeCloseTo(255335.12, 2);
    expect(f.allInCosts).toBeCloseTo(257547.62, 2);
  });

  it("counts job costs on a project with no loan and no sale price", () => {
    // The case that prompted this: a client build financed by the client.
    // Nothing about it has a lender, and the fuel still has to land somewhere.
    const f = withMiscCharges("Dixie Springs", [{ amount: 500 }]);
    expect(f.salePrice).toBe(0);
    expect(f.allInCosts).toBeCloseTo(f.totalCosts + 500, 2);
    expect(f.projectedProfit).toBeCloseTo(-f.allInCosts, 2);
  });

  it("keeps job costs out of totalCosts so the DB view still agrees", () => {
    const base = byName("Peach Springs").totalCosts;
    const withCharges = withMiscCharges("Peach Springs", [{ amount: 9999 }]);
    expect(withCharges.totalCosts).toBeCloseTo(base, 2);
  });
});

describe("projected vs actual profit", () => {
  // Two different questions, previously answered with one number. Projected is
  // what the finished job should make and therefore has to cost the work still
  // to come; actual is where the money stands today. Conflating them made
  // Chelsey Lot 27 — 8% built — read a 90.9% margin.

  function withBudget(name: string, budgetTotal: number): ProjectFinancials {
    const project = fixture.projects.find((p) => p.name.trim() === name);
    if (!project) throw new Error(`fixture missing project ${name}`);
    return computeProjectFinancials(
      project as never,
      fixture.payments as never,
      fixture.draws as never,
      fixture.miscCharges as never,
      AS_OF,
      fixture.loanLedger as never,
      fixture.settlements as never,
      budgetTotal > 0
        ? ([{ project_id: project.id, budgeted_amount: budgetTotal }] as never)
        : ([] as never),
    );
  }

  it("falls back to actual costs when there is no budget", () => {
    // Old behaviour preserved exactly: a project with no budget must not look
    // as though the remaining work is free.
    const noBudget = withBudget("Peach Springs", 0);
    expect(noBudget.hasBudget).toBe(false);
    expect(noBudget.forecastCosts).toBe(noBudget.allInCosts);
    expect(noBudget.projectedProfit).toBeCloseTo(noBudget.actualProfit, 2);
  });

  it("costs the whole budget, not just what has been spent", () => {
    const pf = withBudget("Chelsey Lot 42", 496600);

    expect(pf.hasBudget).toBe(true);
    expect(pf.forecastCosts).toBe(496600);
    // Projected prices the finished job; actual still reflects spend to date,
    // so on a barely-started job actual is the far rosier of the two.
    expect(pf.projectedProfit).toBeCloseTo(
      pf.salePrice - 496600 + pf.financingImpact,
      2,
    );
    expect(pf.actualProfit).toBeGreaterThan(pf.projectedProfit);
  });

  it("uses actual spend once it has overrun the budget", () => {
    // Peach Springs is budgeted $125,913 and has spent $255,335. Trusting the
    // budget would invent ~$129k of profit that is already out of the door.
    const pf = withBudget("Peach Springs", 125913.16);

    expect(pf.allInCosts).toBeGreaterThan(125913.16);
    expect(pf.forecastCosts).toBe(pf.allInCosts);
    expect(pf.projectedProfit).toBeCloseTo(pf.actualProfit, 2);
  });

  it("keeps the margin tied to the projected figure", () => {
    const pf = withBudget("Chelsey Lot 42", 496600);
    expect(pf.profitMargin).toBeCloseTo(pf.projectedProfit / pf.salePrice, 6);
    expect(pf.actualProfitMargin).toBeCloseTo(pf.actualProfit / pf.salePrice, 6);
  });

  it("reports a zero margin on a project with no sale price", () => {
    const pf = withBudget("Dixie Springs", 135708.95);
    expect(pf.salePrice).toBe(0);
    expect(pf.profitMargin).toBe(0);
    expect(pf.actualProfitMargin).toBe(0);
  });

  it("applies financing to both figures the same way", () => {
    const pf = withBudget("Chelsey Lot 42", 496600);
    expect(pf.projectedProfit - pf.actualProfit).toBeCloseTo(
      pf.allInCosts - pf.forecastCosts,
      2,
    );
  });
});
