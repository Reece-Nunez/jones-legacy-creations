"use client";

/**
 * Settlements section — ALTA Settlement Statement records per project.
 *
 * Two cards (one per typical event): purchase (construction-loan close)
 * and sale (final sale to homebuyer). Each can be:
 *   • Empty (no record yet) → "Upload ALTA (AI)" or "Add manually" buttons
 *   • Pending review (AI just extracted) → editable preview, save/discard
 *   • Saved → itemized display with Edit/Delete
 *
 * When a SALE settlement exists, the helper in
 * lib/finance/project-financials.ts derives sale_closing_costs from its
 * line items instead of using the manual projects.sale_closing_costs.
 * UX in the FinancialSummary indicates which source is being used.
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Building,
  Check,
  Edit3,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  formatCurrency as fmt,
  formatCurrencyInput,
  formatDate as fmtDate,
  unformatCurrency,
} from "@/lib/formatters";
import { confirmAction } from "@/lib/confirmAction";
import type {
  ProjectSettlement,
  ProjectSettlementType,
  SettlementOtherFee,
} from "@/lib/types/database";

interface Props {
  projectId: string;
  settlements: ProjectSettlement[];
}

// ────────────────────────────────────────────────────────────────────────
// Editable form shape — strings for currency fields, so React Hook Form
// patterns aren't needed and inputs update freely as the user types.

interface SettlementForm {
  settlement_date: string;
  settlement_type: ProjectSettlementType;
  sale_price: string;
  seller_concessions: string;
  title_insurance: string;
  escrow_fee: string;
  recording_fees: string;
  prorated_taxes: string;
  other_fees: SettlementOtherFee[];
  loan_payoff: string;
  net_to_seller: string;
  purchase_price: string;
  earnest_money: string;
  loan_amount: string;
  cash_to_close: string;
  notes: string;
}

function emptyForm(type: ProjectSettlementType): SettlementForm {
  return {
    settlement_date: "",
    settlement_type: type,
    sale_price: "",
    seller_concessions: "",
    title_insurance: "",
    escrow_fee: "",
    recording_fees: "",
    prorated_taxes: "",
    other_fees: [],
    loan_payoff: "",
    net_to_seller: "",
    purchase_price: "",
    earnest_money: "",
    loan_amount: "",
    cash_to_close: "",
    notes: "",
  };
}

function formFromRecord(s: ProjectSettlement): SettlementForm {
  const num = (n: number | null) =>
    n != null ? formatCurrencyInput(String(n)) : "";
  return {
    settlement_date: s.settlement_date,
    settlement_type: s.settlement_type,
    sale_price: num(s.sale_price),
    seller_concessions: num(s.seller_concessions),
    title_insurance: num(s.title_insurance),
    escrow_fee: num(s.escrow_fee),
    recording_fees: num(s.recording_fees),
    prorated_taxes: num(s.prorated_taxes),
    other_fees: Array.isArray(s.other_fees) ? s.other_fees : [],
    loan_payoff: num(s.loan_payoff),
    net_to_seller: num(s.net_to_seller),
    purchase_price: num(s.purchase_price),
    earnest_money: num(s.earnest_money),
    loan_amount: num(s.loan_amount),
    cash_to_close: num(s.cash_to_close),
    notes: s.notes ?? "",
  };
}

function packForm(f: SettlementForm) {
  const num = (s: string) =>
    s.trim() ? parseFloat(unformatCurrency(s)) : null;
  return {
    settlement_date: f.settlement_date,
    settlement_type: f.settlement_type,
    sale_price: num(f.sale_price),
    seller_concessions: num(f.seller_concessions),
    title_insurance: num(f.title_insurance),
    escrow_fee: num(f.escrow_fee),
    recording_fees: num(f.recording_fees),
    prorated_taxes: num(f.prorated_taxes),
    other_fees: f.other_fees,
    loan_payoff: num(f.loan_payoff),
    net_to_seller: num(f.net_to_seller),
    purchase_price: num(f.purchase_price),
    earnest_money: num(f.earnest_money),
    loan_amount: num(f.loan_amount),
    cash_to_close: num(f.cash_to_close),
    notes: f.notes || null,
  };
}

// ────────────────────────────────────────────────────────────────────────

export default function SettlementsSection({ projectId, settlements }: Props) {
  const purchase = settlements.find((s) => s.settlement_type === "purchase");
  const sale = settlements
    .filter((s) => s.settlement_type === "sale")
    .sort((a, b) => b.settlement_date.localeCompare(a.settlement_date))[0];

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
      <SettlementCard
        projectId={projectId}
        kind="purchase"
        title="Purchase / Loan Origination"
        subtitle="Construction-loan closing statement"
        existing={purchase}
      />
      <SettlementCard
        projectId={projectId}
        kind="sale"
        title="Sale Settlement"
        subtitle="Final sale to homebuyer (ALTA)"
        existing={sale}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function SettlementCard({
  projectId,
  kind,
  title,
  subtitle,
  existing,
}: {
  projectId: string;
  kind: ProjectSettlementType;
  title: string;
  subtitle: string;
  existing?: ProjectSettlement;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pendingReview, setPendingReview] = useState<SettlementForm | null>(null);
  const [form, setForm] = useState<SettlementForm>(
    existing ? formFromRecord(existing) : emptyForm(kind),
  );
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleExtract(file: File) {
    setExtracting(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/settlements/extract`,
        { method: "POST", body: fd },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Extraction failed");
        return;
      }
      const data = await res.json();
      // Coerce numbers to formatted strings for the editable form.
      const num = (n: number | null | undefined) =>
        n != null ? formatCurrencyInput(String(n)) : "";
      setPendingReview({
        settlement_date: data.settlement_date || "",
        settlement_type: data.settlement_type || kind,
        sale_price: num(data.sale_price),
        seller_concessions: num(data.seller_concessions),
        title_insurance: num(data.title_insurance),
        escrow_fee: num(data.escrow_fee),
        recording_fees: num(data.recording_fees),
        prorated_taxes: num(data.prorated_taxes),
        other_fees: Array.isArray(data.other_fees) ? data.other_fees : [],
        loan_payoff: num(data.loan_payoff),
        net_to_seller: num(data.net_to_seller),
        purchase_price: num(data.purchase_price),
        earnest_money: num(data.earnest_money),
        loan_amount: num(data.loan_amount),
        cash_to_close: num(data.cash_to_close),
        notes: data.notes ?? "",
      });
      toast.success("Settlement extracted — review and confirm");
    } catch {
      toast.error("Extraction failed");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(values: SettlementForm) {
    if (!values.settlement_date) {
      toast.error("Settlement date is required");
      return;
    }
    setLoading(true);
    try {
      const url = existing
        ? `/api/admin/projects/${projectId}/settlements/${existing.id}`
        : `/api/admin/projects/${projectId}/settlements`;
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...packForm(values),
          ai_extracted: !!pendingReview,
          user_verified: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Save failed");
        return;
      }
      toast.success(existing ? "Settlement updated" : "Settlement saved");
      setEditing(false);
      setPendingReview(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!(await confirmAction("Delete this settlement?"))) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/settlements/${existing.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Delete failed");
        return;
      }
      toast.success("Settlement deleted");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  const showForm = editing || pendingReview;
  const activeForm = pendingReview ?? form;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-100">
        <div className="flex items-start gap-2">
          <Building className="w-4 h-4 mt-0.5 text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="text-[11px] text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {existing && !showForm && (
            <>
              <button
                onClick={() => {
                  setForm(formFromRecord(existing));
                  setEditing(true);
                }}
                className="p-1.5 text-gray-500 hover:text-indigo-600 cursor-pointer"
                aria-label="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={remove}
                disabled={loading}
                className="p-1.5 text-gray-500 hover:text-rose-600 cursor-pointer disabled:opacity-50"
                aria-label="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="p-3">
        {pendingReview && (
          <div className="mb-3 flex items-center gap-2 rounded bg-purple-50 border border-purple-200 px-2 py-1.5 text-[11px] text-purple-800">
            <Sparkles className="w-3 h-3" />
            Extracted by AI — review and edit before saving
          </div>
        )}

        {!showForm && !existing && (
          <div className="text-center py-3">
            <p className="text-xs text-gray-500 mb-3">
              No {kind} settlement recorded yet.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={extracting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 disabled:opacity-50 cursor-pointer"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Reading…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    Upload ALTA (AI)
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setForm(emptyForm(kind));
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add manually
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleExtract(f);
                }}
              />
            </div>
          </div>
        )}

        {!showForm && existing && (
          <SettlementDisplay record={existing} />
        )}

        {showForm && (
          <SettlementEditor
            form={activeForm}
            setForm={pendingReview ? setPendingReview : setForm}
            kind={kind}
            onSave={() => save(activeForm)}
            onCancel={() => {
              setEditing(false);
              setPendingReview(null);
            }}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function SettlementDisplay({ record }: { record: ProjectSettlement }) {
  const isSale = record.settlement_type === "sale";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mb-1">
        <span>{fmtDate(record.settlement_date) ?? record.settlement_date}</span>
        {record.ai_extracted && record.user_verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase">
            <Check className="w-2.5 h-2.5" />
            AI + verified
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        {isSale ? (
          <>
            <Row label="Sale Price" value={record.sale_price} positive />
            <Row label="Seller Concessions" value={record.seller_concessions} />
            <Row label="Title Insurance" value={record.title_insurance} />
            <Row label="Escrow Fee" value={record.escrow_fee} />
            <Row label="Recording Fees" value={record.recording_fees} />
            <Row label="Prorated Taxes" value={record.prorated_taxes} />
            <Row label="Loan Payoff" value={record.loan_payoff} />
            <Row label="Net to Seller" value={record.net_to_seller} positive bold />
          </>
        ) : (
          <>
            <Row label="Purchase Price" value={record.purchase_price} />
            <Row label="Earnest Money" value={record.earnest_money} />
            <Row label="Loan Amount" value={record.loan_amount} positive />
            <Row label="Title Insurance" value={record.title_insurance} />
            <Row label="Escrow Fee" value={record.escrow_fee} />
            <Row label="Recording Fees" value={record.recording_fees} />
            <Row label="Cash to Close" value={record.cash_to_close} bold />
          </>
        )}
      </div>
      {record.other_fees && record.other_fees.length > 0 && (
        <div className="mt-1 pt-1 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-500 mb-1">
            Other fees:
          </p>
          <div className="space-y-0.5">
            {record.other_fees.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{f.label}</span>
                <span className="tabular-nums text-gray-900">
                  {fmt(Number(f.amount))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {record.notes && (
        <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-100">
          {record.notes}
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  bold,
}: {
  label: string;
  value: number | null;
  positive?: boolean;
  bold?: boolean;
}) {
  const display = value != null ? fmt(Number(value)) : "—";
  return (
    <>
      <div className={`text-xs text-gray-500 ${bold ? "font-semibold" : ""}`}>
        {label}
      </div>
      <div
        className={`text-right tabular-nums text-sm ${
          bold ? "font-bold" : ""
        } ${positive ? "text-emerald-700" : "text-gray-900"}`}
      >
        {display}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────

function SettlementEditor({
  form,
  setForm,
  kind,
  onSave,
  onCancel,
  loading,
}: {
  form: SettlementForm;
  setForm: React.Dispatch<React.SetStateAction<SettlementForm>> | React.Dispatch<React.SetStateAction<SettlementForm | null>>;
  kind: ProjectSettlementType;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const update = (patch: Partial<SettlementForm>) => {
    // Both setForm signatures accept a callback that returns the next value.
    (setForm as React.Dispatch<React.SetStateAction<SettlementForm | null>>)(
      (prev) =>
        prev
          ? { ...prev, ...patch }
          : ({ ...form, ...patch } as SettlementForm),
    );
  };
  const addOtherFee = () =>
    update({ other_fees: [...form.other_fees, { label: "", amount: 0 }] });
  const updateOtherFee = (i: number, patch: Partial<SettlementOtherFee>) => {
    const next = [...form.other_fees];
    next[i] = { ...next[i], ...patch };
    update({ other_fees: next });
  };
  const removeOtherFee = (i: number) =>
    update({ other_fees: form.other_fees.filter((_, j) => j !== i) });

  const isSale = form.settlement_type === "sale";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Settlement Date">
          <input
            type="date"
            value={form.settlement_date}
            onChange={(e) => update({ settlement_date: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Settlement Type">
          <select
            value={form.settlement_type}
            onChange={(e) =>
              update({ settlement_type: e.target.value as ProjectSettlementType })
            }
            className={`${inputCls} bg-white cursor-pointer`}
          >
            <option value="purchase">Purchase / Loan Origination</option>
            <option value="sale">Sale</option>
          </select>
        </Field>
      </div>

      {isSale ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <CurrencyField
              label="Sale Price"
              value={form.sale_price}
              onChange={(v) => update({ sale_price: v })}
            />
            <CurrencyField
              label="Seller Concessions"
              value={form.seller_concessions}
              onChange={(v) => update({ seller_concessions: v })}
            />
            <CurrencyField
              label="Title Insurance"
              value={form.title_insurance}
              onChange={(v) => update({ title_insurance: v })}
            />
            <CurrencyField
              label="Escrow Fee"
              value={form.escrow_fee}
              onChange={(v) => update({ escrow_fee: v })}
            />
            <CurrencyField
              label="Recording Fees"
              value={form.recording_fees}
              onChange={(v) => update({ recording_fees: v })}
              hint="Doc prep, e-filing, reconveyance, etc."
            />
            <CurrencyField
              label="Prorated Taxes"
              value={form.prorated_taxes}
              onChange={(v) => update({ prorated_taxes: v })}
            />
            <CurrencyField
              label="Loan Payoff"
              value={form.loan_payoff}
              onChange={(v) => update({ loan_payoff: v })}
            />
            <CurrencyField
              label="Net to Seller"
              value={form.net_to_seller}
              onChange={(v) => update({ net_to_seller: v })}
              hint="The wire amount"
            />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <CurrencyField
            label="Purchase Price"
            value={form.purchase_price}
            onChange={(v) => update({ purchase_price: v })}
          />
          <CurrencyField
            label="Earnest Money"
            value={form.earnest_money}
            onChange={(v) => update({ earnest_money: v })}
          />
          <CurrencyField
            label="Loan Amount"
            value={form.loan_amount}
            onChange={(v) => update({ loan_amount: v })}
          />
          <CurrencyField
            label="Title Insurance"
            value={form.title_insurance}
            onChange={(v) => update({ title_insurance: v })}
          />
          <CurrencyField
            label="Escrow Fee"
            value={form.escrow_fee}
            onChange={(v) => update({ escrow_fee: v })}
          />
          <CurrencyField
            label="Recording Fees"
            value={form.recording_fees}
            onChange={(v) => update({ recording_fees: v })}
          />
          <CurrencyField
            label="Cash to Close"
            value={form.cash_to_close}
            onChange={(v) => update({ cash_to_close: v })}
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] text-gray-600 font-medium">Other fees</p>
          <button
            onClick={addOtherFee}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
          >
            + Add
          </button>
        </div>
        {form.other_fees.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic">No other fees.</p>
        ) : (
          <div className="space-y-1">
            {form.other_fees.map((f, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  placeholder="Description"
                  value={f.label}
                  onChange={(e) => updateOtherFee(i, { label: e.target.value })}
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="$0.00"
                  value={
                    f.amount
                      ? formatCurrencyInput(String(f.amount))
                      : ""
                  }
                  onChange={(e) =>
                    updateOtherFee(i, {
                      amount: parseFloat(unformatCurrency(e.target.value)) || 0,
                    })
                  }
                  className={`${inputCls} w-24`}
                />
                <button
                  onClick={() => removeOtherFee(i)}
                  className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="Notes">
        <input
          type="text"
          value={form.notes}
          onChange={(e) => update({ notes: e.target.value })}
          className={inputCls}
        />
      </Field>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={loading}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save Settlement
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-gray-600 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] text-gray-600 font-medium mb-1">
        {label}
        {hint && (
          <span className="ml-1 text-gray-400 font-normal">— {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        type="text"
        inputMode="decimal"
        placeholder="$0.00"
        value={value}
        onChange={(e) => onChange(formatCurrencyInput(e.target.value))}
        className={inputCls}
      />
    </Field>
  );
}
