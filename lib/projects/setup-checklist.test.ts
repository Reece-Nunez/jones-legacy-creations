import { describe, it, expect } from "vitest";
import {
  setupChecklist,
  setupProgress,
  needsPropertyDetails,
  stepHref,
  type SetupProject,
  type SetupCounts,
} from "./setup-checklist";
import { PROJECT_PANELS } from "./tabs";

const EMPTY: SetupCounts = {
  budgetLineItems: 0,
  payments: 0,
  jobCosts: 0,
  documents: 0,
  permits: 0,
};

const FULL: SetupCounts = {
  budgetLineItems: 22,
  payments: 3,
  jobCosts: 1,
  documents: 4,
  permits: 1,
};

/** A financed client build with nothing filled in — Niki Miles on day one. */
const NEW_FINANCED: SetupProject = {
  id: "p1",
  status: "approved",
  is_cash_job: false,
  square_footage: null,
  loan_amount: null,
  sale_price: null,
};

const NEW_CASH: SetupProject = { ...NEW_FINANCED, is_cash_job: true, markup_percent: null };

describe("needsPropertyDetails", () => {
  it("flags an active project with no square footage", () => {
    expect(needsPropertyDetails(NEW_FINANCED)).toBe(true);
  });

  it("clears once square footage is filled in", () => {
    expect(needsPropertyDetails({ ...NEW_FINANCED, square_footage: 2500 })).toBe(false);
  });

  it("leaves completed and archived projects alone", () => {
    // Nagging about details on a job that has already been sold is noise, and
    // the dashboard has always taken this view — this is the shared rule.
    expect(needsPropertyDetails({ ...NEW_FINANCED, status: "completed" })).toBe(false);
    expect(needsPropertyDetails({ ...NEW_FINANCED, status: "archived" })).toBe(false);
  });
});

describe("setupChecklist", () => {
  it("marks everything undone on a brand-new project", () => {
    const steps = setupChecklist(NEW_FINANCED, EMPTY);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(setupProgress(steps).complete).toBe(false);
  });

  it("completes once the project is actually set up", () => {
    const steps = setupChecklist(
      { ...NEW_FINANCED, square_footage: 2500, loan_amount: 400000, sale_price: 650000 },
      FULL,
    );
    expect(setupProgress(steps).complete).toBe(true);
    expect(setupProgress(steps).remaining).toEqual([]);
  });

  it("asks a financed job for lender figures and a cash job for markup", () => {
    // Offering both would put a step on the list the job can never satisfy.
    const financed = setupChecklist(NEW_FINANCED, EMPTY).map((s) => s.key);
    const cash = setupChecklist(NEW_CASH, EMPTY).map((s) => s.key);
    expect(financed).toContain("loan");
    expect(financed).not.toContain("markup");
    expect(cash).toContain("markup");
    expect(cash).not.toContain("loan");
  });

  it("counts the loan step done only when both figures are present", () => {
    const half = setupChecklist({ ...NEW_FINANCED, loan_amount: 400000 }, EMPTY);
    expect(half.find((s) => s.key === "loan")!.done).toBe(false);
  });

  it("accepts either a payment or a job cost as the first cost", () => {
    // The two live on different panels and either one means spending started.
    const viaPayment = setupChecklist(NEW_FINANCED, { ...EMPTY, payments: 1 });
    const viaJobCost = setupChecklist(NEW_FINANCED, { ...EMPTY, jobCosts: 1 });
    expect(viaPayment.find((s) => s.key === "spend")!.done).toBe(true);
    expect(viaJobCost.find((s) => s.key === "spend")!.done).toBe(true);
  });

  it("treats a zero markup as unset on a cash job", () => {
    // 0% markup would price the job at cost, so it is never a deliberate answer.
    const steps = setupChecklist({ ...NEW_CASH, markup_percent: 0 }, EMPTY);
    expect(steps.find((s) => s.key === "markup")!.done).toBe(false);
  });

  it("gives every step a reason, not just a label", () => {
    // The `why` line is what teaches someone the app exists in that shape;
    // a checklist of bare imperatives would not.
    for (const step of setupChecklist(NEW_FINANCED, EMPTY)) {
      expect(step.why.length, step.key).toBeGreaterThan(20);
      expect(step.why, step.key).not.toBe(step.label);
    }
  });
});

describe("step links", () => {
  it("only points at panels that exist", () => {
    // A step linking to a panel that was renamed is a 404 the user has to
    // interpret. PROJECT_PANELS is the same registry the tab bar renders from.
    const keys = new Set<string>(PROJECT_PANELS.map((p) => p.key));
    for (const project of [NEW_FINANCED, NEW_CASH]) {
      for (const step of setupChecklist(project, EMPTY)) {
        if (!step.tab) continue;
        expect(keys.has(step.tab), `${step.key} → unknown panel "${step.tab}"`).toBe(true);
      }
    }
  });

  it("builds a tab link or uses the absolute one", () => {
    const steps = setupChecklist(NEW_FINANCED, EMPTY);
    const budget = steps.find((s) => s.key === "budget")!;
    const details = steps.find((s) => s.key === "details")!;
    expect(stepHref(budget, "p1")).toBe("/admin/projects/p1?tab=budget");
    expect(stepHref(details, "p1")).toBe("/admin/projects/p1/edit");
  });

  it("never emits an unresolved placeholder", () => {
    for (const step of setupChecklist(NEW_FINANCED, EMPTY)) {
      expect(stepHref(step, "p1")).not.toContain("{");
      expect(stepHref(step, "p1")).not.toContain("null");
    }
  });
});
