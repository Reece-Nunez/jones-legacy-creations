/**
 * What a document is, and therefore what may be read off it.
 *
 * The first round of scanning taught this the hard way. A vendor invoice
 * carries at least three addresses — the vendor's letterhead, the bill-to
 * block (Jones Custom Homes' own office), and sometimes a job site — and two
 * or more company names. The model reported the bill-to address as the project
 * address and "Jones Custom Homes" as the client, and a roofing
 * subcontractor's $28,166.99 quote total as the project's contract value.
 * Every one of those would have overwritten correct data with the wrong
 * party's details.
 *
 * A prompt can be asked not to do that. It cannot be relied on not to. So
 * eligibility is enforced here, in code, on the way in: a field the document's
 * kind has no business knowing is dropped no matter how confidently the model
 * asserts it.
 */

export const DOCUMENT_KINDS = [
  "invoice",
  "receipt",
  "budget",
  "contract",
  "loan",
  "permit",
  "plan",
  "other",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export function isDocumentKind(value: unknown): value is DocumentKind {
  return typeof value === "string" && (DOCUMENT_KINDS as readonly string[]).includes(value);
}

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  budget: "Budget",
  contract: "Contract",
  loan: "Loan document",
  permit: "Permit",
  plan: "Plans / drawings",
  other: "Other",
};

/**
 * Which flag fields each kind of document is allowed to dispute.
 *
 * Read this as "who would know?". A construction agreement between Blake and
 * the homeowner is authoritative about the client's name, the site address and
 * the contract value. A vendor invoice is authoritative about its own line —
 * the amount, the vendor, the due date — and about nothing else, because the
 * names and addresses on it belong to the vendor and to Jones Custom Homes,
 * not to the project.
 */
const ELIGIBLE_FIELDS: Record<DocumentKind, string[]> = {
  // A vendor's bill. Authoritative about the payment it created, and silent on
  // the project: every name and address on an invoice belongs to the vendor or
  // to the company being billed.
  invoice: [
    "contractor_payments.amount",
    "contractor_payments.contractor_name",
    "contractor_payments.description",
    "contractor_payments.due_date",
    "contractor_payments.invoice_file_name",
  ],
  receipt: [
    "contractor_payments.amount",
    "contractor_payments.contractor_name",
    "contractor_payments.description",
  ],

  // A budget is consumed by the budget importer, not by the flag review. It
  // disputes no single field.
  budget: [],

  // The agreement with the homeowner: the one document that actually knows who
  // the client is, where the house goes, what it costs and when it starts.
  contract: [
    "projects.name",
    "projects.client_name",
    "projects.client_email",
    "projects.client_phone",
    "projects.address",
    "projects.city",
    "projects.state",
    "projects.zip",
    "projects.contract_value",
    "projects.sale_price",
    "projects.square_footage",
    "projects.start_date",
    "projects.end_date",
  ],

  // Deed of trust, note, closing statement — the lender's terms.
  loan: [
    "projects.loan_amount",
    "projects.down_payment",
    "projects.interest_rate",
    "projects.lender_name",
    "projects.address",
    "projects.city",
    "projects.state",
    "projects.zip",
  ],

  // A permit names the site it was issued for. It does NOT establish schedule:
  // a septic notice's issue date was read as the project start date, which is
  // why start_date is absent here.
  permit: ["projects.address", "projects.city", "projects.state", "projects.zip"],

  // Stamped drawings carry the site address and the house's dimensions. The
  // title block names the residence, not necessarily the client.
  plan: [
    "projects.address",
    "projects.city",
    "projects.state",
    "projects.zip",
    "projects.square_footage",
  ],

  // Unclassified. Nothing is trusted from a document we could not identify.
  other: [],
};

const ELIGIBLE_SETS: Record<DocumentKind, Set<string>> = Object.fromEntries(
  (Object.keys(ELIGIBLE_FIELDS) as DocumentKind[]).map((k) => [k, new Set(ELIGIBLE_FIELDS[k])]),
) as Record<DocumentKind, Set<string>>;

/** May a document of this kind raise a flag against this field? */
export function fieldEligibleForKind(kind: DocumentKind, fieldKey: string): boolean {
  return ELIGIBLE_SETS[kind]?.has(fieldKey) ?? false;
}

/** The field keys a scan of this kind should even ask the model about. */
export function eligibleFieldKeys(kind: DocumentKind): string[] {
  return ELIGIBLE_FIELDS[kind] ?? [];
}
