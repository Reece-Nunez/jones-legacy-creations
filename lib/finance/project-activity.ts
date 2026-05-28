/**
 * Project activity aggregation — collapses every money event from
 * contractor_payments, loan_ledger, project_settlements, and
 * project_misc_charges into one chronological list.
 *
 * Used by the "Cash Flow" tab on the project page so Blake can see
 * every dollar that touched a project in date order. Each event carries
 * enough source-tracking to link back to the original row (and to
 * support CSV export with no information loss).
 *
 * Sign convention:
 *   amount is always positive; `direction` says cash-in / cash-out from
 *   Blake's perspective. Build costs out, loan disbursements out (they
 *   pay contractors), sale proceeds in. Loan ledger interest payments
 *   are "out" when Blake paid them personally; "neutral" when escrow
 *   paid from closing funds.
 */

import type {
  ContractorPayment,
  LoanLedgerEntry,
  ProjectMiscCharge,
  ProjectSettlement,
  SettlementOtherFee,
} from "@/lib/types/database";

export type ActivitySource =
  | "contractor"
  | "loan_disbursement"
  | "loan_interest_accrual"
  | "loan_interest_payment"
  | "loan_principal_payment"
  | "loan_fee"
  | "loan_payoff"
  | "settlement_revenue"
  | "settlement_cost"
  | "misc_charge";

export type ActivityDirection = "in" | "out" | "neutral";

export interface ActivityEvent {
  id: string;
  date: string;
  source: ActivitySource;
  /** Human-readable source label for display. */
  sourceLabel: string;
  description: string;
  amount: number;
  direction: ActivityDirection;
  /** Sub-detail for the UI (payment method, contractor, etc.). */
  detail: string | null;
  /** Original row id so the UI can navigate to / edit / delete the source. */
  sourceTable: "contractor_payments" | "loan_ledger" | "project_settlements" | "project_misc_charges";
  sourceRowId: string;
  /** Which project this event belongs to — needed for the portfolio
   *  cross-project view to keep events linked to their owner project. */
  projectId: string;
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid_personal: "Paid by Blake",
  reimbursed: "Reimbursed",
  paid_from_draw: "Paid from draw",
};

const LOAN_ENTRY_META: Record<
  LoanLedgerEntry["entry_type"],
  { source: ActivitySource; label: string; direction: ActivityDirection }
> = {
  disbursement: {
    source: "loan_disbursement",
    label: "Loan disbursement",
    // Disbursements flow from lender to contractors / escrow — they aren't
    // cash-in to Blake's pocket. Neutral from his bank account's view.
    direction: "neutral",
  },
  interest_accrual: {
    source: "loan_interest_accrual",
    label: "Interest accrued",
    direction: "neutral",
  },
  interest_payment: {
    source: "loan_interest_payment",
    label: "Interest paid",
    direction: "out",
  },
  principal_payment: {
    source: "loan_principal_payment",
    label: "Principal paid",
    direction: "out",
  },
  fee: { source: "loan_fee", label: "Lender fee", direction: "out" },
  payoff: { source: "loan_payoff", label: "Loan payoff", direction: "out" },
};

/**
 * Build the full activity feed for a project, sorted by date asc.
 */
