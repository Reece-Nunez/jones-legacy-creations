"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Save,
  User,
  Store,
} from "lucide-react";
import {
  ContractorType,
  TRADES,
  DEFAULT_VENDOR_CATEGORIES,
} from "@/lib/types/database";
import { formatPhoneNumber } from "@/lib/formatters";

interface BulkRow {
  id: string;
  type: ContractorType;
  name: string;
  company: string;
  email: string;
  phone: string;
  trade: string;
  vendor_category: string;
  account_number: string;
  license_number: string;
}

function emptyRow(): BulkRow {
  return {
    id: crypto.randomUUID(),
    type: "contractor",
    name: "",
    company: "",
    email: "",
    phone: "",
    trade: "",
    vendor_category: "",
    account_number: "",
    license_number: "",
  };
}

export default function BulkAddPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkType, setBulkType] = useState<ContractorType>("contractor");

  function addRows(count: number) {
    const newRows = Array.from({ length: count }, () => ({
      ...emptyRow(),
      type: bulkType,
    }));
    setRows((prev) => [...prev, ...newRows]);
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: string, field: keyof BulkRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function switchBulkType(type: ContractorType) {
    setBulkType(type);
    setRows((prev) => prev.map((r) => ({ ...r, type })));
  }

  async function handleSubmit() {
    // Filter to rows that have at least a name
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      toast.error("Add at least one entry with a name");
      return;
    }

    // Validate contractors have trades
    for (const r of validRows) {
      if (r.type === "contractor" && !r.trade) {
        toast.error(`"${r.name}" needs a trade selected`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        type: r.type,
        name: r.name.trim(),
        company: r.company.trim() || null,
        email: r.email.trim() || null,
        phone: r.phone.trim() || null,
        trade: r.type === "vendor" ? "Other" : r.trade,
        vendor_category: r.type === "vendor" ? (r.vendor_category || null) : null,
        account_number: r.type === "vendor" ? (r.account_number || null) : null,
        license_number: r.type === "contractor" ? (r.license_number || null) : null,
      }));

      const res = await fetch("/api/admin/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create entries");
      }

      const label = bulkType === "vendor" ? "vendors" : "contractors";
      toast.success(`${validRows.length} ${label} added`);
      router.push("/admin/contractors");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200";
  const selectClass = `${inputClass} appearance-none`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/admin/contractors"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contractors & Vendors
        </Link>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Add</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addRows(5)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              style={{ minHeight: 44 }}
            >
              <Plus className="h-4 w-4" />
              Add 5 Rows
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save All
            </button>
          </div>
        </div>

        {/* Type Toggle */}
        <div className="mb-6 flex rounded-lg border border-gray-300 overflow-hidden w-fit">
          {(["contractor", "vendor"] as ContractorType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => switchBulkType(t)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                bulkType === t
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              style={{ minHeight: 44 }}
            >
              {t === "contractor" ? <User className="h-4 w-4" /> : <Store className="h-4 w-4" />}
              {t === "contractor" ? "Contractors" : "Vendors"}
            </button>
          ))}
        </div>

        {/* Bulk Entry Table */}
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 w-8">
                    #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {bulkType === "vendor" ? "Contact Name" : "Name"} *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Company
                  </th>
                  {bulkType === "contractor" ? (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Trade *
                    </th>
                  ) : (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Category
                    </th>
                  )}
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Phone
                  </th>
                  {bulkType === "contractor" ? (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      License #
                    </th>
                  ) : (
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Account #
                    </th>
                  )}
                  <th className="px-3 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-sm text-gray-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder={bulkType === "vendor" ? "Rep name" : "John Smith"}
                        value={row.name}
                        onChange={(e) => updateRow(row.id, "name", e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder={bulkType === "vendor" ? "ABC Lumber" : "Smith LLC"}
                        value={row.company}
                        onChange={(e) => updateRow(row.id, "company", e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    {bulkType === "contractor" ? (
                      <td className="px-2 py-2">
                        <select
                          value={row.trade}
                          onChange={(e) => updateRow(row.id, "trade", e.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select...</option>
                          {TRADES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                    ) : (
                      <td className="px-2 py-2">
                        <select
                          value={row.vendor_category}
                          onChange={(e) => updateRow(row.id, "vendor_category", e.target.value)}
                          className={selectClass}
                        >
                          <option value="">Select...</option>
                          {DEFAULT_VENDOR_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="px-2 py-2">
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={row.email}
                        onChange={(e) => updateRow(row.id, "email", e.target.value)}
                        className={inputClass}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        placeholder="(435) 555-0100"
                        value={row.phone}
                        onChange={(e) => updateRow(row.id, "phone", formatPhoneNumber(e.target.value))}
                        className={inputClass}
                      />
                    </td>
                    {bulkType === "contractor" ? (
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="UT-12345"
                          value={row.license_number}
                          onChange={(e) => updateRow(row.id, "license_number", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                    ) : (
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="ACCT-123"
                          value={row.account_number}
                          onChange={(e) => updateRow(row.id, "account_number", e.target.value)}
                          className={inputClass}
                        />
                      </td>
                    )}
                    <td className="px-2 py-2">
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:text-red-500 min-h-[44px] min-w-[44px]"
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row button */}
          <div className="border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => addRows(1)}
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              style={{ minHeight: 44 }}
            >
              <Plus className="h-4 w-4" />
              Add Row
            </button>
          </div>
        </div>

        {/* Bottom save */}
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/admin/contractors"
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            style={{ minHeight: 44 }}
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save All ({rows.filter((r) => r.name.trim()).length})
          </button>
        </div>
      </div>
    </div>
  );
}
