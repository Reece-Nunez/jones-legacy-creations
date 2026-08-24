import { describe, it, expect } from "vitest";
import { buildAppMap, APP_AREAS, TASK_RECIPES } from "./app-map";
import { PROJECT_PANELS } from "@/lib/projects/tabs";

/**
 * The app map is the help assistant's only knowledge of this app. Both things
 * tested here fail silently in production if they break: a missing panel makes
 * the assistant confidently claim a feature doesn't exist, and an unstable
 * string kills the prompt cache without changing a single answer.
 */

describe("buildAppMap", () => {
  it("describes every panel on the project page", () => {
    // The failure this prevents: someone adds a panel, the assistant has never
    // heard of it, and tells a user it isn't there. Which is exactly the
    // support question the assistant was built to stop.
    const map = buildAppMap();
    for (const panel of PROJECT_PANELS) {
      expect(map, `missing panel: ${panel.key}`).toContain(`?tab=${panel.key}`);
      expect(map, `missing label: ${panel.label}`).toContain(panel.label);
    }
  });

  it("gives every panel help copy that isn't just the label again", () => {
    for (const panel of PROJECT_PANELS) {
      expect(panel.help.length, `${panel.key} has no help`).toBeGreaterThan(20);
      expect(panel.help, `${panel.key} help restates the label`).not.toBe(panel.label);
    }
  });

  it("is byte-stable across calls", () => {
    // Prompt caching is a prefix match, and the map is the cached prefix. A
    // date, a random id, or an unordered collection anywhere in here would
    // drop the hit rate to zero and quietly multiply the cost of every
    // question, with no visible symptom. Cheap to pin, expensive to miss.
    expect(buildAppMap()).toBe(buildAppMap());
  });

  it("carries no obvious cache-buster", () => {
    const map = buildAppMap();
    expect(map).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/); // ISO timestamp
    expect(map).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}/i); // uuid v4
  });

  it("marks the lender-only panels so it can't send a cash job to Draws", () => {
    const map = buildAppMap();
    const draws = map.split("\n").find((l) => l.includes("?tab=draws")) ?? "";
    expect(draws).toContain("financed jobs only");
  });

  it("keeps the two panels that caused real support questions", () => {
    // 2026-08-23: a subcontractor invoice and a tank of fuel each had no
    // obvious home. If either recipe is ever dropped, that regresses.
    const map = buildAppMap();
    expect(map).toContain("?tab=payments");
    expect(map).toContain("?tab=jobcosts");
    expect(map.toLowerCase()).toContain("fuel");
  });
});

describe("task recipes", () => {
  it("routes every link through a real admin path", () => {
    for (const recipe of TASK_RECIPES) {
      if (!recipe.href) continue;
      expect(recipe.href, recipe.task).toMatch(/^\/admin\//);
    }
  });

  it("only uses {projectId} on project-scoped links", () => {
    // A link with an unsubstituted placeholder is a 404 the user has to
    // interpret. If it takes a project id, it must live under /admin/projects/.
    for (const recipe of TASK_RECIPES) {
      if (!recipe.href?.includes("{projectId}")) continue;
      expect(recipe.href, recipe.task).toMatch(/^\/admin\/projects\/\{projectId\}/);
    }
  });

  it("points every project-scoped link at a panel that exists", () => {
    const keys = new Set<string>(PROJECT_PANELS.map((p) => p.key));
    for (const recipe of TASK_RECIPES) {
      const tab = recipe.href?.match(/\?tab=([a-z]+)/)?.[1];
      if (!tab) continue;
      expect(keys.has(tab), `${recipe.task} → unknown panel "${tab}"`).toBe(true);
    }
  });

  it("gives every recipe at least two steps", () => {
    for (const recipe of TASK_RECIPES) {
      expect(recipe.steps.length, recipe.task).toBeGreaterThan(1);
    }
  });
});

describe("app areas", () => {
  it("points at absolute admin paths", () => {
    for (const area of APP_AREAS) {
      expect(area.href, area.label).toMatch(/^\/admin/);
    }
  });
});
