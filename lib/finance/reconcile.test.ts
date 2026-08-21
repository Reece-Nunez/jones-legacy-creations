import { describe, it, expect } from "vitest";
import { reconcileProject, reconcileAll, type Discrepancy } from "./reconcile";
import fixture from "./__fixtures__/projects.json";

const codes = (found: Discrepancy[]) => found.map((d) => d.code).sort();

const shared = {
  payments: fixture.payments as never,
  draws: fixture.draws as never,
  loanLedger: fixture.loanLedger as never,
  settlements: fixture.settlements as never,
};

const project = (name: string) => {
  const p = fixture.projects.find((x) => x.name.trim() === name);
  if (!p) throw new Error(`fixture missing project ${name}`);
  return p;
};

const run = (name: string) =>
  reconcileProject({ project: project(name) as never, ...shared });

/** A project with nothing to reconcile, for building targeted cases. */
const bare = {
  id: "p-test",
  sale_price: null,
  sale_closing_costs: null,
  loan_amount: null,
  down_payment: null,
  loan_start_date: null,
};

const check = (over: Record<string, unknown>, data: Partial<typeof shared> = {}) =>
  reconcileProject({
    project: { ...bare, ...over } as never,
    payments: [],
    draws: [],
    loanLedger: [],
    settlements: [],
    ...data,
  } as never);

describe("against the real data", () => {
  it("finds nothing to reconcile on the untouched projects", () => {
    // Guards against the checks becoming noisy: an in-progress job with a few
    // payments and no sale should be silent.
    for (const name of ["Dixie Springs", "Gunlock", "Desert Color", "Niki Miles"]) {
      expect(run(name), name).toEqual([]);
    }
  });

  it("flags Chelsey Lot 42 as the reason the dashboard total is inflated", () => {
    expect(codes(run("Chelsey Lot 42"))).toEqual([
      "loan_without_start_date",
      "missing_closing_costs",
      "sale_price_without_costs",
    ]);
  });

  it("flags the stale closing-cost estimate on Peach Springs", () => {
    const stale = run("Peach Springs").find(
      (d) => d.code === "stale_manual_closing_costs",
    );
    expect(stale).toBeDefined();
    // $3,703.10 stored vs $18,703.10 itemised — the seller concession.
    expect(stale!.delta).toBeCloseTo(-15000, 2);
  });

  it("reports the lender/draw gap as info, since it was reviewed and accepted", () => {
    const gap = run("Peach Springs").find((d) => d.code === "ledger_vs_draws");
    expect(gap?.severity).toBe("info");
    expect(gap!.delta).toBeCloseTo(7725.31, 2);
  });

  it("does not flag draws against payments on Peach Springs", () => {
    // These tie exactly: $209,591.12 of draw-funded payments, $209,591.12 of
    // funded draws. A break here would mean a mis-statused payment.
    expect(codes(run("Peach Springs"))).not.toContain("draws_vs_funded_payments");
  });

  it("does not flag the ALTA, which adds up", () => {
    expect(codes(run("Peach Springs"))).not.toContain("settlement_net_mismatch");
  });

  it("returns only projects with findings", () => {
    const results = reconcileAll(fixture.projects as never, shared);
    expect(results.map((r) => (r.project as { name: string }).name.trim()).sort()).toEqual([
      "Chelsey Lot 42",
      "Peach Springs",
    ]);
  });
});

describe("draws against the payments they funded", () => {
  const draw = (amount: number) => ({
    project_id: "p-test", status: "funded", amount, funded_date: "2026-03-01",
  });
  const payment = (amount: number, status: string) => ({
    project_id: "p-test", amount, status,
  });

  it("is silent when they tie", () => {
    const found = check({}, {
      draws: [draw(100000)] as never,
      payments: [payment(60000, "reimbursed"), payment(40000, "paid_from_draw")] as never,
    });
    expect(codes(found)).not.toContain("draws_vs_funded_payments");
  });

  it("fires when a payment is mis-statused", () => {
    const found = check({}, {
      draws: [draw(100000)] as never,
      payments: [payment(60000, "reimbursed")] as never,
    });
    const d = found.find((x) => x.code === "draws_vs_funded_payments");
    expect(d?.severity).toBe("error");
    expect(d!.delta).toBeCloseTo(-40000, 2);
  });

  it("ignores out-of-pocket payments, which draws never covered", () => {
    const found = check({}, {
      draws: [draw(100000)] as never,
      payments: [payment(100000, "reimbursed"), payment(45744, "paid_personal")] as never,
    });
    expect(codes(found)).not.toContain("draws_vs_funded_payments");
  });
});

