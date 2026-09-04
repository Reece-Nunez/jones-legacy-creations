/**
 * Spreading Blake's profit across the line items a client sees.
 *
 * The client gets an itemised proposal, and the items have to add up to the
 * total at the bottom — a proposal whose column doesn't sum is the first thing
 * a client questions. So the profit is not a line: each trade is shown at its
 * cost plus a share of the profit, and the raw cost stays in the admin view
 * only. This replaces hand-rolling a visible "Builder Management Fee".
 *
 * Two details do the real work here:
 *
 *   Owner purchases are never marked up. Those are items the client bought
 *   themselves and Blake is only listing; adding margin to someone's own
 *   receipt is not margin, it is a discrepancy waiting to be spotted.
 *
 *   The profit is allocated in whole cents by largest remainder, not by
 *   rounding each item independently. Rounding twenty items to the cent and
 *   summing them drifts from the intended total, so the shown items would not
 *   equal the shown total — exactly the thing this design exists to avoid.
 */

export type CostItem = {
  cost: number;
  isOwnerPurchase?: boolean;
};

export type PricedItem<T extends CostItem = CostItem> = T & {
  /** What Blake actually pays. Internal. */
  cost: number;
  /** The share of profit loaded onto this line. Internal. */
  profit: number;
  /** cost + profit. This is the only figure the client ever sees. */
  clientPrice: number;
};

export type ProfitBreakdown<T extends CostItem = CostItem> = {
  items: PricedItem<T>[];
  /** Sum of raw costs, contracted work and owner purchases alike. */
  totalCost: number;
  /** Sum of raw costs eligible for markup. */
  markupBase: number;
  /** Profit actually allocated, to the cent. */
  totalProfit: number;
  /** What the client is quoted. Always equals the sum of clientPrice. */
  clientTotal: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const toCents = (n: number) => Math.round(n * 100);

export function priceWithProfit<T extends CostItem>(
  items: T[],
  profitPct: number,
): ProfitBreakdown<T> {
  const pct = Number.isFinite(profitPct) && profitPct > 0 ? profitPct : 0;

  const totalCost = round2(items.reduce((sum, i) => sum + safeCost(i.cost), 0));
  const eligible = items.filter((i) => !i.isOwnerPurchase && safeCost(i.cost) > 0);
  const markupBase = round2(eligible.reduce((sum, i) => sum + safeCost(i.cost), 0));

  if (pct === 0 || markupBase === 0) {
    return {
      items: items.map((item) => ({
        ...item,
        cost: safeCost(item.cost),
        profit: 0,
        clientPrice: safeCost(item.cost),
      })),
      totalCost,
      markupBase,
      totalProfit: 0,
      clientTotal: totalCost,
    };
  }

  // Work in cents so the allocation is exact, then hand back dollars.
  const targetProfitCents = Math.round(toCents(markupBase) * (pct / 100));
  const baseCents = toCents(markupBase);

  // Proportional share, floored, plus one cent to the largest remainders until
  // the target is met. Every cent of the intended profit lands somewhere.
  const shares = eligible.map((item) => {
    const exact = (toCents(safeCost(item.cost)) * targetProfitCents) / baseCents;
    const floor = Math.floor(exact);
    return { item, floor, remainder: exact - floor };
  });

  let allocated = shares.reduce((sum, s) => sum + s.floor, 0);
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);
  let cursor = 0;
  while (allocated < targetProfitCents && byRemainder.length > 0) {
    byRemainder[cursor % byRemainder.length].floor += 1;
    allocated += 1;
    cursor += 1;
  }

  const profitByItem = new Map<T, number>();
  for (const share of shares) profitByItem.set(share.item, share.floor);

  const priced = items.map((item) => {
    const cost = safeCost(item.cost);
    const profitCents = profitByItem.get(item) ?? 0;
    const profit = profitCents / 100;
    return { ...item, cost, profit, clientPrice: round2(cost + profit) };
  });

  const totalProfit = round2(targetProfitCents / 100);

  return {
    items: priced,
    totalCost,
    markupBase,
    totalProfit,
    // Summed from the priced items rather than computed separately, so this
    // figure cannot disagree with the column above it.
    clientTotal: round2(priced.reduce((sum, i) => sum + i.clientPrice, 0)),
  };
}

function safeCost(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
