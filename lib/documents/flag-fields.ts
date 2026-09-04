/**
 * The only fields a document flag may ever point at.
 *
 * Accepting a flag writes a value the AI read off a PDF into the database, so
 * the set of writable columns is fixed here rather than being whatever the
 * model returned. A field name that isn't in this table is dropped on the way
 * in (when flags are created) and refused on the way out (when one is
 * accepted) — the model never gets to name a column.
 *
 * Both tables are project-scoped on purpose. `contractors` is shared across
 * projects, so a vendor-name disagreement is recorded against the payment's own
 * `contractor_name` instead: fixing the attribution on this project can't
 * rewrite a contractor record another project depends on.
 */

export type FlagCategory = "money" | "identity" | "address" | "reference";
export type FlagValueType = "text" | "number" | "date";
export type FlagTargetTable = "projects" | "contractor_payments";

export type FlagField = {
  /** Stable key the model is asked to use, `table.column`. */
  key: string;
  table: FlagTargetTable;
  column: string;
  /** Shown in the review panel. */
  label: string;
  type: FlagValueType;
  category: FlagCategory;
};

const PROJECT_FIELDS: FlagField[] = [
  { key: "projects.name", table: "projects", column: "name", label: "Project name", type: "text", category: "identity" },
  { key: "projects.client_name", table: "projects", column: "client_name", label: "Client name", type: "text", category: "identity" },
  { key: "projects.client_email", table: "projects", column: "client_email", label: "Client email", type: "text", category: "identity" },
  { key: "projects.client_phone", table: "projects", column: "client_phone", label: "Client phone", type: "text", category: "identity" },

  { key: "projects.address", table: "projects", column: "address", label: "Street address", type: "text", category: "address" },
  { key: "projects.city", table: "projects", column: "city", label: "City", type: "text", category: "address" },
  { key: "projects.state", table: "projects", column: "state", label: "State", type: "text", category: "address" },
  { key: "projects.zip", table: "projects", column: "zip", label: "ZIP", type: "text", category: "address" },

  { key: "projects.contract_value", table: "projects", column: "contract_value", label: "Contract value", type: "number", category: "money" },
  { key: "projects.sale_price", table: "projects", column: "sale_price", label: "Sale price", type: "number", category: "money" },
  { key: "projects.loan_amount", table: "projects", column: "loan_amount", label: "Loan amount", type: "number", category: "money" },
  { key: "projects.down_payment", table: "projects", column: "down_payment", label: "Down payment", type: "number", category: "money" },
  { key: "projects.interest_rate", table: "projects", column: "interest_rate", label: "Interest rate", type: "number", category: "money" },
  { key: "projects.lender_name", table: "projects", column: "lender_name", label: "Lender", type: "text", category: "identity" },
  { key: "projects.square_footage", table: "projects", column: "square_footage", label: "Square footage", type: "number", category: "reference" },

  { key: "projects.start_date", table: "projects", column: "start_date", label: "Start date", type: "date", category: "reference" },
  { key: "projects.end_date", table: "projects", column: "end_date", label: "End date", type: "date", category: "reference" },
];

const PAYMENT_FIELDS: FlagField[] = [
  { key: "contractor_payments.amount", table: "contractor_payments", column: "amount", label: "Payment amount", type: "number", category: "money" },
  { key: "contractor_payments.contractor_name", table: "contractor_payments", column: "contractor_name", label: "Vendor / contractor", type: "text", category: "identity" },
  { key: "contractor_payments.description", table: "contractor_payments", column: "description", label: "Payment description", type: "text", category: "reference" },
  { key: "contractor_payments.due_date", table: "contractor_payments", column: "due_date", label: "Due date", type: "date", category: "reference" },
  { key: "contractor_payments.invoice_file_name", table: "contractor_payments", column: "invoice_file_name", label: "Invoice number / file", type: "text", category: "reference" },
];

export const FLAG_FIELDS: FlagField[] = [...PROJECT_FIELDS, ...PAYMENT_FIELDS];

const BY_KEY = new Map(FLAG_FIELDS.map((f) => [f.key, f]));

export function flagFieldByKey(key: string): FlagField | undefined {
  return BY_KEY.get(key);
}

/** Look a field up the way a stored flag addresses it. */
export function flagFieldFor(table: string, column: string): FlagField | undefined {
  return BY_KEY.get(`${table}.${column}`);
}

export const FLAG_CATEGORY_LABELS: Record<FlagCategory, string> = {
  money: "Money",
  identity: "Names",
  address: "Address",
  reference: "Dates & references",
};
