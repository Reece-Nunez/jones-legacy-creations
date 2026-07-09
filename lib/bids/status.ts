// Pure bid-request status rules, extracted so the transition guards used by the
// admin + public routes can be unit-tested without a DB. The flow is two-sided —
// the contractor submits, then Blake decides:
//
//   draft → sent → viewed → submitted → accepted → completed
//                           (contractor)  (Blake)    (Blake)
//   contractor may `passed` (declined the request) from sent/viewed
//   Blake may `rejected` a submitted bid, or `void` any non-terminal request
//
// Payment runs through the draw/lender flow, so there is no `paid` state; a
// completed bid just triggers an invoice-request reminder to the contractor.

export type BidStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "submitted"
  | "passed"
  | "accepted"
  | "rejected"
  | "completed"
  | "void";

// States from which the contractor may still submit or pass via the public link.
const RESPONDABLE: ReadonlySet<BidStatus> = new Set(["sent", "viewed"]);

// Terminal states — no further transitions.
const TERMINAL: ReadonlySet<BidStatus> = new Set([
  "passed",
  "rejected",
  "completed",
  "void",
]);

/** Can the contractor submit a bid / pass from this status? */
export function canRespond(status: BidStatus): boolean {
  return RESPONDABLE.has(status);
}

/** Can Blake accept/reject? Only once the contractor has submitted. */
export function canDecide(status: BidStatus): boolean {
  return status === "submitted";
}

/** Blake may mark completed only after he has accepted the bid. */
export function canComplete(status: BidStatus): boolean {
  return status === "accepted";
}

/** Blake may void anything that hasn't reached a terminal state. */
export function canVoid(status: BidStatus): boolean {
  return !TERMINAL.has(status);
}

export type StaffAction = "accept" | "reject" | "complete" | "void";

/**
 * Resolve a requested staff lifecycle transition to the next status, or null if
 * it isn't allowed from the current status. Keeps the route logic declarative.
 */
export function nextStatusFor(action: StaffAction, current: BidStatus): BidStatus | null {
  switch (action) {
    case "accept":
      return canDecide(current) ? "accepted" : null;
    case "reject":
      return canDecide(current) ? "rejected" : null;
    case "complete":
      return canComplete(current) ? "completed" : null;
    case "void":
      return canVoid(current) ? "void" : null;
    default:
      return null;
  }
}
