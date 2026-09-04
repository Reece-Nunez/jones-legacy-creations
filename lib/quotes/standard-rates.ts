/**
 * Turning Blake's per-square-foot rates into a starting cost breakdown.
 *
 * A rate is a starting point, not an answer: the numbers this produces are
 * meant to be overwritten as real bids come in. So filling a quote never
 * clobbers a cost someone already typed — a trade already carrying a number is
 * left exactly as it is, and only blank lines get seeded.
 */

export type StandardRate = {
  id: string;
  trade_name: string;
  rate_per_sqft: number;
  contractor_note?: string | null;
  active?: boolean;
};

export type BreakdownItem = {
  trade: string;
  cost: number;
  isOwnerPurchase?: boolean;
};

export type FillResult<T> = {
  items: T[];
  /** Trades that were given a number, for the confirmation message. */
  filled: string[];
  /** Trades that had a rate but were left alone because they already had a cost. */
  skipped: string[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Same trade, written differently: "Plumbing" and " plumbing " are one line. */
function tradeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function costFromRate(ratePerSqft: number, squareFootage: number): number {
  if (!Number.isFinite(ratePerSqft) || !Number.isFinite(squareFootage)) return 0;
  if (ratePerSqft <= 0 || squareFootage <= 0) return 0;
  return round2(ratePerSqft * squareFootage);
}

/**
 * Seed blank line items from the rate table.
 *
 * @param items the breakdown as it stands
 * @param rates the standard rates, one per trade
 * @param squareFootage the home's size; nothing is filled without it
 * @param makeItem builds a row for a rated trade the breakdown lacks. Supplied
 *   by the caller so this stays agnostic about the shape of a line item.
 */
export function fillFromStandardRates<T extends BreakdownItem>(
  items: T[],
  rates: StandardRate[],
  squareFootage: number,
  makeItem: (trade: string, cost: number) => T,
): FillResult<T> {
  if (!Number.isFinite(squareFootage) || squareFootage <= 0) {
    return { items, filled: [], skipped: [] };
  }

  const active = rates.filter((r) => r.active !== false && r.rate_per_sqft > 0);
  const byTrade = new Map(active.map((r) => [tradeKey(r.trade_name), r]));

  const filled: string[] = [];
  const skipped: string[] = [];
  const usedRates = new Set<string>();

  const next = items.map((item) => {
    const key = tradeKey(item.trade);
    const rate = byTrade.get(key);
    if (!rate) return item;

    usedRates.add(key);

    // An owner purchase is the client's own number, and a trade with a cost
    // already on it is a real bid. Neither is ours to overwrite.
    if (item.isOwnerPurchase || item.cost > 0) {
      skipped.push(item.trade);
      return item;
    }

    filled.push(item.trade);
    return { ...item, cost: costFromRate(rate.rate_per_sqft, squareFootage) };
  });

  // A rate for a trade the breakdown doesn't have yet is still useful — add it
  // rather than silently dropping the number Blake took the trouble to record.
  for (const rate of active) {
    const key = tradeKey(rate.trade_name);
    if (usedRates.has(key)) continue;
    const cost = costFromRate(rate.rate_per_sqft, squareFootage);
    if (cost <= 0) continue;
    next.push(makeItem(rate.trade_name, cost));
    filled.push(rate.trade_name);
  }

  return { items: next, filled, skipped };
}
