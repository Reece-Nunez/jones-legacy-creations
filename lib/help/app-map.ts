/**
 * What the in-app help assistant knows about this app.
 *
 * Assembled from the same declarations the UI renders from, not from a
 * separate document. That is the whole point: this app's navigation moves.
 * Fourteen peer project tabs became five groups on 2026-08-21, and Job Costs
 * moved off the overview into Money a day later. A help page maintained by
 * hand would have been wrong twice inside a week, and a help answer that sends
 * someone to a tab that no longer exists is worse than no help at all.
 *
 * PROJECT_PANELS (lib/projects/tabs.ts) is the source of truth for the project
 * page, so panel copy cannot drift from the panels. The top-level areas below
 * are declared here rather than read from AdminShell.tsx, which holds its nav
 * beside React icon components; that list is stable in a way the project tabs
 * are not, but it is a hand-maintained copy and should be checked when the
 * sidebar changes.
 *
 * The output must be BYTE-STABLE for a given input. It is sent as the cached
 * prefix of every help request, and prompt caching is a prefix match — a
 * timestamp, a Math.random(), or a Set iteration order would silently drop the
 * hit rate to zero and quietly multiply the cost of every question.
 */

import {
  PROJECT_PANELS,
  PROJECT_TAB_GROUP_LABELS,
  PROJECT_TAB_GROUP_ORDER,
} from "@/lib/projects/tabs";

export interface AppArea {
  label: string;
  href: string;
  help: string;
}

/**
 * Top-level sidebar destinations. Mirrors AdminShell's NAV_SECTIONS.
 * Marketing-site areas (Leads, Posts, Listings…) are deliberately omitted —
 * they are gated on website:view and are not what anyone is onboarding onto.
 */
export const APP_AREAS: readonly AppArea[] = [
  { label: "Dashboard", href: "/admin",
    help: "Landing page. Active projects, what needs attention, and company-wide totals." },
  { label: "Projects", href: "/admin/projects",
    help: "Every job. Open one to reach its budget, payments, job costs, draws, documents and tasks." },
  { label: "Contractors & Vendors", href: "/admin/contractors",
    help: "The subcontractor and vendor list, including W-9s and liability insurance on file." },
  { label: "Financials", href: "/admin/financials",
    help: "Money across all projects at once, rather than one job at a time." },
  { label: "Estimates", href: "/admin/estimates",
    help: "Early ballpark pricing, before a job becomes a quote." },
  { label: "Quotes", href: "/admin/quotes",
    help: "Priced proposals for clients, which become projects once accepted." },
  { label: "Liability Insurance", href: "/admin/insurance",
    help: "Insurance certificates on file and which have expired." },
  { label: "Pending Draws", href: "/admin/pending-draws",
    help: "Draw requests awaiting lender funding, across every financed project." },
  { label: "Pending Permits", href: "/admin/pending-permits",
    help: "Permits still open, across every project." },
] as const;

export interface TaskRecipe {
  /** How someone would ask for it, in their words. */
  task: string;
  /** Ordered steps. Keep each one to a single action. */
  steps: readonly string[];
  /**
   * Where the task happens. `{projectId}` is substituted with the project the
   * user is currently looking at; if there isn't one, the assistant sends them
   * to /admin/projects first.
   */
  href?: string;
}

/**
 * Recipes for the things people actually get stuck on.
 *
 * The first two are here because they were real support questions on
 * 2026-08-23: a subcontractor invoice and a tank of fuel had no obvious home.
 */
