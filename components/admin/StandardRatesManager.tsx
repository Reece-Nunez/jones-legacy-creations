"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Ruler, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { Contractor, StandardTradeRate } from "@/lib/types/database";
import { formatCurrency as fmt } from "@/lib/formatters";
import { confirmAction } from "@/lib/confirmAction";
import { costFromRate } from "@/lib/quotes/standard-rates";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/admin/project/shared/Primitives";

/**
 * Blake's cost basis: what each trade runs per square foot.
 *
 * The preview column is the point of the page. A rate on its own is hard to
 * sanity-check, but "$8.50/sqft = $20,400 on a 2,400 sqft home" is a number he
 * can recognise as right or wrong at a glance, so the preview size is editable
 * and applies to every row at once.
 */

type ContractorOption = Pick<Contractor, "id" | "name" | "company">;

type DraftRate = {
  trade_name: string;
  rate_per_sqft: string;
  contractor_id: string;
  contractor_note: string;
  notes: string;
};

const EMPTY_DRAFT: DraftRate = {
  trade_name: "",
  rate_per_sqft: "",
  contractor_id: "",
  contractor_note: "",
  notes: "",
};

export default function StandardRatesManager({
  initialRates,
  contractors,
}: {
  initialRates: StandardTradeRate[];
  contractors: ContractorOption[];
}) {
  const router = useRouter();
  const [rates, setRates] = useState(initialRates);
  const [previewSqft, setPreviewSqft] = useState("2400");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftRate>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftRate>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const sqft = Number(previewSqft.replace(/[,\s]/g, "")) || 0;
  const activeRates = rates.filter((r) => r.active);
  const previewTotal = activeRates.reduce(
    (sum, r) => sum + costFromRate(Number(r.rate_per_sqft), sqft),
    0,
  );

  async function reload() {
    const res = await fetch("/api/admin/standard-rates");
    if (res.ok) setRates(await res.json());
    router.refresh();
  }

  function draftToBody(d: DraftRate) {
    return {
      trade_name: d.trade_name,
      rate_per_sqft: d.rate_per_sqft,
      contractor_id: d.contractor_id || null,
      contractor_note: d.contractor_note,
      notes: d.notes,
    };
  }

  async function addRate() {
    if (!draft.trade_name.trim()) {
      toast.error("Trade name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/standard-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftToBody(draft)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Could not save the rate");
        return;
      }
      setDraft(EMPTY_DRAFT);
      setAdding(false);
      await reload();
      toast.success("Rate added");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(rate: StandardTradeRate) {
    setEditingId(rate.id);
    setEditDraft({
      trade_name: rate.trade_name,
      rate_per_sqft: String(rate.rate_per_sqft),
      contractor_id: rate.contractor_id ?? "",
      contractor_note: rate.contractor_note ?? "",
      notes: rate.notes ?? "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/standard-rates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...draftToBody(editDraft) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Could not save the rate");
        return;
      }
      setEditingId(null);
      await reload();
      toast.success("Rate updated");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rate: StandardTradeRate) {
    // Deactivating keeps the rate on file but stops it seeding new quotes,
    // which is what Blake wants when a sub's pricing is under review.
    const res = await fetch("/api/admin/standard-rates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: rate.id,
        trade_name: rate.trade_name,
        rate_per_sqft: rate.rate_per_sqft,
        contractor_id: rate.contractor_id,
        contractor_note: rate.contractor_note,
        notes: rate.notes,
        active: !rate.active,
      }),
    });
    if (!res.ok) {
      toast.error("Could not update the rate");
      return;
    }
    await reload();
  }

  async function deleteRate(rate: StandardTradeRate) {
    const confirmed = await confirmAction(
      `Delete the standard rate for ${rate.trade_name}? Quotes already built from it keep their numbers.`,
    );
    if (!confirmed) return;

    const res = await fetch(`/api/admin/standard-rates?id=${encodeURIComponent(rate.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Could not delete the rate");
      return;
    }
    await reload();
    toast.success("Rate deleted");
  }

  function contractorLabel(rate: StandardTradeRate) {
    if (rate.contractor) return rate.contractor.company || rate.contractor.name;
    return rate.contractor_note || null;
  }

  function draftFields(d: DraftRate, set: (next: DraftRate) => void) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <input
          value={d.trade_name}
          onChange={(e) => set({ ...d, trade_name: e.target.value })}
          placeholder="Trade (e.g. Plumbing)"
          aria-label="Trade name"
          className="rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={d.rate_per_sqft}
          onChange={(e) => set({ ...d, rate_per_sqft: e.target.value })}
          placeholder="$ / sqft"
          aria-label="Rate per square foot"
          className="rounded border border-gray-300 px-2 py-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
        <select
          value={d.contractor_id}
          onChange={(e) => set({ ...d, contractor_id: e.target.value })}
          aria-label="Contractor"
          className="rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
        >
          <option value="">Whose rate? (optional)</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company || c.name}
            </option>
          ))}
        </select>
        <input
          value={d.contractor_note}
          onChange={(e) => set({ ...d, contractor_note: e.target.value })}
          placeholder="…or type a name"
          aria-label="Contractor name"
          className="rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
        <input
          value={d.notes}
          onChange={(e) => set({ ...d, notes: e.target.value })}
          placeholder="Notes"
          aria-label="Notes"
          className="rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Standard Prices</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            What each trade runs per square foot. New quotes start from these numbers.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            style={{ minHeight: 40 }}
          >
            <Plus className="w-4 h-4" />
            Add Trade Rate
          </button>
        )}
      </div>

      {/* Preview size — makes a rate checkable at a glance. */}
      <ShadCard>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Ruler className="w-4 h-4 text-gray-400" />
            <label className="text-sm text-gray-600" htmlFor="preview-sqft">
              Preview at
            </label>
            <input
              id="preview-sqft"
              value={previewSqft}
              onChange={(e) => setPreviewSqft(e.target.value)}
              inputMode="numeric"
              className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            <span className="text-sm text-gray-600">sq ft</span>
            {activeRates.length > 0 && sqft > 0 && (
              <span className="text-sm text-gray-500">
                {activeRates.length} active rate{activeRates.length === 1 ? "" : "s"} ={" "}
                <span className="font-semibold text-gray-900 tabular-nums">{fmt(previewTotal)}</span>
                {" of a breakdown"}
              </span>
            )}
          </div>
        </CardContent>
      </ShadCard>

      {adding && (
        <ShadCard className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New trade rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {draftFields(draft, setDraft)}
            <div className="flex gap-2">
              <button
                onClick={addRate}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                style={{ minHeight: 36 }}
              >
                {saving ? "Saving..." : "Save Rate"}
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setDraft(EMPTY_DRAFT);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ minHeight: 36 }}
              >
                Cancel
              </button>
            </div>
          </CardContent>
        </ShadCard>
      )}

      <ShadCard>
        <CardContent className="pt-4">
          {rates.length === 0 ? (
            <EmptyState label="No standard rates yet — add the trades you price by square foot" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="pb-2 pr-3">Trade</th>
                    <th className="pb-2 pr-3 text-right w-28">$ / sqft</th>
                    <th className="pb-2 pr-3 text-right w-32">
                      At {sqft > 0 ? sqft.toLocaleString() : "--"} sqft
                    </th>
                    <th className="pb-2 pr-3">Whose rate</th>
                    <th className="pb-2 pr-3">Notes</th>
                    <th className="pb-2 w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rates.map((rate) => {
                    const whose = contractorLabel(rate);
                    if (editingId === rate.id) {
                      return (
                        <tr key={rate.id} className="bg-blue-50/50">
                          <td colSpan={6} className="py-3 px-1">
                            <div className="space-y-3">
                              {draftFields(editDraft, setEditDraft)}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(rate.id)}
                                  disabled={saving}
                                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                                  style={{ minHeight: 36 }}
                                >
                                  {saving ? "Saving..." : "Save"}
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                  style={{ minHeight: 36 }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={rate.id} className={rate.active ? "" : "opacity-50"}>
                        <td className="py-2.5 pr-3">
                          <span className="font-medium text-gray-900">{rate.trade_name}</span>
                          {!rate.active && (
                            <Badge variant="outline" className="ml-2 rounded-full text-[10px] text-gray-500">
                              Off
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700">
                          ${Number(rate.rate_per_sqft).toFixed(2)}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums font-medium text-gray-900">
                          {sqft > 0 ? fmt(costFromRate(Number(rate.rate_per_sqft), sqft)) : "--"}
                        </td>
                        <td className="py-2.5 pr-3 text-gray-600">{whose || "--"}</td>
                        <td className="py-2.5 pr-3 text-gray-500 text-xs">{rate.notes || ""}</td>
                        <td className="py-2.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => startEdit(rate)}
                            className="text-xs font-medium text-blue-600 hover:underline px-1.5 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleActive(rate)}
                            className="text-xs font-medium text-gray-500 hover:underline px-1.5 cursor-pointer"
                            title={rate.active ? "Stop using this rate on new quotes" : "Use this rate again"}
                          >
                            {rate.active ? "Turn off" : "Turn on"}
                          </button>
                          <button
                            onClick={() => deleteRate(rate)}
                            aria-label={`Delete ${rate.trade_name} rate`}
                            className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors align-middle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </ShadCard>
    </div>
  );
}
