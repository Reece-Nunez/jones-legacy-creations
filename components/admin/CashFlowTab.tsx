"use client";

/**
 * Cash Flow tab — every money event on a project in chronological order.
 *
 * Combines contractor_payments, loan_ledger, project_settlements, and
 * project_misc_charges into one audit-grade view. Search + filter +
 * CSV export so Blake can hand it to an accountant or reconcile it
 * against his Google Sheet line by line.
 *
 * Why client-side instead of a server endpoint:
 *   All the underlying data is already fetched for ProjectDetail, so
 *   aggregating client-side is free. Keeps the activity feed in sync
 *   with whatever edits the user makes elsewhere on the page without a
 *   refetch round-trip.
 */

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Building,
  Calendar,
  CreditCard,
  Download,
  Equal,
  Filter,
  Landmark,
  Search,
  X,
} from "lucide-react";
import {
  formatCurrency as fmt,
  formatDate as fmtDate,
} from "@/lib/formatters";
import {
  buildProjectActivity,
  eventsToCsv,
  type ActivityEvent,
  type ActivitySource,
} from "@/lib/finance/project-activity";
import type {
  ContractorPayment,
  LoanLedgerEntry,
  ProjectMiscCharge,
  ProjectSettlement,
} from "@/lib/types/database";

interface Props {
  projectId: string;
  projectName: string;
  payments: ContractorPayment[];
  loanLedger: LoanLedgerEntry[];
  settlements: ProjectSettlement[];
  miscCharges: ProjectMiscCharge[];
}

const SOURCE_META: Record<
  ActivitySource,
  { label: string; group: string; color: string; icon: React.ElementType }
> = {
  contractor: { label: "Contractor", group: "Costs", color: "bg-orange-100 text-orange-700", icon: CreditCard },
  loan_disbursement: { label: "Loan draw", group: "Loan", color: "bg-indigo-100 text-indigo-700", icon: Landmark },
  loan_interest_accrual: { label: "Interest accrued", group: "Loan", color: "bg-amber-100 text-amber-700", icon: Landmark },
  loan_interest_payment: { label: "Interest paid", group: "Loan", color: "bg-emerald-100 text-emerald-700", icon: Landmark },
  loan_principal_payment: { label: "Principal paid", group: "Loan", color: "bg-emerald-100 text-emerald-700", icon: Landmark },
  loan_fee: { label: "Lender fee", group: "Loan", color: "bg-rose-100 text-rose-700", icon: Landmark },
  loan_payoff: { label: "Loan payoff", group: "Loan", color: "bg-gray-200 text-gray-800", icon: Landmark },
  settlement_revenue: { label: "Sale wire", group: "Settlement", color: "bg-emerald-100 text-emerald-700", icon: Building },
  settlement_cost: { label: "Settlement line", group: "Settlement", color: "bg-blue-100 text-blue-700", icon: Building },
  misc_charge: { label: "Misc", group: "Costs", color: "bg-rose-100 text-rose-700", icon: CreditCard },
};

const GROUP_OPTIONS = ["All", "Costs", "Loan", "Settlement"] as const;

export default function CashFlowTab({
  projectId,
  projectName,
  payments,
  loanLedger,
  settlements,
  miscCharges,
}: Props) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<typeof GROUP_OPTIONS[number]>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const allEvents = useMemo(
    () =>
      buildProjectActivity({
        projectId,
        payments,
        loanLedger,
        settlements,
        miscCharges,
      }),
    [projectId, payments, loanLedger, settlements, miscCharges],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (q) {
        const hay = `${e.description} ${e.detail ?? ""} ${e.sourceLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (groupFilter !== "All" && SOURCE_META[e.source].group !== groupFilter) {
        return false;
      }
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [allEvents, search, groupFilter, dateFrom, dateTo]);

  // Summary tallies (cash-in vs cash-out, ignoring "neutral" so we
  // don't double-count draws + contractor payments).
  const totals = useMemo(() => {
    let cashIn = 0;
    let cashOut = 0;
    for (const e of filtered) {
      if (e.direction === "in") cashIn += e.amount;
      else if (e.direction === "out") cashOut += e.amount;
    }
    return { cashIn, cashOut, net: cashIn - cashOut };
  }, [filtered]);

  function downloadCsv() {
    const csv = eventsToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const safeName = projectName.replace(/[^a-z0-9-]+/gi, "_").toLowerCase();
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeName}_cashflow_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const activeFilterCount =
    (search ? 1 : 0) +
    (groupFilter !== "All" ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile
          label="Cash In"
          value={fmt(totals.cashIn)}
          icon={ArrowDownRight}
          tone="emerald"
        />
        <SummaryTile
          label="Cash Out"
          value={fmt(totals.cashOut)}
          icon={ArrowUpRight}
          tone="rose"
        />
        <SummaryTile
          label="Net"
          value={fmt(totals.net)}
          icon={Equal}
          tone={totals.net >= 0 ? "emerald" : "rose"}
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contractor, description, payment method…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md border cursor-pointer transition-colors ${
            showFilters || activeFilterCount > 0
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-semibold w-4 h-4">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Expandable filter row */}
      {showFilters && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-gray-600 font-medium mb-1">
                Source group
              </label>
              <select
                value={groupFilter}
                onChange={(e) =>
                  setGroupFilter(e.target.value as typeof GROUP_OPTIONS[number])
                }
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white cursor-pointer"
              >
                {GROUP_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 font-medium mb-1">
                Date from
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-600 font-medium mb-1">
                Date to
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSearch("");
                setGroupFilter("All");
                setDateFrom("");
                setDateTo("");
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Clear all filters
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Showing {filtered.length} of {allEvents.length} events. Direction is
        from Blake&apos;s perspective: <span className="text-emerald-700">in</span> =
        money received, <span className="text-rose-700">out</span> = money paid,
        neutral = lender / loan-funded events that don&apos;t affect his
        personal cash position.
      </p>

      {/* Event list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Banknote className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              {allEvents.length === 0
                ? "No activity yet."
                : "No events match the current filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((e) => (
              <EventRow key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: "emerald" | "rose";
}) {
  const colors =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50/40 text-emerald-900"
      : "border-rose-300 bg-rose-50/40 text-rose-900";
  return (
    <div className={`border rounded-lg p-3 ${colors}`}>
      <div className="flex items-center gap-1 text-[11px] font-medium opacity-80">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function EventRow({ event: e }: { event: ActivityEvent }) {
  const meta = SOURCE_META[e.source];
  const Icon = meta.icon;
  const amountColor =
    e.direction === "in"
      ? "text-emerald-700"
      : e.direction === "out"
        ? "text-rose-700"
        : "text-gray-500";
  const sign =
    e.direction === "in" ? "+" : e.direction === "out" ? "-" : "";

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
        <div className="shrink-0 sm:w-24">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            {fmtDate(e.date) ?? e.date}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}
            >
              <Icon className="w-2.5 h-2.5" />
              {meta.label}
            </span>
            {e.detail && (
              <span className="text-xs text-gray-500">{e.detail}</span>
            )}
          </div>
          <p className="text-sm text-gray-900 mt-0.5">{e.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-sm font-semibold tabular-nums ${amountColor}`}>
            {sign}
            {fmt(e.amount)}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            {e.direction === "neutral" ? "loan-funded" : e.direction}
          </p>
        </div>
      </div>
    </div>
  );
}
