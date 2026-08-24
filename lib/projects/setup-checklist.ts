/**
 * What still needs doing before a project is properly set up.
 *
 * The in-app help assistant answers "how do I record a payment" — but only if
 * you know to ask. Someone in their first week doesn't know Job Costs exists,
 * so they never ask about it. This is the other half: it reads the project's
 * actual state and names what is missing, in the order it usually gets done.
 *
 * Pure, and separate from the component, for two reasons. It is the kind of
 * rule that quietly disagrees with the copy of itself somewhere else — the
 * dashboard already flags "needs property details" and now shares
 * `needsPropertyDetails` with this rather than keeping a second opinion — and
 * the dashboard's whole action-item engine lives inline in a 900-line server
 * component where none of it can be tested.
 *
 * Steps disappear as they are satisfied, and the whole list disappears when
 * every step is done. It is onboarding, not a permanent scoreboard.
 */

export const PROJECT_ACTIVE_STATUSES = [
  "lead",
  "estimate_sent",
  "approved",
  "waiting_on_permit",
  "in_progress",
  "waiting_on_payment",
] as const;

/** The project fields this module reads. Kept narrow so tests can build one. */
export interface SetupProject {
  id: string;
  status: string;
  is_cash_job?: boolean | null;
  square_footage?: number | null;
  loan_amount?: number | string | null;
  sale_price?: number | string | null;
  markup_percent?: number | string | null;
}

/**
 * Square footage stands in for "property details are filled in".
 *
 * Same test the dashboard uses to raise "needs property details", now shared
 * so the two cannot drift into disagreeing about the same project. It is a
 * proxy — one field standing for eleven — but it is the field the estimator
 * needs and the one a permit upload fills in first.
 */
export function needsPropertyDetails(project: SetupProject): boolean {
  return (
    PROJECT_ACTIVE_STATUSES.includes(
      project.status as (typeof PROJECT_ACTIVE_STATUSES)[number],
    ) && project.square_footage == null
  );
}

export interface SetupStep {
  key: string;
  /** Imperative, and specific enough to act on without more context. */
  label: string;
  /** One line on why it matters — this is the part that teaches the app. */
  why: string;
  done: boolean;
  /** Panel key for a `?tab=` link, or null when `href` is absolute. */
  tab: string | null;
  /** Absolute path, used where the work happens off the project page. */
  href: string | null;
}

export interface SetupCounts {
  budgetLineItems: number;
  payments: number;
  jobCosts: number;
  documents: number;
  permits: number;
}

function num(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

/**
 * The steps for this project, in the order they are normally done.
 *
 * Job type changes the list: a financed job needs lender figures before the
 * profit maths means anything, and a cash job needs a markup percentage before
 * it can show a client price. Offering both to every project would put a step
 * on the list that the job can never satisfy.
 */
export function setupChecklist(
  project: SetupProject,
  counts: SetupCounts,
): SetupStep[] {
  const isCashJob = !!project.is_cash_job;

  const steps: SetupStep[] = [
    {
      key: "details",
      label: "Add the property details",
      why: "Square footage and finish level drive every estimate on this job.",
      done: !needsPropertyDetails(project),
      tab: null,
      href: `/admin/projects/${project.id}/edit`,
    },
    {
      key: "budget",
      label: "Set up the budget",
      why: "Line items to spend against, so costs land somewhere as they come in.",
      done: counts.budgetLineItems > 0,
      tab: "budget",
      href: null,
    },
  ];

  if (isCashJob) {
    steps.push({
      key: "markup",
      label: "Set the markup percentage",
      why: "Budget plus markup is the client price — without it the price reads as cost.",
      done: num(project.markup_percent) > 0,
      tab: null,
      href: `/admin/projects/${project.id}/edit`,
    });
  } else {
    steps.push({
      key: "loan",
      label: "Add the loan and sale figures",
      why: "Loan amount and sale price turn the summary into real projected profit.",
      done: num(project.loan_amount) > 0 && num(project.sale_price) > 0,
      tab: null,
      href: `/admin/projects/${project.id}/edit`,
    });
  }

  steps.push(
    {
      key: "permit",
      label: "Add the building permit",
      why: "Uploading the permit PDF fills in the property details on its own.",
      done: counts.permits > 0,
      tab: "permits",
      href: null,
    },
    {
      key: "documents",
      label: "Upload the contract",
      why: "Keeps the signed paperwork with the job instead of in an inbox.",
      done: counts.documents > 0,
      tab: "documents",
      href: null,
    },
    {
      key: "spend",
      label: "Record the first cost",
      why: "A subcontractor invoice goes under Payments; fuel and rentals under Job Costs.",
      done: counts.payments > 0 || counts.jobCosts > 0,
      tab: "payments",
      href: null,
    },
  );

  return steps;
}

export interface SetupProgress {
  done: number;
  total: number;
  complete: boolean;
  remaining: SetupStep[];
}

export function setupProgress(steps: SetupStep[]): SetupProgress {
  const done = steps.filter((s) => s.done).length;
  return {
    done,
    total: steps.length,
    complete: done === steps.length,
    remaining: steps.filter((s) => !s.done),
  };
}

/** Where a step's link points, given the project it belongs to. */
export function stepHref(step: SetupStep, projectId: string): string {
  return step.href ?? `/admin/projects/${projectId}?tab=${step.tab}`;
}
