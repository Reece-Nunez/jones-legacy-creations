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
  /** Hidden from read-only contractor logins. */
  staffOnly?: boolean;
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

// ---------------------------------------------------------------------------
// The panel registry
// ---------------------------------------------------------------------------

/**
 * A panel, with the copy that describes it.
 *
 * `help` is a plain-English sentence saying what the panel is FOR — not what
 * it's called. It feeds the in-app help assistant (lib/help/app-map.ts), which
 * exists because this app's information architecture moves: the fourteen peer
 * tabs became five groups on 2026-08-21, and Job Costs moved out of the
 * overview a day later. Help text kept in a separate document would have been
 * wrong twice in one week. Kept here, beside the visibility rules the nav
 * itself reads, it cannot describe a panel that no longer exists.
 *
 * If you add a panel, you add its `help` in the same edit — a test enforces it.
 */
export interface ProjectPanel extends ProjectTabRule {
  label: string;
  help: string;
}

/**
 * Every panel on the project detail page, in nav order.
 *
 * Lives here rather than in ProjectDetail.tsx so it can be read without
 * pulling in React: the help assistant needs it on the server, and the tab
 * tests could not reach it while it sat in a client component with lucide
 * icons attached. ProjectDetail supplies the icons (see PANEL_ICONS there).
 */
export const PROJECT_PANELS = [
  { key: "overview", group: "overview", label: "Summary", cashJob: true, onlyCashJob: false,
    help: "The project at a glance: status, client, progress, and the money summary cards." },
  { key: "activity", group: "overview", label: "Activity", cashJob: true, onlyCashJob: false,
    help: "A dated log of what changed on this project and who changed it." },

  { key: "budget", group: "money", label: "Budget", cashJob: true, onlyCashJob: false,
    help: "The planned line items for the job, each with a budgeted amount and what has actually been spent against it." },
  // Payments is NOT cash-job-only. Financed jobs pay subs directly and then
  // roll those payments into a draw: 24 of Peach Springs' 31 payments are
  // draw-linked and 7 are standalone. Hiding the tab there left 86% of all
  // contractor payments without a dedicated list.
  { key: "payments", group: "money", label: "Payments", cashJob: true, onlyCashJob: false,
    help: "Money owed to and paid to subcontractors. Record an invoice here, attach the PDF, and mark it paid out of pocket or paid from a draw. Also where you generate an upload link so a sub can send their own invoice in." },
  // Job costs sit beside Payments because both are money out; Payments is
  // what a sub invoiced, Job Costs is what the job burned with no invoice.
  { key: "jobcosts", group: "money", label: "Job Costs", cashJob: true, onlyCashJob: false,
    help: "Spend with no subcontractor and no budget line: fuel, equipment rental, dump fees. Anything logged here counts toward the project's Costs." },
  { key: "draws", group: "money", label: "Draws", cashJob: false, onlyCashJob: false,
    help: "Construction-loan draw requests to the lender, and which payments each draw reimburses. Financed jobs only." },
  { key: "loan", group: "money", label: "Loan", cashJob: false, onlyCashJob: false,
    help: "The construction loan itself: amount, rate, accrued interest, and the lender ledger. Financed jobs only." },
  { key: "cashflow", group: "money", label: "Cash Flow", cashJob: true, onlyCashJob: false,
    help: "Money in against money out over time for this project." },

  { key: "tasks", group: "work", label: "Tasks", cashJob: true, onlyCashJob: false,
    help: "The job's to-do list, in build order." },
  { key: "permits", group: "work", label: "Permits", cashJob: true, onlyCashJob: false,
    help: "Building permits and their status. Uploading a permit PDF pulls the property details out of it automatically." },
  { key: "bidrequests", group: "work", label: "Bid Requests", cashJob: true, onlyCashJob: false, staffOnly: true,
    help: "Send a scope out to several subcontractors at once and track who accepted or declined." },

  { key: "selections", group: "client", label: "Selections", cashJob: true, onlyCashJob: false, staffOnly: true,
    help: "Finish choices sent to the client to approve by e-signature; the signed approval files itself into Documents." },
  { key: "changeorders", group: "client", label: "Change Orders", cashJob: true, onlyCashJob: false, staffOnly: true,
    help: "Scope or price changes sent to the client to sign; the signed order files itself into Documents." },

  { key: "documents", group: "files", label: "Documents", cashJob: true, onlyCashJob: false,
    help: "Every file attached to the project — contracts, invoices, signed approvals, closing statements." },
  { key: "photos", group: "files", label: "Photos", cashJob: true, onlyCashJob: false,
    help: "Site photos for the job." },
] as const satisfies readonly ProjectPanel[];

export type ProjectPanelKey = (typeof PROJECT_PANELS)[number]["key"];
