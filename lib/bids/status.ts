// Pure bid-request status rules, extracted so the transition guards used by the
// admin + public routes can be unit-tested without a DB. One row walks:
//
//   draft ─┐
//          ├→ sent → viewed → accepted → completed → paid
//          │                 └→ declined
//          └→ (void from any non-terminal state)
//
// The public accept/decline route owns sent/viewed → accepted|declined; staff
// own draft → sent (blast) and accepted → completed → paid.

export type BidStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "completed"
  | "paid"
  | "void";

// States from which the contractor may still respond via the public link.
const RESPONDABLE: ReadonlySet<BidStatus> = new Set(["sent", "viewed"]);

// Terminal states — no further transitions (void, declined, paid are dead ends).
const TERMINAL: ReadonlySet<BidStatus> = new Set(["declined", "paid", "void"]);

/** Can the contractor accept/decline from this status? */
export function canRespond(status: BidStatus): boolean {
  return RESPONDABLE.has(status);
}

/** Staff may mark completed only after the contractor has accepted. */
export function canComplete(status: BidStatus): boolean {
  return status === "accepted";
}

/** Staff may mark paid only after the work is completed. */
export function canMarkPaid(status: BidStatus): boolean {
  return status === "completed";
}

/** Staff may void anything that hasn't reached a terminal state. */
export function canVoid(status: BidStatus): boolean {
  return !TERMINAL.has(status);
}

/**
 * Resolve a requested staff lifecycle transition to the next status, or null if
 * it isn't allowed from the current status. Keeps the route logic declarative.
 */
export function nextStatusFor(
  action: "complete" | "paid" | "void",
  current: BidStatus
): BidStatus | null {
  switch (action) {
    case "complete":
      return canComplete(current) ? "completed" : null;
    case "paid":
      return canMarkPaid(current) ? "paid" : null;
    case "void":
      return canVoid(current) ? "void" : null;
    default:
      return null;
  }
}
