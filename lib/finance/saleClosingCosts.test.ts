import { describe, it, expect } from "vitest";
import {
  saleClosingCostsFromSettlement,
  type SaleSettlementCosts,
} from "./project-financials";

const empty: SaleSettlementCosts = {
  seller_concessions: null,
  title_insurance: null,
  escrow_fee: null,
  recording_fees: null,
  prorated_taxes: null,
  other_fees: null,
} as unknown as SaleSettlementCosts;

describe("saleClosingCostsFromSettlement", () => {
  it("sums the Peach Springs ALTA to the figure the profit formula uses", () => {
    // The manual sale_closing_costs field on this project reads $3,703.10 —
    // exactly $15,000 short, because the estimate omitted the concession.
    const peachSprings = {
      ...empty,
      seller_concessions: 15000,
      title_insurance: 2650,
      escrow_fee: 345,
      recording_fees: 255,
      prorated_taxes: 453.1,
      other_fees: [],
    } as unknown as SaleSettlementCosts;
    expect(saleClosingCostsFromSettlement(peachSprings)).toBeCloseTo(18703.1, 2);
  });

  it("includes the seller concession, the line the estimate missed", () => {
    const withConcession = { ...empty, seller_concessions: 15000 } as unknown as SaleSettlementCosts;
    expect(saleClosingCostsFromSettlement(withConcession)).toBe(15000);
  });

  it("treats missing lines as zero rather than NaN", () => {
    expect(saleClosingCostsFromSettlement(empty)).toBe(0);
  });

  it("adds itemised other_fees", () => {
    const s = {
      ...empty,
      escrow_fee: 345,
      other_fees: [{ label: "HOA transfer", amount: 250 }, { label: "Courier", amount: 45 }],
    } as unknown as SaleSettlementCosts;
    expect(saleClosingCostsFromSettlement(s)).toBe(640);
  });

  it("survives a malformed other_fees payload", () => {
    // other_fees is jsonb; a bad row must not take down the edit page.
    for (const bad of [null, "nope", 42, [{ amount: null }], [{}]]) {
      const s = { ...empty, escrow_fee: 100, other_fees: bad } as unknown as SaleSettlementCosts;
      expect(() => saleClosingCostsFromSettlement(s)).not.toThrow();
      expect(saleClosingCostsFromSettlement(s)).toBe(100);
    }
  });

  it("coerces numeric strings, which is how postgres numerics arrive", () => {
    const s = {
      ...empty,
      seller_concessions: "15000.00",
      prorated_taxes: "453.10",
    } as unknown as SaleSettlementCosts;
    expect(saleClosingCostsFromSettlement(s)).toBeCloseTo(15453.1, 2);
  });
});