export function buildProjectActivity(opts: {
  projectId: string;
  payments: ContractorPayment[];
  loanLedger: LoanLedgerEntry[];
  settlements: ProjectSettlement[];
  miscCharges: ProjectMiscCharge[];
}): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // 1. Contractor payments
  for (const p of opts.payments) {
    if (p.project_id !== opts.projectId) continue;
    const status = p.status;
    const statusLabel = PAYMENT_STATUS_LABEL[status] ?? status;
    const date =
      p.paid_date ||
      p.reimbursed_date ||
      p.paid_from_draw_date ||
      p.due_date ||
      p.created_at.slice(0, 10);
    events.push({
      id: `contractor:${p.id}`,
      date,
      source: "contractor",
      sourceLabel: "Contractor payment",
      description: p.contractor_name + (p.description ? ` — ${p.description}` : ""),
      amount: Number(p.amount),
      // Paid-personal items are out-of-pocket; others are technically
      // funded by the loan (and the loan principal shows separately via
      // loan_ledger disbursements). To avoid implying double-counting,
      // only paid_personal is "out" here.
      direction: status === "paid_personal" ? "out" : "neutral",
      detail: statusLabel,
      sourceTable: "contractor_payments",
      sourceRowId: p.id,
      projectId: p.project_id,
    });
  }

  // 2. Loan ledger
  for (const l of opts.loanLedger) {
    if (l.project_id !== opts.projectId) continue;
    const meta = LOAN_ENTRY_META[l.entry_type];
    const description = l.description || meta.label;
    events.push({
      id: `loan:${l.id}`,
      date: l.entry_date,
      source: meta.source,
      sourceLabel: meta.label,
      description,
      amount: Number(l.amount),
      direction: meta.direction,
      detail:
        l.payment_method ||
        (l.running_balance != null
          ? `Balance: $${Number(l.running_balance).toLocaleString()}`
          : null),
      sourceTable: "loan_ledger",
      sourceRowId: l.id,
      projectId: l.project_id,
    });
  }

  // 3. Settlements — expand each into a parent-row plus one row per
  //    line item, all sharing the settlement_date so they cluster on
  //    sort. The sale_price is "in", everything else "out".
  for (const s of opts.settlements) {
    if (s.project_id !== opts.projectId) continue;
    const isSale = s.settlement_type === "sale";

    // Headline row: net_to_seller (sale) or cash_to_close (purchase).
    if (isSale && s.net_to_seller != null) {
      events.push({
        id: `settlement_net:${s.id}`,
        date: s.settlement_date,
        source: "settlement_revenue",
        sourceLabel: "Sale wire received",
        description: "Net to Seller (sale wire)",
        amount: Number(s.net_to_seller),
        direction: "in",
        detail: `ALTA ${s.document_name ?? "settlement"}`,
        sourceTable: "project_settlements",
        sourceRowId: s.id,
        projectId: s.project_id,
      });
    } else if (!isSale && s.cash_to_close != null) {
      events.push({
        id: `settlement_net:${s.id}`,
        date: s.settlement_date,
        source: "settlement_cost",
        sourceLabel: "Cash to close",
        description: "Cash Blake brought to closing",
        amount: Number(s.cash_to_close),
        direction: "out",
        detail: `ALTA ${s.document_name ?? "settlement"}`,
        sourceTable: "project_settlements",
        sourceRowId: s.id,
        projectId: s.project_id,
      });
    }

    // The constituent line items show as "out" relative to the sale
    // proceeds (they reduce net_to_seller). We surface them so the
    // audit view explains why net_to_seller is less than sale_price.
    const lines: Array<[string, number | null]> = isSale
      ? [
          ["Seller concessions / buyer credits", s.seller_concessions],
          ["Title insurance", s.title_insurance],
          ["Escrow / settlement fee", s.escrow_fee],
          ["Recording fees", s.recording_fees],
          ["Prorated taxes", s.prorated_taxes],
          ["Loan payoff (to lender)", s.loan_payoff],
        ]
      : [
          ["Title insurance", s.title_insurance],
          ["Escrow / settlement fee", s.escrow_fee],
          ["Recording fees", s.recording_fees],
          ["Earnest money applied", s.earnest_money],
        ];

    for (const [label, value] of lines) {
      if (value == null || Number(value) === 0) continue;
      events.push({
        id: `settlement_line:${s.id}:${label}`,
        date: s.settlement_date,
        source: "settlement_cost",
        sourceLabel: "Settlement line",
        description: label,
        amount: Number(value),
        direction: "out",
        detail: isSale ? "Sale ALTA" : "Purchase ALTA",
        sourceTable: "project_settlements",
        sourceRowId: s.id,
        projectId: s.project_id,
      });
    }

    // Other fees JSONB
    const otherFees: SettlementOtherFee[] = Array.isArray(s.other_fees)
      ? s.other_fees
      : [];
    for (const [i, fee] of otherFees.entries()) {
      if (!fee || !Number(fee.amount)) continue;
      events.push({
        id: `settlement_other:${s.id}:${i}`,
        date: s.settlement_date,
        source: "settlement_cost",
        sourceLabel: "Settlement line",
        description: fee.label || "Other fee",
        amount: Number(fee.amount),
        direction: "out",
        detail: isSale ? "Sale ALTA" : "Purchase ALTA",
        sourceTable: "project_settlements",
        sourceRowId: s.id,
        projectId: s.project_id,
      });
    }
  }

  // 4. Misc charges
  for (const m of opts.miscCharges) {
    if (m.project_id !== opts.projectId) continue;
    events.push({
      id: `misc:${m.id}`,
      date: m.charge_date || m.created_at.slice(0, 10),
      source: "misc_charge",
      sourceLabel: "Misc charge",
      description: m.description,
      amount: Number(m.amount),
      direction: "out",
      detail: m.category,
      sourceTable: "project_misc_charges",
      sourceRowId: m.id,
      projectId: m.project_id,
    });
  }

  // Sort by date asc, then by source so settlement_revenue lands above
  // its line items.
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.id.localeCompare(b.id);
  });

  return events;
}

/**
 * CSV export — no information loss, suitable for accountant/tax handoff.
 * Headers: Date, Source, Description, Detail, Direction, Amount.
 */
export function eventsToCsv(events: ActivityEvent[]): string {
  const esc = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const rows = [
    ["Date", "Source", "Description", "Detail", "Direction", "Amount"].join(","),
    ...events.map((e) =>
      [
        e.date,
        esc(e.sourceLabel),
        esc(e.description),
        esc(e.detail || ""),
        e.direction,
        e.amount.toFixed(2),
      ].join(","),
    ),
  ];
  return rows.join("\n");
}
