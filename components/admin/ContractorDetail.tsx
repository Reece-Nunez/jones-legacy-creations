"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Contractor, ContractorPayment, TRADES } from "@/lib/types/database";
import ContractorForm from "./ContractorForm";
import {
  ArrowLeft,
  Phone,
  Mail,
  Wrench,
  Building2,
  Pencil,
  Trash2,
  DollarSign,
  Clock,
  CheckCircle2,
  Save,
  X,
  Loader2,
} from "lucide-react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const TRADE_COLORS: Record<string, string> = {
  General: "bg-gray-100 text-gray-700",
  Plumbing: "bg-blue-100 text-blue-700",
  Electrical: "bg-yellow-100 text-yellow-800",
  HVAC: "bg-cyan-100 text-cyan-700",
  Framing: "bg-amber-100 text-amber-800",
  Roofing: "bg-red-100 text-red-700",
  Concrete: "bg-stone-200 text-stone-700",
  Drywall: "bg-slate-100 text-slate-700",
  Painting: "bg-purple-100 text-purple-700",
  Flooring: "bg-orange-100 text-orange-700",
  Landscaping: "bg-green-100 text-green-700",
  Excavation: "bg-amber-200 text-amber-900",
  "Steel/Welding": "bg-zinc-200 text-zinc-700",
  Cabinetry: "bg-rose-100 text-rose-700",
  Tile: "bg-teal-100 text-teal-700",
  Insulation: "bg-pink-100 text-pink-700",
  "Windows/Doors": "bg-indigo-100 text-indigo-700",
  Siding: "bg-lime-100 text-lime-700",
  Fencing: "bg-emerald-100 text-emerald-700",
  Other: "bg-gray-100 text-gray-600",
};

interface PaymentWithProject extends ContractorPayment {
  projects?: { id: string; name: string } | null;
}

interface ContractorDetailProps {
  contractor: Contractor;
  payments: PaymentWithProject[];
}

export default function ContractorDetail({
  contractor: initialContractor,
  payments,
}: ContractorDetailProps) {
  const router = useRouter();
  const [contractor, setContractor] = useState(initialContractor);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(contractor.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  async function handleDelete() {
    if (!confirm("Delete this contractor? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/contractors/${contractor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Contractor deleted");
      router.push("/admin/contractors");
      router.refresh();
    } catch {
      toast.error("Failed to delete contractor");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/contractors/${contractor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setContractor(updated);
      setEditingNotes(false);
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              Edit Contractor
            </h1>
            <button
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              style={{ minHeight: 44 }}
            >
              Cancel
            </button>
          </div>
          <ContractorForm
            contractor={contractor}
            onSuccess={() => {
              setIsEditing(false);
              router.refresh();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/admin/contractors"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contractors
        </Link>

        {/* Header */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {contractor.name}
                </h1>
                {contractor.company && (
                  <p className="mt-0.5 text-gray-500">{contractor.company}</p>
                )}
                <span
                  className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    TRADE_COLORS[contractor.trade] ?? TRADE_COLORS.Other
                  }`}
                >
                  {contractor.trade}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                style={{ minHeight: 44 }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Contact & Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Contact Info */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Contact Info
            </h2>
            <div className="space-y-3">
              {contractor.phone && (
                <a
                  href={`tel:${contractor.phone}`}
                  className="flex items-center gap-3 rounded-lg p-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  style={{ minHeight: 44 }}
                >
                  <Phone className="h-5 w-5 text-indigo-500" />
                  <span className="text-indigo-600 underline decoration-indigo-300 underline-offset-2">
                    {contractor.phone}
                  </span>
                </a>
              )}
              {contractor.email && (
                <a
                  href={`mailto:${contractor.email}`}
                  className="flex items-center gap-3 rounded-lg p-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  style={{ minHeight: 44 }}
                >
                  <Mail className="h-5 w-5 text-indigo-500" />
                  <span className="text-indigo-600 underline decoration-indigo-300 underline-offset-2">
                    {contractor.email}
                  </span>
                </a>
              )}
              {contractor.license_number && (
                <div
                  className="flex items-center gap-3 p-2 text-sm text-gray-700"
                  style={{ minHeight: 44 }}
                >
                  <Wrench className="h-5 w-5 text-gray-400" />
                  <span>License: {contractor.license_number}</span>
                </div>
              )}
              {!contractor.phone && !contractor.email && !contractor.license_number && (
                <p className="text-sm text-gray-400">No contact info on file</p>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Payment Summary
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(totalPaid)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-yellow-50 p-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Pending</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(totalPending)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Notes
            </h2>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                style={{ minHeight: 44 }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Add notes about this contractor..."
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setNotes(contractor.notes ?? "");
                    setEditingNotes(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  style={{ minHeight: 44 }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                  style={{ minHeight: 44 }}
                >
                  {savingNotes ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-gray-600">
              {contractor.notes || "No notes yet."}
            </p>
          )}
        </div>

        {/* Payment History */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Payment History
          </h2>

          {payments.length === 0 ? (
            <p className="text-sm text-gray-400">
              No payments recorded for this contractor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile: cards */}
              <div className="space-y-3 sm:hidden">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-lg border border-gray-100 p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      {payment.projects ? (
                        <Link
                          href={`/admin/projects/${payment.projects.id}`}
                          className="text-sm font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2"
                          style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
                        >
                          {payment.projects.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Unknown Project
                        </span>
                      )}
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          payment.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {payment.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                    {payment.description && (
                      <p className="mb-1 text-sm text-gray-500">
                        {payment.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(payment.paid_date ?? payment.due_date ?? payment.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <table className="hidden w-full sm:table">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th className="pb-3 pr-4">Project</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="text-sm">
                      <td className="py-3 pr-4">
                        {payment.projects ? (
                          <Link
                            href={`/admin/projects/${payment.projects.id}`}
                            className="font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800"
                          >
                            {payment.projects.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {payment.description || "-"}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            payment.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {payment.status === "paid" ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500">
                        {formatDate(payment.paid_date ?? payment.due_date ?? payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
