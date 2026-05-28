"use client";

/**
 * Loan Ledger tab — event-per-row record of every lender-side transaction.
 *
 * Source of truth for loan cost when entries exist. The helper in
 * lib/finance/project-financials.ts prefers ledger numbers over
 * formula-based estimates for any project that has ledger entries, so
 * this UI is how Blake gets his projected_profit to match the lender's
 * statement to the penny.
 *
 * Two ways to populate:
 *   1. Upload a lender statement (PDF or image) — Claude extracts every
 *      event, the user reviews + edits the suggestions, then bulk-saves.
 *      All AI-extracted rows are flagged ai_extracted=true and stay
 *      ai_extracted=true until the user edits them in place (each save
 *      flips user_verified=true).
 *   2. Add entries manually one at a time.
 *
 * Running balance is computed and displayed alongside the lender's
 * stated balance (when provided) so any mismatch surfaces immediately.
 */

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Banknote,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit3,
  FileUp,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  formatCurrency as fmt,
  formatCurrencyInput,
  formatDate as fmtDate,
  unformatCurrency,
} from "@/lib/formatters";
import { confirmAction } from "@/lib/confirmAction";
import type {
  LoanLedgerEntry,
  LoanLedgerEntryType,
} from "@/lib/types/database";

// ────────────────────────────────────────────────────────────────────────
// Display labels + balance impact per entry_type. amount is always
// positive in storage; this map tells the UI which direction it moves
// the principal/interest balances for the running-total column.

const ENTRY_TYPE_META: Record<
  LoanLedgerEntryType,
  { label: string; principalDelta: 1 | -1 | 0; interestDelta: 1 | -1 | 0; colorClass: string }
> = {
  disbursement: { label: "Disbursement", principalDelta: 1, interestDelta: 0, colorClass: "bg-indigo-100 text-indigo-700" },
  interest_accrual: { label: "Interest accrued", principalDelta: 0, interestDelta: 1, colorClass: "bg-amber-100 text-amber-700" },
  interest_payment: { label: "Interest paid", principalDelta: 0, interestDelta: -1, colorClass: "bg-emerald-100 text-emerald-700" },
  principal_payment: { label: "Principal paid", principalDelta: -1, interestDelta: 0, colorClass: "bg-emerald-100 text-emerald-700" },
  fee: { label: "Fee", principalDelta: 0, interestDelta: 1, colorClass: "bg-rose-100 text-rose-700" },
  payoff: { label: "Payoff", principalDelta: -1, interestDelta: -1, colorClass: "bg-gray-200 text-gray-800" },
};

const ENTRY_TYPE_OPTIONS: LoanLedgerEntryType[] = [
  "disbursement",
  "interest_accrual",
  "interest_payment",
  "principal_payment",
  "fee",
  "payoff",
];

// ────────────────────────────────────────────────────────────────────────

interface AddForm {
  entry_date: string;
  entry_type: LoanLedgerEntryType;
  description: string;
  amount: string;
  running_balance: string;
  payment_method: string;
  notes: string;
}

const EMPTY_ADD: AddForm = {
  entry_date: "",
  entry_type: "disbursement",
  description: "",
  amount: "",
  running_balance: "",
  payment_method: "",
  notes: "",
};

interface Props {
  projectId: string;
  entries: LoanLedgerEntry[];
}