describe("settlement arithmetic", () => {
  const settlement = (over: Record<string, unknown>) => ({
    project_id: "p-test", settlement_type: "sale", settlement_date: "2026-05-15",
    sale_price: 561000, loan_payoff: 301449.36, net_to_seller: 240847.54,
    seller_concessions: 15000, title_insurance: 2650, escrow_fee: 345,
    recording_fees: 255, prorated_taxes: 453.1, other_fees: [], ...over,
  });

  it("accepts an ALTA that balances", () => {
    const found = check({ sale_price: 561000 }, { settlements: [settlement({})] as never });
    expect(codes(found)).not.toContain("settlement_net_mismatch");
  });

  it("fires when net to seller does not follow from the line items", () => {
    const found = check({ sale_price: 561000 }, {
      settlements: [settlement({ net_to_seller: 250000 })] as never,
    });
    const d = found.find((x) => x.code === "settlement_net_mismatch");
    expect(d?.severity).toBe("error");
    expect(d!.delta).toBeCloseTo(9152.46, 2);
  });
});

describe("figures that silently read as zero", () => {
  it("flags a sale price with no cost basis", () => {
    expect(codes(check({ sale_price: 650000 }))).toContain("sale_price_without_costs");
  });

  it("flags a sale price with no closing costs and no settlement", () => {
    expect(codes(check({ sale_price: 650000 }))).toContain("missing_closing_costs");
  });

  it("does not flag missing closing costs once a settlement supplies them", () => {
    const found = check({ sale_price: 561000 }, {
      settlements: [{
        project_id: "p-test", settlement_type: "sale", settlement_date: "2026-05-15",
        escrow_fee: 345, other_fees: [], net_to_seller: 0, sale_price: 0, loan_payoff: 0,
      }] as never,
    });
    expect(codes(found)).not.toContain("missing_closing_costs");
  });

  it("flags a loan that can never accrue interest", () => {
    expect(codes(check({ loan_amount: 400000 }))).toContain("loan_without_start_date");
  });

  it("stays quiet once a start date exists", () => {
    const found = check({ loan_amount: 400000, loan_start_date: "2026-01-01" });
    expect(codes(found)).not.toContain("loan_without_start_date");
  });
});

describe("loan sanity", () => {
  const entry = (entry_type: string, amount: number) => ({
    project_id: "p-test", entry_type, amount, entry_date: "2026-03-01",
  });

  it("fires when more interest is paid than accrued", () => {
    const found = check({}, {
      loanLedger: [entry("interest_accrual", 500), entry("interest_payment", 900)] as never,
    });
    expect(codes(found)).toContain("interest_paid_exceeds_accrued");
  });

  it("accepts interest paid trailing accrual, which is normal", () => {
    const found = check({}, {
      loanLedger: [entry("interest_accrual", 5707.81), entry("interest_payment", 3484.18)] as never,
    });
    expect(codes(found)).not.toContain("interest_paid_exceeds_accrued");
  });

  it("fires when draws exceed the loan", () => {
    const found = check({ loan_amount: 100000 }, {
      draws: [{ project_id: "p-test", status: "funded", amount: 150000, funded_date: "2026-03-01" }] as never,
    });
    expect(codes(found)).toContain("draws_exceed_loan");
  });
});

describe("scoping", () => {
  it("ignores rows belonging to other projects", () => {
    const found = reconcileProject({
      project: { ...bare, sale_price: null } as never,
      payments: [{ project_id: "someone-else", amount: 999999, status: "reimbursed" }] as never,
      draws: [{ project_id: "someone-else", status: "funded", amount: 1, funded_date: "2026-01-01" }] as never,
      loanLedger: [],
      settlements: [],
    } as never);
    expect(found).toEqual([]);
  });
});
