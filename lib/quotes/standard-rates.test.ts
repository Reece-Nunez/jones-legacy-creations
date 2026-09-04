import { describe, it, expect } from "vitest";
import { costFromRate, fillFromStandardRates } from "./standard-rates";

type BreakdownItem = { id: string; trade: string; cost: number; isOwnerPurchase: boolean; note: string };

let seq = 0;
const makeItem = (trade: string, cost: number): BreakdownItem =>
  ({ id: `new-${++seq}`, trade, cost, isOwnerPurchase: false, note: "" });

const rates = [
  { id: "r1", trade_name: "Plumbing", rate_per_sqft: 8.5 },
  { id: "r2", trade_name: "Electrical", rate_per_sqft: 7.25 },
  { id: "r3", trade_name: "Drywall", rate_per_sqft: 9 },
];

function item(trade: string, cost = 0, extra: Partial<BreakdownItem> = {}): BreakdownItem {
  return { id: trade, trade, cost, isOwnerPurchase: false, note: "", ...extra };
}

describe("costFromRate", () => {
  it("multiplies out to the cent", () => {
    expect(costFromRate(8.5, 2400)).toBe(20400);
    expect(costFromRate(7.25, 2350)).toBe(17037.5);
  });

  it("returns nothing without a usable rate and size", () => {
    expect(costFromRate(8.5, 0)).toBe(0);
    expect(costFromRate(0, 2400)).toBe(0);
    expect(costFromRate(-2, 2400)).toBe(0);
    expect(costFromRate(8.5, NaN)).toBe(0);
  });
});

describe("fillFromStandardRates", () => {
  it("fills blank trades from the rate table", () => {
    const { items, filled } = fillFromStandardRates(
      [item("Plumbing"), item("Electrical")],
      rates,
      2400,
      makeItem,
    );

    expect(items.find((i) => i.trade === "Plumbing")!.cost).toBe(20400);
    expect(items.find((i) => i.trade === "Electrical")!.cost).toBe(17400);
    expect(filled).toContain("Plumbing");
  });

  it("never overwrites a cost that is already there", () => {
    // A number on the breakdown is a real bid. The rate is only a starting
    // point, so it loses.
    const { items, skipped, filled } = fillFromStandardRates(
      [item("Plumbing", 18750)],
      rates,
      2400,
      makeItem,
    );

    expect(items.find((i) => i.trade === "Plumbing")!.cost).toBe(18750);
    expect(skipped).toContain("Plumbing");
    expect(filled).not.toContain("Plumbing");
  });

  it("never touches an owner purchase", () => {
    const { items } = fillFromStandardRates(
      [item("Plumbing", 0, { isOwnerPurchase: true })],
      rates,
      2400,
      makeItem,
    );
    expect(items[0].cost).toBe(0);
  });

  it("matches trades regardless of case and spacing", () => {
    const { items } = fillFromStandardRates([item("  plumbing  ")], rates, 2000, makeItem);
    expect(items[0].cost).toBe(17000);
  });

  it("adds a rated trade the breakdown doesn't have yet", () => {
    const { items, filled } = fillFromStandardRates([item("Plumbing")], rates, 2000, makeItem);

    expect(items).toHaveLength(3);
    expect(items.map((i) => i.trade)).toEqual(
      expect.arrayContaining(["Plumbing", "Electrical", "Drywall"]),
    );
    expect(filled).toHaveLength(3);
  });

  it("leaves trades with no rate alone", () => {
    // Permitting and Land have no sensible per-sqft rate, so they have no row
    // and stay blank for manual entry.
    const { items } = fillFromStandardRates(
      [item("Permitting"), item("Land")],
      rates,
      2400,
      makeItem,
    );
    expect(items.find((i) => i.trade === "Permitting")!.cost).toBe(0);
    expect(items.find((i) => i.trade === "Land")!.cost).toBe(0);
  });

  it("does nothing without a square footage", () => {
    const original = [item("Plumbing")];
    const { items, filled } = fillFromStandardRates(original, rates, 0, makeItem);
    expect(items).toBe(original);
    expect(filled).toEqual([]);
  });

  it("skips deactivated rates", () => {
    const { items } = fillFromStandardRates(
      [item("Plumbing")],
      [{ id: "r1", trade_name: "Plumbing", rate_per_sqft: 8.5, active: false }],
      2400,
      makeItem,
    );
    expect(items[0].cost).toBe(0);
  });
});
