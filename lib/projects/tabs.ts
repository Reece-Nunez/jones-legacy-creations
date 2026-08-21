/**
 * Which tabs a project detail page shows, and how they group.
 *
 * Extracted from ProjectDetail so the rules are testable. The visibility rule
 * was an inline ternary over two similarly-named booleans, and it got the
 * Payments tab wrong: `onlyCashJob` hid it on every financed job, which is
 * where most contractor payments actually live.
 *
 * Grouping exists because the page had grown to 14 peer tabs in a horizontal
 * scroll strip, with money spread across five of them. Groups are navigation
 * only — each panel still renders exactly as before, and panel keys are
 * unchanged so existing `?tab=payments` links keep working.
 */

export type ProjectTabGroupKey =
  | "overview"
  | "money"
  | "work"
  | "client"
  | "files";

export const PROJECT_TAB_GROUP_LABELS: Record<ProjectTabGroupKey, string> = {
  overview: "Overview",
  money: "Money",
  work: "Work",
  client: "Client",
  files: "Files",
};

/** Left-to-right order of the top-level nav. */
export const PROJECT_TAB_GROUP_ORDER: ProjectTabGroupKey[] = [
  "overview",
  "money",
  "work",
  "client",
  "files",
];

export interface ProjectTabRule {
  key: string;
  group: ProjectTabGroupKey;
  /** Shown on cash jobs. */
  cashJob: boolean;
  /** Shown ONLY on cash jobs — hides the tab on financed jobs. */
  onlyCashJob: boolean;
}

/**
 * Cash jobs opt in via `cashJob`; financed jobs get everything except the
 * cash-only tabs. Two flags rather than one because the sets aren't
 * complements: a tab can be on both (most), cash-only, or financed-only.
 */
export function isTabVisible(
  tab: ProjectTabRule,
  isCashJob: boolean | null | undefined,
): boolean {
  return isCashJob ? tab.cashJob : !tab.onlyCashJob;
}

export function visibleTabs<T extends ProjectTabRule>(
  tabs: readonly T[],
  isCashJob: boolean | null | undefined,
): T[] {
  return tabs.filter((tab) => isTabVisible(tab, isCashJob));
}

export interface ProjectTabGroup<T extends ProjectTabRule> {
  key: ProjectTabGroupKey;
  label: string;
  panels: T[];
}

/**
 * Bucket already-filtered tabs into their groups, in nav order.
 *
 * Groups with no visible panels are dropped rather than rendered empty — a
 * cash job has no lender panels, and on a contractor's read-only view the
 * whole Client group can disappear.
 */
export function groupTabs<T extends ProjectTabRule>(
  tabs: readonly T[],
): ProjectTabGroup<T>[] {
  return PROJECT_TAB_GROUP_ORDER.map((key) => ({
    key,
    label: PROJECT_TAB_GROUP_LABELS[key],
    panels: tabs.filter((tab) => tab.group === key),
  })).filter((group) => group.panels.length > 0);
}

/** The group a panel belongs to, or null if the panel isn't visible. */
export function groupOfPanel<T extends ProjectTabRule>(
  tabs: readonly T[],
  panelKey: string,
): ProjectTabGroupKey | null {
  return tabs.find((tab) => tab.key === panelKey)?.group ?? null;
}

/**
 * The panel to land on when a group is selected: its first visible panel.
 * Returns null for a group with nothing in it.
 */
export function firstPanelOfGroup<T extends ProjectTabRule>(
  tabs: readonly T[],
  group: ProjectTabGroupKey,
): T | null {
  return tabs.find((tab) => tab.group === group) ?? null;
}