export default function LoanLedgerTab({ projectId, entries }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddForm>(EMPTY_ADD);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [reviewEntries, setReviewEntries] = useState<AddForm[] | null>(null);
  const [reviewSummary, setReviewSummary] = useState<string>("");

  // ── Totals ─────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let principal = 0;
    let interestAccrued = 0;
    let interestPaid = 0;
    let fees = 0;
    let payoff = 0;
    for (const e of entries) {
      const meta = ENTRY_TYPE_META[e.entry_type];
      if (!meta) continue;
      switch (e.entry_type) {
        case "disbursement":
          principal += Number(e.amount);
          break;
        case "principal_payment":
          principal -= Number(e.amount);
          break;
        case "interest_accrual":
          interestAccrued += Number(e.amount);
          break;
        case "interest_payment":
          interestPaid += Number(e.amount);
          break;
        case "fee":
          fees += Number(e.amount);
          break;
        case "payoff":
          payoff += Number(e.amount);
          break;
      }
    }
    return {
      principal,
      interestAccrued,
      interestPaid,
      interestOutstanding: interestAccrued - interestPaid,
      fees,
      payoff,
      totalCost: interestAccrued + fees,
    };
  }, [entries]);

  // ── Running balances per row for display ────────────────────────────
  // Computes principal + interest balance after each entry, in date
  // order. Highlights mismatches against the lender's stated
  // running_balance (when present) so data-entry errors surface fast.
  const rowsWithBalance = useMemo(() => {
    let prin = 0;
    let intr = 0;
    const sorted = [...entries].sort((a, b) => {
      if (a.entry_date !== b.entry_date) return a.entry_date.localeCompare(b.entry_date);
      return a.created_at.localeCompare(b.created_at);
    });
    return sorted.map((e) => {
      const amt = Number(e.amount);
      switch (e.entry_type) {
        case "disbursement":
          prin += amt;
          break;
        case "principal_payment":
          prin -= amt;
          break;
        case "interest_accrual":
        case "fee":
          intr += amt;
          break;
        case "interest_payment":
          intr -= amt;
          break;
        case "payoff":
          prin = 0;
          intr = 0;
          break;
      }
      const computedBalance = prin + intr;
      const lenderBalance = e.running_balance != null ? Number(e.running_balance) : null;
      const mismatch =
        lenderBalance != null && Math.abs(computedBalance - lenderBalance) > 0.01;
      return { entry: e, computedBalance, principalAfter: prin, interestAfter: intr, mismatch };
    });
  }, [entries]);

  // ── Mutations ───────────────────────────────────────────────────────
  async function apiCall(url: string, method: string, body?: unknown) {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        ...(body
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `${method} failed`);
        return null;
      }
      router.refresh();
      return res;
    } finally {
      setLoading(false);
    }
  }

  function packForm(f: AddForm) {
    return {
      entry_date: f.entry_date || null,
      entry_type: f.entry_type,
      description: f.description || null,
      amount: f.amount ? parseFloat(unformatCurrency(f.amount)) : 0,
      running_balance: f.running_balance ? parseFloat(unformatCurrency(f.running_balance)) : null,
      payment_method: f.payment_method || null,
      notes: f.notes || null,
    };
  }

  async function addEntry() {
    if (!addForm.entry_date) {
      toast.error("Date is required");
      return;
    }
    if (!addForm.amount) {
      toast.error("Amount is required");
      return;
    }
    const ok = await apiCall(
      `/api/admin/projects/${projectId}/loan-ledger`,
      "POST",
      packForm(addForm),
    );
    if (ok) {
      setAddForm(EMPTY_ADD);
      setShowAdd(false);
      toast.success("Entry added");
    }
  }

  function startEdit(e: LoanLedgerEntry) {
    setEditingId(e.id);
    setEditForm({
      entry_date: e.entry_date,
      entry_type: e.entry_type,
      description: e.description ?? "",
      amount: formatCurrencyInput(String(e.amount)),
      running_balance: e.running_balance != null ? formatCurrencyInput(String(e.running_balance)) : "",
      payment_method: e.payment_method ?? "",
      notes: e.notes ?? "",
    });
  }

  async function saveEdit(id: string) {
    const ok = await apiCall(
      `/api/admin/projects/${projectId}/loan-ledger/${id}`,
      "PATCH",
      { ...packForm(editForm), user_verified: true },
    );
    if (ok) {
      setEditingId(null);
      toast.success("Entry updated");
    }
  }

  async function deleteEntry(id: string) {
    if (!(await confirmAction("Delete this ledger entry?"))) return;
    const ok = await apiCall(
      `/api/admin/projects/${projectId}/loan-ledger/${id}`,
      "DELETE",
    );
    if (ok) toast.success("Entry deleted");
  }

  // ── AI extraction ───────────────────────────────────────────────────
  async function handleExtract(file: File) {
    setExtracting(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/loan-ledger/extract`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Extraction failed");
        return;
      }
      const data: {
        entries: {
          entry_date: string;
          entry_type: LoanLedgerEntryType;
          description: string | null;
          amount: number;
          running_balance: number | null;
          payment_method: string | null;
          notes: string | null;
        }[];
        summary: string;
      } = await res.json();
      setReviewSummary(data.summary || "");
      setReviewEntries(
        data.entries.map((e) => ({
          entry_date: e.entry_date,
          entry_type: e.entry_type,
          description: e.description ?? "",
          amount: formatCurrencyInput(String(e.amount)),
          running_balance: e.running_balance != null ? formatCurrencyInput(String(e.running_balance)) : "",
          payment_method: e.payment_method ?? "",
          notes: e.notes ?? "",
        })),
      );
      toast.success(`Claude extracted ${data.entries.length} entries — review and confirm`);
    } catch {
      toast.error("Extraction failed");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function saveReviewEntries() {
    if (!reviewEntries) return;
    const payload = reviewEntries.map((f) => ({
      ...packForm(f),
      ai_extracted: true,
      user_verified: true,
    }));
    const ok = await apiCall(
      `/api/admin/projects/${projectId}/loan-ledger`,
      "POST",
      payload,
    );
    if (ok) {
      setReviewEntries(null);
      setReviewSummary("");
      toast.success(`Saved ${payload.length} entries to the ledger`);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Tile label="Principal Outstanding" value={fmt(totals.principal)} tone="indigo" />
        <Tile
          label="Interest Cost (Total)"
          value={fmt(totals.totalCost)}
          tone="amber"
          subtitle={
            totals.fees > 0
              ? `${fmt(totals.interestAccrued)} interest + ${fmt(totals.fees)} fees`
              : undefined
          }
        />
        <Tile
          label="Interest Unpaid"
          value={fmt(totals.interestOutstanding)}
          tone={totals.interestOutstanding > 0 ? "rose" : "emerald"}
        />
        <Tile label="Payoff to Date" value={fmt(totals.payoff)} tone="gray" />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={extracting}
          className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {extracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading statement…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Upload Lender Statement (AI)
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleExtract(f);
          }}
        />
        {entries.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </span>
        )}
      </div>

      {/* Inline add form */}
      {showAdd && (
        <EntryEditor
          title="New Entry"
          form={addForm}
          setForm={setAddForm}
          onSave={addEntry}
          onCancel={() => {
            setAddForm(EMPTY_ADD);
            setShowAdd(false);
          }}
          loading={loading}
          saveLabel="Add Entry"
        />
      )}

      {/* AI review queue */}
      {reviewEntries && (
        <div className="rounded-lg border border-indigo-300 bg-indigo-50/40 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  Review {reviewEntries.length} extracted {reviewEntries.length === 1 ? "entry" : "entries"}
                </p>
                {reviewSummary && (
                  <p className="text-xs text-indigo-700 mt-0.5">{reviewSummary}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setReviewEntries(null);
                setReviewSummary("");
              }}
              className="text-xs text-gray-600 hover:text-gray-900 cursor-pointer"
            >
              Discard all
            </button>
          </div>
          <div className="space-y-2 mb-3">
            {reviewEntries.map((e, i) => (
              <EntryEditor
                key={i}
                title={`Entry ${i + 1}`}
                form={e}
                setForm={(next) => {
                  setReviewEntries((prev) => {
                    if (!prev) return prev;
                    const copy = [...prev];
                    copy[i] = typeof next === "function" ? next(prev[i]) : next;
                    return copy;
                  });
                }}
                onRemove={() => {
                  setReviewEntries((prev) =>
                    prev ? prev.filter((_, j) => j !== i) : prev,
                  );
                }}
                compact
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={saveReviewEntries}
              disabled={loading || reviewEntries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              Save {reviewEntries.length} {reviewEntries.length === 1 ? "entry" : "entries"}
            </button>
            <button
              onClick={() => {
                setReviewEntries(null);
                setReviewSummary("");
              }}
              className="text-sm text-gray-600 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ledger table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <Banknote className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No loan activity recorded yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Upload a lender statement or add entries manually. The
              projected profit will use this data when present.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rowsWithBalance.map(({ entry, computedBalance, principalAfter, interestAfter, mismatch }) => {
              const meta = ENTRY_TYPE_META[entry.entry_type];
              return editingId === entry.id ? (
                <div key={entry.id} className="p-3 bg-gray-50">
                  <EntryEditor
                    title="Edit Entry"
                    form={editForm}
                    setForm={setEditForm}
                    onSave={() => saveEdit(entry.id)}
                    onCancel={() => setEditingId(null)}
                    loading={loading}
                    saveLabel="Save"
                  />
                </div>
              ) : (
                <div
                  key={entry.id}
                  className="p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                    <div className="shrink-0 sm:w-24">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(entry.entry_date) ?? entry.entry_date}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.colorClass}`}
                        >
                          {meta.label}
                        </span>
                        {entry.ai_extracted && !entry.user_verified && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 uppercase tracking-wide">
                            <Sparkles className="w-2.5 h-2.5" />
                            AI — needs review
                          </span>
                        )}
                        {entry.payment_method && (
                          <span className="text-xs text-gray-500">
                            via {entry.payment_method}
                          </span>
                        )}
                      </div>
                      {entry.description && (
                        <p className="text-sm text-gray-900 mt-0.5">
                          {entry.description}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-xs text-gray-500 mt-0.5">{entry.notes}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-gray-900">
                        {fmt(Number(entry.amount))}
                      </p>
                      <p className="text-[11px] text-gray-500 tabular-nums">
                        Bal: {fmt(computedBalance)}
                      </p>
                      {mismatch && entry.running_balance != null && (
                        <p
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600"
                          title={`Lender shows ${fmt(Number(entry.running_balance))} after this entry — our computed balance is ${fmt(computedBalance)}`}
                        >
                          <TriangleAlert className="w-2.5 h-2.5" />
                          Lender: {fmt(Number(entry.running_balance))}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex sm:flex-col items-center gap-1">
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 cursor-pointer"
                        aria-label="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-600 cursor-pointer"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function Tile({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone: "indigo" | "amber" | "emerald" | "rose" | "gray";
}) {
  const toneMap = {
    indigo: "border-indigo-300 bg-indigo-50/40",
    amber: "border-amber-300 bg-amber-50/40",
    emerald: "border-emerald-300 bg-emerald-50/40",
    rose: "border-rose-300 bg-rose-50/40",
    gray: "border-gray-300 bg-gray-50/40",
  };
  return (
    <div className={`border rounded-lg p-3 ${toneMap[tone]}`}>
      <p className="text-[11px] font-medium text-gray-600">{label}</p>
      <p className="text-lg font-bold tabular-nums text-gray-900">{value}</p>
      {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EntryEditor({
  title,
  form,
  setForm,
  onSave,
  onCancel,
  onRemove,
  loading,
  saveLabel,
  compact,
}: {
  title: string;
  form: AddForm;
  setForm: React.Dispatch<React.SetStateAction<AddForm>> | ((v: AddForm) => void);
  onSave?: () => void;
  onCancel?: () => void;
  onRemove?: () => void;
  loading?: boolean;
  saveLabel?: string;
  compact?: boolean;
}) {
  const update = (patch: Partial<AddForm>) => {
    if (typeof setForm === "function") {
      // both signatures accepted; React.Dispatch one wraps the value
      (setForm as React.Dispatch<React.SetStateAction<AddForm>>)((prev) => ({
        ...prev,
        ...patch,
      }));
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-3 ${compact ? "" : "shadow-sm"}`}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-[11px] text-gray-600 font-medium mb-1">Date</label>
          <input
            type="date"
            value={form.entry_date}
            onChange={(e) => update({ entry_date: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-600 font-medium mb-1">Type</label>
          <select
            value={form.entry_type}
            onChange={(e) => update({ entry_type: e.target.value as LoanLedgerEntryType })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white cursor-pointer"
          >
            {ENTRY_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {ENTRY_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-600 font-medium mb-1">Amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => update({ amount: formatCurrencyInput(e.target.value) })}
            placeholder="$0.00"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] text-gray-600 font-medium mb-1">Description</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="e.g. Draw #2, January interest, Origination fee"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-600 font-medium mb-1">
            Payment Method
          </label>
          <input
            type="text"
            value={form.payment_method}
            onChange={(e) => update({ payment_method: e.target.value })}
            placeholder="escrow, DD, check, bill_pay…"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] text-gray-600 font-medium mb-1">
            Lender&apos;s stated balance{" "}
            <span className="text-gray-400 font-normal">(optional, for verification)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.running_balance}
            onChange={(e) => update({ running_balance: formatCurrencyInput(e.target.value) })}
            placeholder="$0.00"
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-600 font-medium mb-1">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => update({ notes: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>
      {(onSave || onRemove) && (
        <div className="mt-3 flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              {saveLabel || "Save"}
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer ml-auto"
            >
              <Trash2 className="w-3 h-3 inline" /> Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}
