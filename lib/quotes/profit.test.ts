import { describe, it, expect } from "vitest";
import { priceWithProfit } from "./profit";

/**
 * The invariant that matters: what the client sees in the column must add up
 * to what they see at the bottom. If those ever disagree the proposal invites
 * exactly the question the hidden margin exists to avoid.
 */

const sumClient = (items: { clientPrice: number }[]) =>
  Math.round(items.reduce((s, i) => s + i.clientPrice, 0) * 100) / 100;

describe("priceWithProfit", () => {
  it("loads the profit onto the line items, never as its own line", () => {
    const { items, totalCost, totalProfit, clientTotal } = priceWithProfit(
      [{ cost: 1000 }, { cost: 3000 }],
      10,
    );

    expect(totalCost).toBe(4000);
    expect(totalProfit).toBe(400);
    expect(clientTotal).toBe(4400);
    // Proportional: the $3,000 trade carries three quarters of the margin.
    expect(items.map((i) => i.clientPrice)).toEqual([1100, 3300]);
  });

  it("line items always sum exactly to the client total", () => {
    // Amounts chosen so per-item rounding drifts: a third of a cent each.
    const costs = [333.33, 333.33, 333.34, 1.01, 0.02, 99999.99];
    const { items, clientTotal } = priceWithProfit(
      costs.map((cost) => ({ cost })),
      7.5,
    );

    expect(sumClient(items)).toBe(clientTotal);
  });

  it("holds the invariant across a spread of awkward percentages", () => {
    const costs = [12345.67, 89.01, 4200, 33.33, 7, 615.99, 1000000];
    for (const pct of [3, 7.5, 10, 12.375, 15, 22.7, 33.333]) {
      const { items, clientTotal, totalProfit, markupBase } = priceWithProfit(
        costs.map((cost) => ({ cost })),
        pct,
      );
      expect(sumClient(items)).toBe(clientTotal);
      // And the margin is the one that was asked for, to the cent.
      expect(totalProfit).toBe(Math.round(markupBase * (pct / 100) * 100) / 100);
    }
  });

  it("never marks up an owner purchase", () => {
    // The client bought the trampoline. Adding margin to their own receipt is
    // not margin, it is a number they can check.
    const { items, markupBase, totalProfit, clientTotal } = priceWithProfit(
      [
        { cost: 10000, isOwnerPurchase: false },
        { cost: 2999, isOwnerPurchase: true },
      ],
      10,
    );

    expect(markupBase).toBe(10000);
    expect(totalProfit).toBe(1000);
    expect(items[0].clientPrice).toBe(11000);
    expect(items[1].clientPrice).toBe(2999);
    expect(items[1].profit).toBe(0);
    expect(clientTotal).toBe(13999);
  });

  it("leaves everything alone at 0%", () => {
    const { items, totalProfit, clientTotal } = priceWithProfit(
      [{ cost: 500 }, { cost: 250 }],
      0,
    );
    expect(totalProfit).toBe(0);
    expect(clientTotal).toBe(750);
    expect(items.every((i) => i.clientPrice === i.cost)).toBe(true);
  });

  it("puts no margin on a zero-cost line", () => {
    // Blank trades are common on a half-filled breakdown; they must not pick
    // up a share and start showing a price.
    const { items } = priceWithProfit([{ cost: 0 }, { cost: 1000 }], 10);
    expect(items[0].clientPrice).toBe(0);
    expect(items[0].profit).toBe(0);
    expect(items[1].clientPrice).toBe(1100);
  });

  it("handles a breakdown that is entirely owner purchases", () => {
    const { markupBase, totalProfit, clientTotal } = priceWithProfit(
      [{ cost: 500, isOwnerPurchase: true }],
      15,
    );
    expect(markupBase).toBe(0);
    expect(totalProfit).toBe(0);
    expect(clientTotal).toBe(500);
  });

  it("ignores junk costs instead of producing NaN", () => {
    const { totalCost, clientTotal } = priceWithProfit(
      [{ cost: NaN }, { cost: -100 }, { cost: 1000 }],
      10,
    );
    expect(totalCost).toBe(1000);
    expect(clientTotal).toBe(1100);
  });

  it("carries the caller's own fields through untouched", () => {
    const { items } = priceWithProfit(
      [{ cost: 100, trade: "Plumbing", note: "Bob" }],
      10,
    );
    expect(items[0]).toMatchObject({ trade: "Plumbing", note: "Bob", clientPrice: 110 });
  });

  it("reproduces the real quote's shape without a visible fee line", () => {
    // QTE-2026-0003 carried a $25,000 "Builder Management Fee" as a line the
    // client could see. At 10% on the remaining $540,000 of real cost the
    // margin is larger and invisible.
    const trades = [
      15000, 30000, 60000, 65000, 20000, 25000, 12000, 10000, 23000, 20000,
      22000, 25000, 18000, 30000, 10000, 25000, 80000, 10000, 10000, 5000, 25000,
    ];
    const { items, totalCost, totalProfit, clientTotal } = priceWithProfit(
      trades.map((cost) => ({ cost })),
      10,
    );

    expect(totalCost).toBe(540000);
    expect(totalProfit).toBe(54000);
    expect(clientTotal).toBe(594000);
    expect(sumClient(items)).toBe(594000);
  });
});
