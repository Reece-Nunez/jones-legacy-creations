import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recalcDrawTotal } from "./draw-total";

/**
 * A draw's amount is derived from the invoices filed under it. The behaviour
 * that matters here is the one that used to be missing: when the last invoice
 * is removed from a draw, the draw must fall to $0 rather than keeping the
 * total it had when the documents were still attached.
 */

type Update = { table: string; values: Record<string, unknown> };

/** Minimal stand-in for the query builder chains this helper uses. */
function makeSupabase(
  docs: { file_url: string | null }[],
  payments: { amount: number | null }[],
) {
  const updates: Update[] = [];
  const paymentFilters: string[][] = [];

  const client = {
    from(table: string) {
      if (table === "documents") {
        const builder = {
          select: () => builder,
          eq: () => Promise.resolve({ data: docs }),
        };
        return builder;
      }
      if (table === "contractor_payments") {
        const builder = {
          select: () => builder,
          eq: () => builder,
          in: (_col: string, values: string[]) => {
            paymentFilters.push(values);
            return Promise.resolve({ data: payments });
          },
        };
        return builder;
      }
      // draw_requests
      const builder = {
        update: (values: Record<string, unknown>) => {
          updates.push({ table, values });
          return builder;
        },
        eq: () => Promise.resolve({ data: null }),
      };
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, updates, paymentFilters };
}

describe("recalcDrawTotal", () => {
  it("sums the payments behind the draw's documents", async () => {
    const { client, updates, paymentFilters } = makeSupabase(
      [{ file_url: "a.pdf" }, { file_url: "b.pdf" }],
      [{ amount: 1200 }, { amount: 3450.25 }],
    );

    const total = await recalcDrawTotal(client, "project-1", "draw-1");

    expect(total).toBe(4650.25);
    expect(updates).toEqual([{ table: "draw_requests", values: { amount: 4650.25 } }]);
    expect(paymentFilters).toEqual([["a.pdf", "b.pdf"]]);
  });

  it("zeroes the draw when its last document is removed", async () => {
    const { client, updates, paymentFilters } = makeSupabase([], []);

    const total = await recalcDrawTotal(client, "project-1", "draw-1");

    expect(total).toBe(0);
    expect(updates).toEqual([{ table: "draw_requests", values: { amount: 0 } }]);
    // No documents left, so there is nothing to look payments up by.
    expect(paymentFilters).toEqual([]);
  });

  it("treats a payment with a null amount as zero", async () => {
    const { client } = makeSupabase(
      [{ file_url: "a.pdf" }],
      [{ amount: null }, { amount: 500 }],
    );

    expect(await recalcDrawTotal(client, "project-1", "draw-1")).toBe(500);
  });

  it("ignores documents that somehow have no file_url", async () => {
    const { client, paymentFilters } = makeSupabase(
      [{ file_url: null }, { file_url: "b.pdf" }],
      [{ amount: 75 }],
    );

    expect(await recalcDrawTotal(client, "project-1", "draw-1")).toBe(75);
    expect(paymentFilters).toEqual([["b.pdf"]]);
  });
});
