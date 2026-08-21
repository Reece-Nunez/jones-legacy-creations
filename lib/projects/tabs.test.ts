import { describe, it, expect } from "vitest";
import { isTabVisible, visibleTabs, type ProjectTabRule } from "./tabs";

// Mirrors the real config in ProjectDetail's ALL_TABS.
const OVERVIEW: ProjectTabRule = { key: "overview", cashJob: true, onlyCashJob: false };
const PAYMENTS: ProjectTabRule = { key: "payments", cashJob: true, onlyCashJob: false };
const DRAWS: ProjectTabRule = { key: "draws", cashJob: false, onlyCashJob: false };
const LOAN: ProjectTabRule = { key: "loan", cashJob: false, onlyCashJob: false };

describe("isTabVisible", () => {
  it("shows shared tabs on both job types", () => {
    expect(isTabVisible(OVERVIEW, true)).toBe(true);
    expect(isTabVisible(OVERVIEW, false)).toBe(true);
  });

  it("hides financed-only tabs on cash jobs", () => {
    // Draws and Loan are meaningless without a lender.
    expect(isTabVisible(DRAWS, true)).toBe(false);
    expect(isTabVisible(LOAN, true)).toBe(false);
    expect(isTabVisible(DRAWS, false)).toBe(true);
  });

  it("shows Payments on financed jobs", () => {
    // Regression guard. Payments used to be onlyCashJob, which hid it on every
    // financed project — including the one holding 31 of the 36 payments in
    // the system, 7 of them not attached to any draw.
    expect(isTabVisible(PAYMENTS, false)).toBe(true);
    expect(isTabVisible(PAYMENTS, true)).toBe(true);
  });

  it("still honours a genuinely cash-only tab", () => {
    const cashOnly: ProjectTabRule = { key: "x", cashJob: true, onlyCashJob: true };
    expect(isTabVisible(cashOnly, true)).toBe(true);
    expect(isTabVisible(cashOnly, false)).toBe(false);
  });

  it("treats null/undefined is_cash_job as financed", () => {
    // The column is nullable; a null must not silently hide the financed tabs.
    expect(isTabVisible(DRAWS, null)).toBe(true);
    expect(isTabVisible(DRAWS, undefined)).toBe(true);
    expect(isTabVisible(PAYMENTS, null)).toBe(true);
  });
});

describe("visibleTabs", () => {
  const ALL = [OVERVIEW, PAYMENTS, DRAWS, LOAN];

  it("gives a financed job everything including Payments", () => {
    expect(visibleTabs(ALL, false).map((t) => t.key)).toEqual([
      "overview", "payments", "draws", "loan",
    ]);
  });

  it("drops lender tabs on a cash job but keeps Payments", () => {
    expect(visibleTabs(ALL, true).map((t) => t.key)).toEqual(["overview", "payments"]);
  });

  it("preserves declaration order", () => {
    const keys = visibleTabs(ALL, false).map((t) => t.key);
    expect(keys).toEqual(ALL.filter((t) => keys.includes(t.key)).map((t) => t.key));
  });

  it("returns a new array rather than mutating the input", () => {
    const out = visibleTabs(ALL, true);
    expect(out).not.toBe(ALL);
    expect(ALL).toHaveLength(4);
  });
});
