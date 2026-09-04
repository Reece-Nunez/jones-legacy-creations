/**
 * Diffing a submitted budget against the rows already stored for a project.
 *
 * The Budget tab saves the whole line-item list at once — a row the user
 * deleted is simply absent from the payload, a row they added arrives with no
 * id, and a renumbered row arrives with its id and a new line_number. Working
 * out what that means (delete these, renumber those, write the rest) is pure
 * bookkeeping, so it lives here where it can be tested without a database.
 */

export type BudgetSyncItem = {
  id?: string | null;
  line_number?: unknown;
  description?: unknown;
  budgeted_amount?: unknown;
  notes?: unknown;
};

export type ExistingBudgetRow = { id: string; line_number: string };

export type BudgetUpsertRow = {
  id?: string;
  line_number: string;
  description: string;
  budgeted_amount: number;
  notes: string | null;
};

/** A line_number that moved, so the spend pointing at it can follow. */
export type BudgetRename = { from: string; to: string };

export type BudgetSyncPlan = {
  deleteIds: string[];
  renames: BudgetRename[];
  upserts: BudgetUpsertRow[];
};

/** Rejected input, reported back to the client as a 400 rather than a 500. */
export class BudgetSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetSyncError";
  }
}

const MAX_LINE_NUMBER_LENGTH = 16;
const MAX_DESCRIPTION_LENGTH = 200;

function requiredText(value: unknown, field: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new BudgetSyncError(`Every line item needs a ${field}.`);
  }
  if (text.length > maxLength) {
    throw new BudgetSyncError(`${field} is too long (max ${maxLength} characters): "${text.slice(0, 40)}…"`);
  }
  return text;
}

function amount(value: unknown, lineNumber: string): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[$,]/g, ""));
  if (!Number.isFinite(n)) {
    throw new BudgetSyncError(`Line ${lineNumber} has an amount that isn't a number.`);
  }
  if (n < 0) {
    throw new BudgetSyncError(`Line ${lineNumber} has a negative budget.`);
  }
  return n;
}

/**
 * @param existing every budget row currently stored for the project — the id
 *   allow-list, so a payload can never reach into another project's rows.
 * @param incoming the full list the user just saved. Anything missing from it
 *   is a deletion; that is the whole point of the endpoint, so a caller must
 *   not send a partial list.
 */
export function planBudgetSync(
  existing: ExistingBudgetRow[],
  incoming: BudgetSyncItem[],
): BudgetSyncPlan {
  if (!Array.isArray(incoming)) {
    throw new BudgetSyncError("Expected a list of budget line items.");
  }

  const existingById = new Map(existing.map((row) => [row.id, row]));
  const seenLineNumbers = new Map<string, string>();
  const keptIds = new Set<string>();
  const renames: BudgetRename[] = [];
  const upserts: BudgetUpsertRow[] = [];

  for (const item of incoming) {
    const lineNumber = requiredText(item.line_number, "line number", MAX_LINE_NUMBER_LENGTH);
    const description = requiredText(item.description, "description", MAX_DESCRIPTION_LENGTH);

    // Case-insensitive, because "5a" and "5A" are the same line to everyone
    // except the database's unique index.
    const key = lineNumber.toLowerCase();
    const clash = seenLineNumbers.get(key);
    if (clash !== undefined) {
      throw new BudgetSyncError(`Line number "${lineNumber}" is used twice (also on "${clash}").`);
    }
    seenLineNumbers.set(key, description);

    const row: BudgetUpsertRow = {
      line_number: lineNumber,
      description,
      budgeted_amount: amount(item.budgeted_amount, lineNumber),
      notes: typeof item.notes === "string" && item.notes.trim() ? item.notes.trim() : null,
    };

    const id = typeof item.id === "string" && item.id ? item.id : null;
    if (id) {
      const before = existingById.get(id);
      if (!before) {
        throw new BudgetSyncError("A line item referred to a row that isn't on this project.");
      }
      keptIds.add(id);
      row.id = id;
      if (before.line_number !== lineNumber) {
        renames.push({ from: before.line_number, to: lineNumber });
      }
    }

    upserts.push(row);
  }

  const deleteIds = existing.filter((row) => !keptIds.has(row.id)).map((row) => row.id);

  return { deleteIds, renames, upserts };
}
