/**
 * Match a freshly-extracted lender event against existing data so the
 * UI can show duplicates, conflicts, and auto-suggest draw links
 * before any rows hit the database.
 *
 * Used by the LoanLedgerTab "review extracted entries" step. Pure
 * client-side: takes the already-fetched ledger + draws for the
 * project, returns annotations on each incoming entry.
 */

import type {
  DrawRequest,
  LoanLedgerEntry,
  LoanLedgerEntryType,
} from "@/lib/types/database";

export interface IncomingEntry {
  entry_date: string;
  entry_type: LoanLedgerEntryType;
  amount: number | string;
  description?: string | null;
}

export type ReconcileStatus = "new" | "duplicate" | "conflict";

export interface ReconcileAnnotation {
  status: ReconcileStatus;
  /** Existing ledger entry that this incoming row matches (duplicate
   *  or conflict). Null for new rows. */
  matchedEntry: LoanLedgerEntry | null;
  /** Human-readable reason for conflict; null otherwise. */
  conflictReason: string | null;
  /** Existing draw_request this incoming disbursement appears to
   *  correspond to. Null for non-disbursements or no match. */
  suggestedDrawId: string | null;
  suggestedDrawNumber: number | null;
}

const DATE_TOLERANCE_DAYS = 2;
const AMOUNT_TOLERANCE = 1.0; // dollars
const DRAW_DATE_TOLERANCE_DAYS = 5;
const DRAW_AMOUNT_TOLERANCE = 1.0;

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

/**
 * Annotate every incoming entry with reconcile info against the
 * provided existing-ledger + existing-draws arrays.
 *
 * Matching heuristic for ledger duplicates:
 *   - same entry_type
 *   - amount within $1
 *   - date within 2 days
 * If amount differs OR date differs by more than tolerance, the row
 * is flagged as a "conflict" so the user can decide whether the new
 * value should replace the old.
 *
 * Auto-link for disbursements:
 *   - same project
 *   - draw status = 'funded'
 *   - amount within $1
 *   - date within 5 days
 * (Funded date often drifts a few days from when the draw was
 * submitted vs. when the lender actually wired funds.)
 */
export function reconcileIncoming(
  incoming: IncomingEntry[],
  existingLedger: LoanLedgerEntry[],
  existingDraws: DrawRequest[],
): ReconcileAnnotation[] {
  return incoming.map((row) => {
    const incomingAmount = Number(row.amount);

    // Look for duplicate/conflict in existing ledger
    let matchedEntry: LoanLedgerEntry | null = null;
    let conflictReason: string | null = null;
    let status: ReconcileStatus = "new";

    for (const e of existingLedger) {
      if (e.entry_type !== row.entry_type) continue;
      const existingAmount = Number(e.amount);
      const dateDelta = daysBetween(row.entry_date, e.entry_date);

      // Exact match on amount + close date → duplicate
      if (
        Math.abs(incomingAmount - existingAmount) <= AMOUNT_TOLERANCE &&
        dateDelta <= DATE_TOLERANCE_DAYS
      ) {
        matchedEntry = e;
        status = "duplicate";
        break;
      }

      // Same date / same description-ish but different amount → conflict
      if (
        dateDelta <= DATE_TOLERANCE_DAYS &&
        Math.abs(incomingAmount - existingAmount) > AMOUNT_TOLERANCE
      ) {
        matchedEntry = e;
        status = "conflict";
        conflictReason = `Existing entry on ${e.entry_date} shows $${existingAmount.toFixed(2)}, new shows $${incomingAmount.toFixed(2)}`;
        // Don't break — a true duplicate later in the loop would
        // override this conflict (we prefer marking as duplicate).
      }
    }

    // Suggest draw link for disbursements
    let suggestedDrawId: string | null = null;
    let suggestedDrawNumber: number | null = null;
    if (row.entry_type === "disbursement") {
      for (const d of existingDraws) {
        if (d.status !== "funded" || !d.funded_date) continue;
        const drawAmount = Number(d.amount);
        const dateDelta = daysBetween(row.entry_date, d.funded_date);
        if (
          Math.abs(incomingAmount - drawAmount) <= DRAW_AMOUNT_TOLERANCE &&
          dateDelta <= DRAW_DATE_TOLERANCE_DAYS
        ) {
          suggestedDrawId = d.id;
          suggestedDrawNumber = d.draw_number;
          break;
        }
      }
    }

    return {
      status,
      matchedEntry,
      conflictReason,
      suggestedDrawId,
      suggestedDrawNumber,
    };
  });
}
