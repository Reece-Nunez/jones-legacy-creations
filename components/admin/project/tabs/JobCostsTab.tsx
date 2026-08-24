"use client";

import { useState } from "react";
import { Fuel } from "lucide-react";
import toast from "react-hot-toast";
import type { ProjectMiscCharge } from "@/lib/types/database";
import { confirmAction } from "@/lib/confirmAction";
import {
  formatCurrency as fmt, formatCurrencyInput, unformatCurrency,
} from "@/lib/formatters";
import {
  Card as ShadCard, CardHeader, CardTitle, CardDescription, CardContent, CardAction,
} from "@/components/ui/card";
import { AddButton, EmptyState } from "@/components/admin/project/shared/Primitives";
import { EditOnly } from "@/components/admin/project/shared/EditContext";
import { fmtDate } from "@/components/admin/project/shared/format";

/**
 * Project spend that arrives with no contractor and no budget line: fuel,
 * equipment rental, dump fees. Backed by project_misc_charges, which also
 * still holds the one-off lender items it was originally written for (buyer
 * rate buy-downs, late fees).
 *
 * Was a collapsed one-line link on the project overview, gated on the project
 * having both a sale price and a loan amount. Two problems: a client build
 * with no construction loan could not reach it at all, and even where it did
 * render, a grey "+ Add misc charge" under the summary cards is not where
 * anyone looks to enter a cost. The table had zero rows in production.
 *
 * Now a panel under Money, beside Payments — the other money-out list.
 *
 * The total feeds allInCosts, so anything entered here moves the Costs and
 * Gross Profit figures on the overview. See lib/finance/project-financials.ts.
 */
export function JobCostsTab({
  projectId,
  charges,
  mutate,
  loading,
}: {
  projectId: string;
  charges: ProjectMiscCharge[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    description: "",
    amount: "",
    charge_date: "",
    category: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    description: "",
    amount: "",
    charge_date: "",
    category: "",
  });

  const total = charges.reduce((s, c) => s + Number(c.amount || 0), 0);

  async function addCharge() {
    if (!addForm.description.trim() || !addForm.amount) {
      toast.error("Description and amount are required");
      return;
    }
    const amount = parseFloat(unformatCurrency(addForm.amount));
    if (!(amount > 0)) {
      toast.error("Amount must be greater than zero");
      return;
    }
    await mutate(`/api/admin/projects/${projectId}/misc-charges`, "POST", {
      description: addForm.description.trim(),
      amount,
      charge_date: addForm.charge_date || null,
      category: addForm.category.trim() || null,
    });
    setAddForm({ description: "", amount: "", charge_date: "", category: "" });
    setShowAdd(false);
  }

  function startEdit(c: ProjectMiscCharge) {
    setEditingId(c.id);
    setEditForm({
      description: c.description,
      amount: formatCurrencyInput(String(c.amount)),
      charge_date: c.charge_date ?? "",
      category: c.category ?? "",
    });
  }

  async function saveEdit(id: string) {
    if (!editForm.description.trim() || !editForm.amount) {
      toast.error("Description and amount are required");
      return;
    }
    await mutate(
      `/api/admin/projects/${projectId}/misc-charges/${id}`,
      "PATCH",
      {
        description: editForm.description.trim(),
        amount: parseFloat(unformatCurrency(editForm.amount)),
        charge_date: editForm.charge_date || null,
        category: editForm.category.trim() || null,
      },
    );
    setEditingId(null);
  }

  async function deleteCharge(id: string) {
    if (!(await confirmAction("Delete this job cost?"))) return;
    await mutate(`/api/admin/projects/${projectId}/misc-charges/${id}`, "DELETE");
  }

  return (
    <ShadCard>
      <CardHeader>
        <CardTitle>Job Costs</CardTitle>
        {charges.length > 0 && (
          <CardDescription>
            {`${charges.length} item${charges.length !== 1 ? "s" : ""} · ${fmt(total)}`}
          </CardDescription>
        )}
        {!showAdd && (
          <CardAction>
            <AddButton label="Add Cost" onClick={() => setShowAdd(true)} />
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="space-y-2">

        {showAdd && (
          <div className="bg-rose-50/40 border border-rose-200 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-gray-600 font-medium mb-1">
                  Description
                </label>
                <input
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="e.g. Fuel, excavator rental, dump fees"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 font-medium mb-1">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: formatCurrencyInput(e.target.value) })}
                  placeholder="$0.00"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={addForm.charge_date}
                  onChange={(e) => setAddForm({ ...addForm, charge_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 font-medium mb-1">Category (optional)</label>
                <input
                  value={addForm.category}
                  onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                  placeholder="e.g. fuel, rental, dump_fee"
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                disabled={loading}
                onClick={addCharge}
                className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Saving..." : "Save Cost"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="text-xs text-gray-600 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {charges.length === 0 && !showAdd ? (
          <EmptyState
            label="No job costs yet"
            icon={Fuel}
            hint="Fuel, equipment rental, dump fees — spend that never comes through a subcontractor invoice or a budget line. Anything logged here counts toward this project's Costs."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {charges.map((c) =>
              editingId === c.id ? (
                <div key={c.id} className="bg-gray-50 rounded-lg p-3 my-2 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Description</label>
                      <input
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Amount</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({ ...editForm, amount: formatCurrencyInput(e.target.value) })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Date</label>
                      <input
                        type="date"
                        value={editForm.charge_date}
                        onChange={(e) => setEditForm({ ...editForm, charge_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 font-medium mb-1">Category</label>
                      <input
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={loading}
                      onClick={() => saveEdit(c.id)}
                      className="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-600 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={c.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.description}
                    </p>
                    <p className="text-[11px] text-gray-500 flex flex-wrap items-center gap-1.5">
                      {c.charge_date && (
                        <span>{fmtDate(c.charge_date)}</span>
                      )}
                      {c.category && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 uppercase">
                          {c.category}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-sm font-semibold tabular-nums text-rose-700">
                      {fmt(Number(c.amount))}
                    </span>
                    <EditOnly>
                    <button
                      onClick={() => startEdit(c)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-500 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCharge(c.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-500 cursor-pointer"
                    >
                      Delete
                    </button>
                    </EditOnly>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {charges.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 pt-2 mt-2">
            <span className="text-xs font-semibold text-gray-700">Total</span>
            <span className="text-sm font-bold tabular-nums text-rose-700">
              {fmt(total)}
            </span>
          </div>
        )}
      </CardContent>
    </ShadCard>
  );
}
