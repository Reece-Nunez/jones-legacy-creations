"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit3, Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
// `Document` must be imported explicitly: without it TypeScript silently
// resolves it to the DOM global and every property access is wrong.
import type { BudgetLineItem, ContractorPayment, Document } from "@/lib/types/database";
import { DEFAULT_BUDGET_LINE_ITEMS } from "@/lib/types/database";
import { confirmAction } from "@/lib/confirmAction";
import { formatCurrency as fmt } from "@/lib/formatters";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/admin/project/shared/Primitives";
import { EditOnly } from "@/components/admin/project/shared/EditContext";

type DraftRow = {
  key: string;
  /** null for a line that doesn't exist in the database yet. */
  id: string | null;
  line_number: string;
  description: string;
  amount: string;
};

let draftKeySeq = 0;
function nextDraftKey() {
  draftKeySeq += 1;
  return `new-${draftKeySeq}`;
}

export function BudgetTab({
  projectId,
  budgetLineItems,
  payments,
  documents,
}: {
  projectId: string;
  budgetLineItems: BudgetLineItem[];
  payments: ContractorPayment[];
  documents: Document[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  // The budget is edited as a whole list, not cell by cell: rows can be added,
  // renumbered, retitled and removed in one pass, and Save posts the result as
  // the complete list. `key` exists only to keep React rows stable while
  // line_number is being typed in.
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  const hasBudget = budgetLineItems.length > 0;

  // Parse a line item number from a filename like "5_Slab_Invoice_..." or "6a_Plumbing_..."
  function parseLineNumFromFilename(filename: string | null): string | null {
    if (!filename) return null;
    const m = filename.match(/^(\d+[a-z]?)\s*[_ ]/i);
    return m ? m[1].toLowerCase() : null;
  }

  // Normalize line number for matching: "5A" → "5a", strip trailing letters for fallback
  function numericPart(s: string) { return s.replace(/[a-z]/gi, ""); }

  // Resolve the best matching budget line_number for a parsed filename number
  // e.g. "5" → "5a" (first budget item with numeric part "5"), "6a" → "6a" (exact)
  function resolveLine(parsed: string): string {
    const lower = parsed.toLowerCase();
    // Exact match first
    if (budgetLineItems.some(b => b.line_number.toLowerCase() === lower)) return lower;
    // Numeric prefix fallback — first budget line item with same digits
    const num = numericPart(lower);
    const fallback = budgetLineItems.find(b => numericPart(b.line_number) === num);
    return fallback ? fallback.line_number : lower;
  }

  // Build actual spent per line item.
  //
  // History: payments used to be matched to budget lines using a regex on
  // invoice_file_name (`^\d+[a-z]?[_ ]`) plus document.line_item_number
  // links. Manually-entered paid_personal payments with `image.jpg` or null
  // filenames silently disappeared from totalSpent — Peach Springs was off
  // by ~$30k. Now there's an explicit `budget_line_number` column on
  // contractor_payments that always wins, with the heuristics retained as
  // legacy fallback, and everything still unmatched lands in an
  // "Unassigned" pseudo-row so totalSpent === sum(contractor_payments).
  //
  // Source order (first match wins):
  //   0. payment.budget_line_number   ← explicit user assignment
  //   1. document.line_item_number    ← legacy document linking
  //   2. invoice filename regex       ← legacy naming convention
  //   3. unassigned                   ← visible bucket, captures the rest
  const spentByLine = new Map<string, number>();
  const countedPaymentIds = new Set<string>();
  const unassignedPayments: ContractorPayment[] = [];

  // Source 0 — explicit budget_line_number on the payment
  for (const payment of payments) {
    if (!payment.budget_line_number) continue;
    const key = resolveLine(payment.budget_line_number);
    spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
    countedPaymentIds.add(payment.id);
  }

  // Source 1 — document-linked payments
  for (const doc of documents) {
    if (doc.line_item_number == null) continue;
    const payment = payments.find((p) => p.invoice_file_url === doc.file_url);
    if (payment && !countedPaymentIds.has(payment.id)) {
      const key = resolveLine(doc.line_item_number);
      spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
      countedPaymentIds.add(payment.id);
    }
  }

  // Source 2 — payments not already counted, parse line number from invoice_file_name
  for (const payment of payments) {
    if (countedPaymentIds.has(payment.id)) continue;
    const parsed = parseLineNumFromFilename(payment.invoice_file_name);
    if (!parsed) continue;
    const key = resolveLine(parsed);
    spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
    countedPaymentIds.add(payment.id);
  }

  // Source 3 — anything still unmatched goes to the Unassigned bucket
  for (const payment of payments) {
    if (countedPaymentIds.has(payment.id)) continue;
    unassignedPayments.push(payment);
  }
  const unassignedTotal = unassignedPayments.reduce(
    (s, p) => s + Number(p.amount || 0),
    0,
  );

  // Use budget line items if they exist, otherwise show defaults
  const lineItems = hasBudget
    ? budgetLineItems
    : DEFAULT_BUDGET_LINE_ITEMS.map((d) => ({
        ...d,
        id: "",
        project_id: projectId,
        budgeted_amount: 0,
        notes: null,
        is_owner_purchase: false,
        owner_purchased: false,
        created_at: "",
        updated_at: "",
      }));

  // Owner-purchase items: optimistic toggle state seeded from DB
  const [ownerPurchased, setOwnerPurchased] = useState<Record<string, boolean>>(
    () => Object.fromEntries(budgetLineItems.map((i) => [i.id, i.owner_purchased ?? false]))
  );

  async function toggleOwnerPurchased(item: BudgetLineItem) {
    const next = !ownerPurchased[item.id];
    setOwnerPurchased((prev) => ({ ...prev, [item.id]: next }));
    await fetch(`/api/admin/projects/${projectId}/budget`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line_item_id: item.id, owner_purchased: next }),
    });
  }

  // Owner-purchased items with no invoice count at their budgeted amount
  for (const item of lineItems) {
    if (ownerPurchased[item.id] && !spentByLine.has(item.line_number)) {
      spentByLine.set(item.line_number, item.budgeted_amount || 0);
    }
  }

  // While editing, the summary tiles track what's typed rather than what's
  // saved, so adding or deleting a line shows its effect before you commit.
  const totalBudgeted = editing
    ? draft.reduce((s, r) => s + (parseFloat(r.amount || "0") || 0), 0)
    : lineItems.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  // Includes the unassigned bucket so this equals sum(contractor_payments) —
  // critical for matching the FinancialSummary tile at the top of the page.
  const totalSpent =
    Array.from(spentByLine.values()).reduce((s, v) => s + v, 0) + unassignedTotal;

  async function initializeBudget() {
    setSaving(true);
    try {
      await fetch(`/api/admin/projects/${projectId}/budget`, { method: "PUT" });
      router.refresh();
      toast.success("Budget initialized with default line items");
    } catch {
      toast.error("Failed to initialize budget");
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setDraft(
      lineItems.map((item) => ({
        key: item.id || `existing-${item.line_number}`,
        id: item.id || null,
        line_number: item.line_number,
        description: item.description,
        amount: item.budgeted_amount ? String(item.budgeted_amount) : "",
      })),
    );
    setEditing(true);
  }

  function updateDraftRow(key: string, patch: Partial<DraftRow>) {
    setDraft((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  /** Lowest whole number not already used, so "Add Line" lands somewhere sane. */
  function suggestLineNumber(rows: DraftRow[]) {
    const used = new Set(rows.map((r) => r.line_number.trim().toLowerCase()));
    let n = 1;
    while (used.has(String(n))) n += 1;
    return String(n);
  }

  function addDraftRow() {
    setDraft((rows) => [
      ...rows,
      { key: nextDraftKey(), id: null, line_number: suggestLineNumber(rows), description: "", amount: "" },
    ]);
  }

  async function removeDraftRow(row: DraftRow) {
    // Deleting a line that money is already charged against doesn't delete the
    // payments — they fall back into the Unassigned bucket — but the user
    // should know before the totals move around.
    const spent = spentByLine.get(row.line_number) || 0;
    if (spent > 0) {
      const confirmed = await confirmAction(
        `Line ${row.line_number} has ${fmt(spent)} charged to it. Remove the line anyway? Those payments will show as Unassigned.`,
      );
      if (!confirmed) return;
    }
    setDraft((rows) => rows.filter((r) => r.key !== row.key));
  }

  async function saveBudget() {
    // Caught here rather than server-side so the user isn't told which row is
    // wrong only after a round trip.
    const blank = draft.find((r) => !r.line_number.trim() || !r.description.trim());
    if (blank) {
      toast.error("Every line needs a number and a description.");
      return;
    }
    const seen = new Set<string>();
    for (const row of draft) {
      const key = row.line_number.trim().toLowerCase();
      if (seen.has(key)) {
        toast.error(`Line number "${row.line_number.trim()}" is used twice.`);
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draft.map((row) => ({
            id: row.id,
            line_number: row.line_number.trim(),
            description: row.description.trim(),
            budgeted_amount: parseFloat(row.amount || "0") || 0,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error || "Failed to save budget");
        return;
      }

      router.refresh();
      setEditing(false);
      toast.success("Budget saved");
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShadCard>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Budget vs Actual</CardTitle>
          <div className="flex gap-2">
            {!hasBudget && !editing && (
              <button
                onClick={initializeBudget}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                style={{ minHeight: 36 }}
              >
                <Plus className="w-3.5 h-3.5" />
                Set Up Budget
              </button>
            )}
            {hasBudget && !editing && (
              <EditOnly>
                <button
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Budget
                </button>
                <button
                  onClick={async () => {
                    const confirmed = await confirmAction("Delete the entire budget and start fresh? This cannot be undone.");
                    if (!confirmed) return;
                    setSaving(true);
                    try {
                      await fetch(`/api/admin/projects/${projectId}/budget`, { method: "DELETE" });
                      router.refresh();
                      toast.success("Budget deleted");
                    } catch {
                      toast.error("Failed to delete budget");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset
                </button>
              </EditOnly>
            )}
            {editing && (
              <>
                <button
                  onClick={saveBudget}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  {saving ? "Saving..." : "Save Budget"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasBudget && !editing ? (
          <EmptyState label="No budget set up yet — click 'Set Up Budget' to add the standard 29 line items" />
        ) : (
          <>
            {/* Summary bar */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-600">Total Budgeted</p>
                <p className="text-lg font-bold tabular-nums text-blue-900">{fmt(totalBudgeted)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-xs font-medium text-orange-600">Total Spent</p>
                <p className="text-lg font-bold tabular-nums text-orange-900">{fmt(totalSpent)}</p>
              </div>
              <div className={`rounded-lg p-3 ${totalBudgeted - totalSpent >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className={`text-xs font-medium ${totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalBudgeted - totalSpent >= 0 ? "Under Budget" : "Over Budget"}
                </p>
                <p className={`text-lg font-bold tabular-nums ${totalBudgeted - totalSpent >= 0 ? "text-green-900" : "text-red-900"}`}>
                  {fmt(Math.abs(totalBudgeted - totalSpent))}
                </p>
              </div>
            </div>

            {/* Overall progress bar */}
            {totalBudgeted > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100)}% of budget used</span>
                  <span>{fmt(totalBudgeted - totalSpent)} remaining</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      totalSpent / totalBudgeted > 1
                        ? "bg-red-500"
                        : totalSpent / totalBudgeted > 0.9
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="pb-2 pr-3 w-10">#</th>
                    <th className="pb-2 pr-3">Description</th>
                    <th className="pb-2 pr-3 text-right w-32">Budgeted</th>
                    <th className="pb-2 pr-3 text-right w-32">Spent</th>
                    <th className="pb-2 pr-3 text-center w-24">Owner</th>
                    <th className="pb-2 pr-3 text-right w-32">Remaining</th>
                    <th className="pb-2 w-40">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {editing &&
                    draft.map((row) => {
                      const spent = spentByLine.get(row.line_number) || 0;
                      return (
                        <tr key={row.key}>
                          <td className="py-2 pr-3">
                            <input
                              value={row.line_number}
                              onChange={(e) => updateDraftRow(row.key, { line_number: e.target.value })}
                              aria-label="Line number"
                              placeholder="#"
                              className="w-14 rounded border border-gray-300 px-2 py-1 text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={row.description}
                              onChange={(e) => updateDraftRow(row.key, { description: e.target.value })}
                              aria-label="Description"
                              placeholder="Description"
                              className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.amount}
                              onChange={(e) => updateDraftRow(row.key, { amount: e.target.value })}
                              aria-label={`Budget amount for line ${row.line_number}`}
                              placeholder="0.00"
                              className="w-full text-right rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            />
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-gray-500 text-xs">
                            {spent > 0 ? fmt(spent) : "--"}
                          </td>
                          <td className="py-2 pr-3" colSpan={2}></td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => removeDraftRow(row)}
                              aria-label={`Remove line ${row.line_number}`}
                              title="Remove this line"
                              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {editing && (
                    <tr>
                      <td colSpan={7} className="py-2">
                        <button
                          onClick={addDraftRow}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                          style={{ minHeight: 36 }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Line Item
                        </button>
                      </td>
                    </tr>
                  )}
                  {!editing && lineItems.map((item) => {
                    const budgeted = item.budgeted_amount || 0;
                    const spent = spentByLine.get(item.line_number) || 0;
                    const remaining = budgeted - spent;
                    const pctUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                    const overBudget = remaining < 0;
                    const isOwner = item.is_owner_purchase;
                    const isPurchased = ownerPurchased[item.id] ?? false;

                    return (
                      <tr key={item.line_number} className={`${overBudget ? "bg-red-50/50" : isPurchased ? "bg-amber-50/40" : ""}`}>
                        <td className="py-2.5 pr-3 text-xs text-gray-400 tabular-nums">{item.line_number}</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{item.description}</span>
                            {(isOwner || isPurchased) && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                                Owner Purchase
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          <span className="text-gray-700">{budgeted > 0 ? fmt(budgeted) : "--"}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700">
                          {isPurchased ? (
                            <span className="text-gray-400">--</span>
                          ) : (
                            <span>{spent > 0 ? fmt(spent) : "--"}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-center">
                          <button
                            onClick={() => item.id && toggleOwnerPurchased(item as BudgetLineItem)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                              isPurchased
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700"
                            }`}
                            title={isPurchased ? "Mark as not purchased" : "Mark as owner purchased"}
                          >
                            <div
                              className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                isPurchased ? "bg-green-500 border-green-500" : "border-gray-400"
                              }`}
                            >
                              {isPurchased && <Check className="w-2 h-2 text-white" />}
                            </div>
                            {isPurchased ? "Purchased" : "Owner?"}
                          </button>
                        </td>
                        <td className={`py-2.5 pr-3 text-right tabular-nums font-medium ${overBudget ? "text-red-600" : "text-green-600"}`}>
                          {isPurchased ? "--" : (budgeted > 0 || spent > 0 ? fmt(remaining) : "--")}
                        </td>
                        <td className="py-2.5">
                          {isPurchased ? (
                            budgeted > 0 ? (
                              <span className="text-xs text-green-600 font-medium">{fmt(budgeted)} counted</span>
                            ) : null
                          ) : budgeted > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pctUsed > 100 ? "bg-red-500" : pctUsed > 90 ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(pctUsed, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs tabular-nums w-10 text-right ${overBudget ? "text-red-600 font-bold" : "text-gray-500"}`}>
                                {Math.round(pctUsed)}%
                              </span>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Unassigned bucket — anything not matched to a budget
                   *  line by explicit assignment, document link, or filename
                   *  regex. Shown so totalSpent reflects every payment and
                   *  Blake can see what still needs categorizing. */}
                  {!editing && unassignedPayments.length > 0 && (
                    <tr className="bg-amber-50/60">
                      <td className="py-2.5 pr-3 text-xs text-amber-600 tabular-nums">—</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-amber-800">
                            Unassigned ({unassignedPayments.length} payment
                            {unassignedPayments.length !== 1 ? "s" : ""})
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide"
                            title="Assign these to a budget line on the Payments tab to remove them from this bucket"
                          >
                            Needs Line
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">--</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-amber-800 font-semibold">
                        {fmt(unassignedTotal)}
                      </td>
                      <td className="py-2.5 pr-3"></td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">--</td>
                      <td className="py-2.5"></td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-3 pr-3"></td>
                    <td className="py-3 pr-3 text-gray-900">TOTALS</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-900">{fmt(totalBudgeted)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-900">{fmt(totalSpent)}</td>
                    <td className="py-3 pr-3"></td>
                    <td className={`py-3 pr-3 text-right tabular-nums ${totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(totalBudgeted - totalSpent)}
                    </td>
                    <td className="py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden space-y-2">
              {editing &&
                draft.map((row) => {
                  const spent = spentByLine.get(row.line_number) || 0;
                  return (
                    <div key={row.key} className="rounded-lg border border-gray-200 p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <input
                          value={row.line_number}
                          onChange={(e) => updateDraftRow(row.key, { line_number: e.target.value })}
                          aria-label="Line number"
                          placeholder="#"
                          className="w-14 shrink-0 rounded border border-gray-300 px-2 py-2 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                        <input
                          value={row.description}
                          onChange={(e) => updateDraftRow(row.key, { description: e.target.value })}
                          aria-label="Description"
                          placeholder="Description"
                          className="flex-1 min-w-0 rounded border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                        <button
                          onClick={() => removeDraftRow(row)}
                          aria-label={`Remove line ${row.line_number}`}
                          className="shrink-0 text-gray-400 hover:text-red-500 p-2 cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 uppercase">Budget Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) => updateDraftRow(row.key, { amount: e.target.value })}
                          aria-label={`Budget amount for line ${row.line_number}`}
                          placeholder="0.00"
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 mt-1"
                        />
                      </div>
                      {spent > 0 && (
                        <p className="text-[11px] text-gray-500">{fmt(spent)} already charged to this line</p>
                      )}
                    </div>
                  );
                })}
              {editing && (
                <button
                  onClick={addDraftRow}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  style={{ minHeight: 44 }}
                >
                  <Plus className="w-4 h-4" />
                  Add Line Item
                </button>
              )}
              {!editing && lineItems.map((item) => {
                const budgeted = item.budgeted_amount || 0;
                const spent = spentByLine.get(item.line_number) || 0;
                const remaining = budgeted - spent;
                const pctUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                const overBudget = remaining < 0;
                const isOwner = item.is_owner_purchase;
                const isPurchased = ownerPurchased[item.id] ?? false;

                return (
                  <div
                    key={item.line_number}
                    className={`rounded-lg border p-3 ${overBudget ? "border-red-200 bg-red-50/30" : isPurchased ? "border-amber-200 bg-amber-50/30" : "border-gray-100"}`}
                  >
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          <span className="text-gray-400 mr-1.5">#{item.line_number}</span>
                          {item.description}
                        </span>
                        {(isOwner || isPurchased) && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                            Owner Purchase
                          </span>
                        )}
                      </div>
                      {!editing && (
                        <button
                          onClick={() => item.id && toggleOwnerPurchased(item as BudgetLineItem)}
                          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            isPurchased ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700"
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isPurchased ? "bg-green-500 border-green-500" : "border-gray-400"}`}>
                            {isPurchased && <Check className="w-2 h-2 text-white" />}
                          </div>
                          {isPurchased ? "Purchased" : "Owner?"}
                        </button>
                      )}
                    </div>
                    {!isPurchased ? (
                      <>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-500">Budget: {budgeted > 0 ? fmt(budgeted) : "--"}</span>
                          <span className="text-gray-500">Spent: {spent > 0 ? fmt(spent) : "--"}</span>
                          <span className={`font-semibold ${overBudget ? "text-red-600" : "text-green-600"}`}>
                            {budgeted > 0 || spent > 0 ? fmt(remaining) : ""}
                          </span>
                        </div>
                        {budgeted > 0 && (
                          <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pctUsed > 100 ? "bg-red-500" : pctUsed > 90 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(pctUsed, 100)}%` }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-gray-500 mt-1">
                        {budgeted > 0 ? `Budgeted: ${fmt(budgeted)}` : ""}{isPurchased ? " · counted toward total" : ""}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile: Unassigned bucket */}
              {!editing && unassignedPayments.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <span className="text-sm font-medium text-amber-800">
                      Unassigned ({unassignedPayments.length} payment
                      {unassignedPayments.length !== 1 ? "s" : ""})
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-amber-800">
                      {fmt(unassignedTotal)}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Assign on the Payments tab to remove from this bucket.
                  </p>
                </div>
              )}

              {/* Mobile totals */}
              {!editing && (
                <div className="rounded-lg border-2 border-gray-300 p-3 mt-3">
                  <p className="text-sm font-bold text-gray-900 mb-1">TOTALS</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Budget: {fmt(totalBudgeted)}</span>
                    <span className="text-gray-600">Spent: {fmt(totalSpent)}</span>
                    <span className={`font-bold ${totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(totalBudgeted - totalSpent)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom save buttons when editing */}
            {editing && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={saveBudget}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  style={{ minHeight: 44 }}
                >
                  {saving ? "Saving..." : "Save Budget"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: 44 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </ShadCard>
  );
}
