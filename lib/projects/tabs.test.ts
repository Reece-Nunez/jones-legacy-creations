import { describe, it, expect } from "vitest";
import {
  isTabVisible,
  visibleTabs,
  groupTabs,
  groupOfPanel,
  firstPanelOfGroup,
  PROJECT_TAB_GROUP_ORDER,
  type ProjectTabRule,
} from "./tabs";

// Mirrors the real config in ProjectDetail's ALL_TABS.
const OVERVIEW: ProjectTabRule = { key: "overview", group: "overview", cashJob: true, onlyCashJob: false };
const PAYMENTS: ProjectTabRule = { key: "payments", group: "money", cashJob: true, onlyCashJob: false };
const DRAWS: ProjectTabRule = { key: "draws", group: "money", cashJob: false, onlyCashJob: false };
const LOAN: ProjectTabRule = { key: "loan", group: "money", cashJob: false, onlyCashJob: false };

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
    const cashOnly: ProjectTabRule = { key: "x", group: "money", cashJob: true, onlyCashJob: true };
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

const TASKS: ProjectTabRule = { key: "tasks", group: "work", cashJob: true, onlyCashJob: false };
const DOCS: ProjectTabRule = { key: "documents", group: "files", cashJob: true, onlyCashJob: false };
const FULL = [OVERVIEW, PAYMENTS, DRAWS, LOAN, TASKS, DOCS];

describe("groupTabs", () => {
  it("buckets panels into groups in nav order", () => {
    const groups = groupTabs(FULL);
    expect(groups.map((g) => g.key)).toEqual(["overview", "money", "work", "files"]);
  });

  it("collapses the five money panels into one group", () => {
    // The whole point: money was five peer tabs out of fourteen.
    const money = groupTabs(FULL).find((g) => g.key === "money")!;
    expect(money.panels.map((p) => p.key)).toEqual(["payments", "draws", "loan"]);
  });

  it("drops groups with no visible panels rather than rendering them empty", () => {
    // A cash job has no lender panels; the Client group vanishes for read-only
    // contractors the same way.
    const cashJob = visibleTabs(FULL, true);
    const groups = groupTabs(cashJob);
    expect(groups.map((g) => g.key)).toEqual(["overview", "money", "work", "files"]);
    expect(groups.find((g) => g.key === "money")!.panels.map((p) => p.key)).toEqual(["payments"]);
  });

  it("returns no groups for an empty tab list", () => {
    expect(groupTabs([])).toEqual([]);
  });

  it("carries a human label for every group it emits", () => {
    for (const group of groupTabs(FULL)) {
      expect(group.label.length).toBeGreaterThan(0);
    }
  });

  it("never loses a panel", () => {
    const total = groupTabs(FULL).reduce((n, g) => n + g.panels.length, 0);
    expect(total).toBe(FULL.length);
  });

  it("only emits groups declared in the nav order", () => {
    for (const group of groupTabs(FULL)) {
      expect(PROJECT_TAB_GROUP_ORDER).toContain(group.key);
    }
  });
});

describe("groupOfPanel", () => {
  it("finds the group a panel belongs to", () => {
    expect(groupOfPanel(FULL, "draws")).toBe("money");
    expect(groupOfPanel(FULL, "documents")).toBe("files");
  });

  it("returns null for a panel that is not visible", () => {
    // e.g. a deep link to ?tab=draws on a cash job.
    expect(groupOfPanel(visibleTabs(FULL, true), "draws")).toBeNull();
    expect(groupOfPanel(FULL, "nope")).toBeNull();
  });
});

describe("firstPanelOfGroup", () => {
  it("lands on the first visible panel of the group", () => {
    expect(firstPanelOfGroup(FULL, "money")?.key).toBe("payments");
    expect(firstPanelOfGroup(FULL, "files")?.key).toBe("documents");
  });

  it("respects filtering, so a cash job does not land on a lender panel", () => {
    expect(firstPanelOfGroup(visibleTabs(FULL, true), "money")?.key).toBe("payments");
  });

  it("returns null for a group with nothing in it", () => {
    expect(firstPanelOfGroup([], "money")).toBeNull();
  });
});

describe("the money group as ProjectDetail actually configures it", () => {
  // Mirrors ALL_TABS' money panels in order. ALL_TABS itself lives in
  // ProjectDetail.tsx with its lucide icons attached, so it can't be imported
  // into a node-environment test — this fixture stands in for it, and the
  // browser check covers the wiring it can't.
  const MONEY: ProjectTabRule[] = [
    { key: "budget", group: "money", cashJob: true, onlyCashJob: false },
    { key: "payments", group: "money", cashJob: true, onlyCashJob: false },
    { key: "jobcosts", group: "money", cashJob: true, onlyCashJob: false },
    { key: "draws", group: "money", cashJob: false, onlyCashJob: false },
    { key: "loan", group: "money", cashJob: false, onlyCashJob: false },
    { key: "cashflow", group: "money", cashJob: true, onlyCashJob: false },
  ];

  it("keeps job costs next to payments — both are money out", () => {
    const panels = groupTabs(MONEY).find((g) => g.key === "money")!.panels;
    expect(panels.map((p) => p.key)).toEqual([
      "budget", "payments", "jobcosts", "draws", "loan", "cashflow",
    ]);
  });

  it("shows job costs on a cash job, where the lender panels drop out", () => {
    // The reason this panel exists at all: it used to be gated on having a
    // sale price and a loan amount, so the jobs least likely to have lender
    // fields were the ones that couldn't record a tank of fuel.
    const panels = groupTabs(visibleTabs(MONEY, true))
      .find((g) => g.key === "money")!.panels;
    expect(panels.map((p) => p.key)).toEqual(["budget", "payments", "jobcosts", "cashflow"]);
  });

  it("shows job costs on a financed job too", () => {
    const panels = groupTabs(visibleTabs(MONEY, false))
      .find((g) => g.key === "money")!.panels;
    expect(panels.map((p) => p.key)).toContain("jobcosts");
  });

  it("resolves ?tab=jobcosts to the money group", () => {
    expect(groupOfPanel(MONEY, "jobcosts")).toBe("money");
  });
});
