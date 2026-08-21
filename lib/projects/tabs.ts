/**
 * Which tabs a project detail page shows.
 *
 * Extracted from ProjectDetail so the rule is testable. It was an inline
 * ternary over two similarly-named booleans, and it got the Payments tab
 * wrong: `onlyCashJob` hid it on every financed job, which is where most
 * contractor payments actually live.
 */

export interface ProjectTabRule {
  key: string;
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
