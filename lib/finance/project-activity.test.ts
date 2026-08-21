import { describe, it, expect } from "vitest";
import { buildProjectActivity } from "./project-activity";

const PID = "proj-1";

const payment = (o: Record<string, unknown>) => ({
  id: String(Math.random()), project_id: PID, contractor_name: "Sub",
  description: null, amount: 0, status: "reimbursed", paid_date: "2026-03-01",
  reimbursed_date: null, paid_from_draw_date: null, due_date: null,
  created_at: "2026-03-01T00:00:00Z", ...o,
});

const ledger = (o: Record<string, unknown>) => ({
  id: String(Math.random()), project_id: PID, entry_type: "fee",
  amount: 0, entry_date: "2026-03-01", description: null, ...o,
});

/** Mirrors Peach Springs: the wire is already net of costs and the payoff. */
const saleSettlement = {
  id: "s1", project_id: PID, settlement_type: "sale",
  settlement_date: "2026-05-15", document_name: "ALTA.pdf",
  net_to_seller: 240847.54, sale_price: 561000, loan_payoff: 301449.36,
  seller_concessions: 15000, title_insurance: 2650, escrow_fee: 345,
  recording_fees: 255, prorated_taxes: 453.1, other_fees: [{ label: "Courier", amount: 40 }],
  cash_to_close: null, earnest_money: null,
};

const build = (opts: Partial<Parameters<typeof buildProjectActivity>[0]>) =>
  buildProjectActivity({
    projectId: PID, payments: [], loanLedger: [], settlements: [], miscCharges: [],
    ...opts,
  } as never);

const tally = (events: ReturnType<typeof buildProjectActivity>) => {
  let cashIn = 0, cashOut = 0;
  for (const e of events) {
    if (e.direction === "in") cashIn += e.amount;
    else if (e.direction === "out") cashOut += e.amount;
  }
  return { cashIn, cashOut, net: cashIn - cashOut };
};

describe("settlement events", () => {
  it("counts the sale wire once and nothing inside it twice", () => {
    // net_to_seller is already after concessions, title, escrow, recording,
    // taxes and the loan payoff. Counting those lines as cash-out charged
    // Blake for them a second time — $320,152.46 of phantom outflow.
    const t = tally(build({ settlements: [saleSettlement] as never }));
    expect(t.cashIn).toBeCloseTo(240847.54, 2);
    expect(t.cashOut).toBe(0);
    expect(t.net).toBeCloseTo(240847.54, 2);
  });

  it("still surfaces the line items, just as neutral", () => {
    // They explain why the wire is smaller than the sale price, so they must
    // remain visible in the feed.
    const events = build({ settlements: [saleSettlement] as never });
    const payoff = events.find((e) => e.description.startsWith("Loan payoff"));
    expect(payoff).toBeDefined();
    expect(payoff!.direction).toBe("neutral");
    expect(events.filter((e) => e.direction === "neutral").length).toBeGreaterThanOrEqual(6);
  });

  it("does not double-count a purchase settlement either", () => {
    const purchase = {
      ...saleSettlement, id: "s2", settlement_type: "purchase",
      net_to_seller: null, cash_to_close: 90000, loan_payoff: null,
      earnest_money: 5000, other_fees: [],
    };
    const t = tally(build({ settlements: [purchase] as never }));
    expect(t.cashOut).toBeCloseTo(90000, 2);
  });
});

describe("loan ledger events", () => {
  it("treats the payoff as neutral — the title company settles it", () => {
    const t = tally(build({ loanLedger: [ledger({ entry_type: "payoff", amount: 301449.36 })] as never }));
    expect(t.cashOut).toBe(0);
  });

  it("keeps disbursements and accruals off the cash tally", () => {
    const t = tally(build({ loanLedger: [
      ledger({ entry_type: "disbursement", amount: 81909.3 }),
      ledger({ entry_type: "interest_accrual", amount: 1090.7 }),
    ] as never }));
    expect(t.cashIn).toBe(0);
    expect(t.cashOut).toBe(0);
  });

  it("still counts interest and fees Blake actually pays", () => {
    const t = tally(build({ loanLedger: [
      ledger({ entry_type: "interest_payment", amount: 608.84 }),
      ledger({ entry_type: "fee", amount: 250 }),
    ] as never }));
    expect(t.cashOut).toBeCloseTo(858.84, 2);
  });
});

describe("contractor payments", () => {
  it("counts only out-of-pocket payments as cash out", () => {
    // Draw-funded work is the lender's money, not Blake's.
    const t = tally(build({ payments: [
      payment({ amount: 45744, status: "paid_personal" }),
      payment({ amount: 135884.46, status: "reimbursed" }),
      payment({ amount: 73706.66, status: "paid_from_draw" }),
    ] as never }));
    expect(t.cashOut).toBeCloseTo(45744, 2);
  });
});

describe("the whole Peach Springs picture", () => {
  it("nets to the money that actually reached Blake's account", () => {
    const t = tally(build({
      settlements: [{ ...saleSettlement, other_fees: [] }] as never,
      loanLedger: [
        ledger({ entry_type: "payoff", amount: 301449.36 }),
        ledger({ entry_type: "disbursement", amount: 81909.3 }),
        ledger({ entry_type: "interest_payment", amount: 1090.7 }),
        ledger({ entry_type: "interest_payment", amount: 608.84 }),
        ledger({ entry_type: "interest_payment", amount: 549.92 }),
        ledger({ entry_type: "interest_payment", amount: 1234.72 }),
      ] as never,
      payments: [
        payment({ amount: 45744, status: "paid_personal" }),
        payment({ amount: 209591.12, status: "reimbursed" }),
      ] as never,
    }));
    expect(t.cashIn).toBeCloseTo(240847.54, 2);
    expect(t.cashOut).toBeCloseTo(49228.18, 2);
    expect(t.net).toBeCloseTo(191619.36, 2);
  });
});
