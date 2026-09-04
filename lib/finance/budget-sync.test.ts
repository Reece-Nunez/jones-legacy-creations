import { describe, it, expect } from "vitest";
import { planBudgetSync, BudgetSyncError } from "./budget-sync";

const existing = [
  { id: "row-1", line_number: "1", description: "Permits" },
  { id: "row-2", line_number: "2", description: "Excavation" },
  { id: "row-3", line_number: "10a", description: "Plumbing rough" },
];

/** The list the client sends back is the whole budget, so what it leaves out
 *  is as meaningful as what it includes. */
function submit(rows: Array<Partial<{ id: string | null; line_number: string; description: string; budgeted_amount: unknown }>>) {
  return rows.map((r) => ({
    id: r.id ?? null,
    line_number: r.line_number ?? "x",
    description: r.description ?? "Something",
    budgeted_amount: r.budgeted_amount ?? 0,
  }));
}

describe("planBudgetSync", () => {
  it("leaves an unchanged budget alone", () => {
    const plan = planBudgetSync(
      existing,
      submit([
        { id: "row-1", line_number: "1", description: "Permits", budgeted_amount: 5000 },
        { id: "row-2", line_number: "2", description: "Excavation", budgeted_amount: 12000 },
        { id: "row-3", line_number: "10a", description: "Plumbing rough", budgeted_amount: 0 },
      ]),
    );

    expect(plan.deleteIds).toEqual([]);
    expect(plan.renames).toEqual([]);
    expect(plan.upserts).toHaveLength(3);
    expect(plan.upserts[0]).toMatchObject({ id: "row-1", line_number: "1", budgeted_amount: 5000 });
  });

  it("deletes rows the client left out", () => {
    const plan = planBudgetSync(
      existing,
      submit([{ id: "row-1", line_number: "1", description: "Permits" }]),
    );

    expect(plan.deleteIds).toEqual(["row-2", "row-3"]);
    expect(plan.upserts).toHaveLength(1);
  });

  it("adds rows that arrive without an id", () => {
    const plan = planBudgetSync(
      existing,
      submit([
        { id: "row-1", line_number: "1", description: "Permits" },
        { id: "row-2", line_number: "2", description: "Excavation" },
        { id: "row-3", line_number: "10a", description: "Plumbing rough" },
        { id: null, line_number: "30", description: "Solar", budgeted_amount: "18500" },
      ]),
    );

    expect(plan.deleteIds).toEqual([]);
    const added = plan.upserts.find((r) => r.line_number === "30");
    expect(added).toEqual({
      line_number: "30",
      description: "Solar",
      budgeted_amount: 18500,
      notes: null,
    });
    expect(added).not.toHaveProperty("id");
  });

  it("reports a renumbered line so its spend can follow", () => {
    const plan = planBudgetSync(
      existing,
      submit([
        { id: "row-1", line_number: "1", description: "Permits" },
        { id: "row-2", line_number: "2", description: "Excavation" },
        { id: "row-3", line_number: "10b", description: "Plumbing rough" },
      ]),
    );

    expect(plan.renames).toEqual([{ from: "10a", to: "10b" }]);
  });

  it("renaming only the description is not a renumber", () => {
    const plan = planBudgetSync(
      existing,
      submit([
        { id: "row-1", line_number: "1", description: "Permits & fees" },
        { id: "row-2", line_number: "2", description: "Excavation" },
        { id: "row-3", line_number: "10a", description: "Plumbing rough" },
      ]),
    );

    expect(plan.renames).toEqual([]);
    expect(plan.upserts[0].description).toBe("Permits & fees");
  });

  it("trims whitespace and strips currency formatting", () => {
    const plan = planBudgetSync(
      [],
      submit([{ line_number: "  7 ", description: "  Framing  ", budgeted_amount: "$1,250.50" }]),
    );

    expect(plan.upserts[0]).toMatchObject({
      line_number: "7",
      description: "Framing",
      budgeted_amount: 1250.5,
    });
  });

  it("rejects a duplicate line number regardless of case", () => {
    expect(() =>
      planBudgetSync(
        [],
        submit([
          { line_number: "10a", description: "Plumbing" },
          { line_number: "10A", description: "Plumbing again" },
        ]),
      ),
    ).toThrow(BudgetSyncError);
  });

  it("rejects a blank line number or description", () => {
    expect(() => planBudgetSync([], submit([{ line_number: "  ", description: "Framing" }]))).toThrow(
      /line number/i,
    );
    expect(() => planBudgetSync([], submit([{ line_number: "7", description: "" }]))).toThrow(
      /description/i,
    );
  });

  it("rejects a negative or non-numeric amount", () => {
    expect(() =>
      planBudgetSync([], submit([{ line_number: "7", description: "Framing", budgeted_amount: -5 }])),
    ).toThrow(/negative/i);
    expect(() =>
      planBudgetSync([], submit([{ line_number: "7", description: "Framing", budgeted_amount: "abc" }])),
    ).toThrow(/number/i);
  });

  it("refuses an id that does not belong to this project", () => {
    // Otherwise a crafted payload could upsert straight over another
    // project's budget row, since the upsert keys on the primary key.
    expect(() =>
      planBudgetSync(existing, submit([{ id: "row-from-elsewhere", line_number: "1", description: "Permits" }])),
    ).toThrow(BudgetSyncError);
  });

  it("treats an empty submission as deleting the whole budget", () => {
    const plan = planBudgetSync(existing, []);
    expect(plan.deleteIds).toEqual(["row-1", "row-2", "row-3"]);
    expect(plan.upserts).toEqual([]);
  });
});