export const TASK_RECIPES: readonly TaskRecipe[] = [
  {
    task: "Record a payment to a subcontractor, or log an invoice a sub sent in",
    href: "/admin/projects/{projectId}?tab=payments",
    steps: [
      "Open the project.",
      "Click Money, then Payments.",
      "Click Add Payment.",
      "Pick the contractor, or choose 'Other (type name)' for a one-off vendor.",
      "Enter the amount, and attach the invoice PDF if you have it.",
      "Save. The payment starts as pending; mark it paid out of pocket or paid from a draw once the money moves.",
    ],
  },
  {
    task: "Log a job cost like fuel, an equipment rental, or dump fees",
    href: "/admin/projects/{projectId}?tab=jobcosts",
    steps: [
      "Open the project.",
      "Click Money, then Job Costs.",
      "Click Add Cost.",
      "Enter a description and the amount. Date and category are optional.",
      "Save. It counts toward the project's Costs straight away.",
    ],
  },
  {
    task: "Let a subcontractor send in their own invoice without giving them a login",
    href: "/admin/projects/{projectId}?tab=payments",
    steps: [
      "Open the project, then Money, then Payments.",
      "Expand Contractor Upload Links.",
      "Pick the contractor and generate a link.",
      "Copy or text them the link. What they upload lands on this project.",
    ],
  },
  {
    task: "Set up the budget for a new job",
    href: "/admin/projects/{projectId}?tab=budget",
    steps: [
      "Open the project, then Money, then Budget.",
      "Click Set Up Budget to add the standard line items, then adjust the amounts.",
      "Spending gets matched back to these lines as payments come in.",
    ],
  },
  {
    task: "Request a draw from the lender",
    href: "/admin/projects/{projectId}?tab=draws",
    steps: [
      "Open the project, then Money, then Draws.",
      "Click New Draw.",
      "Attach the payments this draw is meant to reimburse.",
      "Mark it funded once the lender pays it.",
    ],
  },
  {
    task: "Start a new project",
    href: "/admin/projects",
    steps: [
      "Click New Project in the sidebar, or open Projects and click New Project.",
      "Fill in the client, the contract value, and whether it is a cash job.",
      "Cash job means the client is paying for the build directly. Leave it off if you are financing it with a construction loan — that turns on the Draws and Loan panels.",
    ],
  },
  {
    task: "Get a client to approve a finish selection or sign a change order",
    href: "/admin/projects/{projectId}?tab=changeorders",
    steps: [
      "Open the project, then Client, then Selections or Change Orders.",
      "Create the item and send it to the client by email.",
      "They approve or sign through a link — no login needed.",
      "The signed PDF files itself into the project's Documents.",
    ],
  },
  {
    task: "Send a scope to several subcontractors and collect bids",
    href: "/admin/projects/{projectId}?tab=bidrequests",
    steps: [
      "Open the project, then Work, then Bid Requests.",
      "Create the request and pick which subs to send it to.",
      "They accept or decline through a link; accepting generates an acceptance PDF.",
    ],
  },
  {
    task: "Give a subcontractor a login to see their own project",
    href: "/admin/settings/team",
    steps: [
      "Go to Settings, then Users & Access.",
      "Invite them and grant access to specific projects.",
      "They get a read-only view of only those projects, and can upload documents and update task status.",
    ],
  },
];

/** The project page's navigation, group by group, in the order it renders. */
function renderPanels(): string {
  const lines: string[] = [];
  for (const groupKey of PROJECT_TAB_GROUP_ORDER) {
    const panels = PROJECT_PANELS.filter((p) => p.group === groupKey);
    if (panels.length === 0) continue;
    lines.push(`### ${PROJECT_TAB_GROUP_LABELS[groupKey]}`);
    for (const panel of panels) {
      const only = panel.cashJob ? "" : " (financed jobs only — hidden on cash jobs)";
      lines.push(`- **${panel.label}** (?tab=${panel.key})${only} — ${panel.help}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function renderAreas(): string {
  return APP_AREAS.map((a) => `- **${a.label}** (${a.href}) — ${a.help}`).join("\n");
}

function renderRecipes(): string {
  return TASK_RECIPES.map((r) => {
    const head = r.href ? `**${r.task}** → \`${r.href}\`` : `**${r.task}**`;
    const steps = r.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n");
    return `- ${head}\n${steps}`;
  }).join("\n");
}

/**
 * The full app map, as markdown.
 *
 * Deterministic by construction — every input is a module-level constant
 * iterated in declaration order. Do not introduce a date, a random id, or an
 * unordered collection here; see the file header for why that would be
 * expensive rather than merely untidy.
 */
export function buildAppMap(): string {
  return `# Jones Legacy Creations — admin app map

## Where things live in the sidebar
${renderAreas()}

## Inside a project
A project page has five sections. Each one holds panels, reachable with a
\`?tab=\` link.

${renderPanels()}

## Cash jobs vs financed jobs
A **cash job** is one the client is paying for directly; the project shows a
budget, a markup percentage and a client price. A **financed job** is one the
company is funding with a construction loan; it shows the Draws and Loan
panels instead, and profit is calculated against a sale price. The toggle is
on the project's edit screen.

## How to do common things
${renderRecipes()}`;
}
