import { describe, it, expect } from "vitest";
import { normalizeBudgetLines } from "./analyze-upload";

/**
 * Parsed budget lines are written straight into budget_line_items once
 * approved, and the import replaces the project's whole budget. A single bad
 * row must not be able to take the import down with it.
 */
describe("normalizeBudgetLines", () => {
  it("keeps real cost lines and reads money as written", () => {
    expect(
      normalizeBudgetLines([
        { line_number: "1", description: "Permits & fees", amount: 4200 },
        { line_number: "10a", description: "Plumbing rough", amount: "$12,450.75" },
      ]),
    ).toEqual([
      { line_number: "1", description: "Permits & fees", amount: 4200 },
      { line_number: "10a", description: "Plumbing rough", amount: 12450.75 },
    ]);
  });

  it("numbers unnumbered lines by position", () => {
    const lines = normalizeBudgetLines([
      { description: "Framing", amount: 1 },
      { description: "Drywall", amount: 2 },
    ]);
    expect(lines.map((l) => l.line_number)).toEqual(["1", "2"]);
  });

  it("makes repeated line numbers unique instead of losing a line", () => {
    // (project_id, line_number) is unique, so a document that prints "10" twice
    // would otherwise fail the whole import.
    const lines = normalizeBudgetLines([
      { line_number: "10", description: "Electrical rough", amount: 100 },
      { line_number: "10", description: "Electrical finish", amount: 200 },
      { line_number: "10", description: "Electrical fixtures", amount: 300 },
    ]);
    expect(lines.map((l) => l.line_number)).toEqual(["10", "10-2", "10-3"]);
    expect(lines).toHaveLength(3);
  });

  it("drops rows that aren't cost lines", () => {
    expect(
      normalizeBudgetLines([
        { line_number: "1", description: "", amount: 500 },
        { line_number: "2", description: "   ", amount: 500 },
        { line_number: "3", description: "Negative", amount: -50 },
        { line_number: "4", description: "Good", amount: 0 },
      ]),
    ).toEqual([{ line_number: "4", description: "Good", amount: 0 }]);
  });

  it("survives junk instead of throwing", () => {
    expect(normalizeBudgetLines(null)).toEqual([]);
    expect(normalizeBudgetLines("nope")).toEqual([]);
    expect(normalizeBudgetLines([null, 42, {}])).toEqual([]);
  });

  it("caps runaway text so one bad read can't overflow the column", () => {
    const lines = normalizeBudgetLines([
      { line_number: "x".repeat(50), description: "y".repeat(500), amount: 1 },
    ]);
    expect(lines[0].line_number).toHaveLength(16);
    expect(lines[0].description).toHaveLength(200);
  });
});
