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
  AlertTriangle,
  FileText,
  Store,
  Tag,
  Upload,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

/** Sanitize filename for Supabase Storage (strip brackets and special chars) */
const sanitizeFilename = (name: string) =>
  name.replace(/[\[\](){}#%&]/g, "").replace(/\s+/g, "_");

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
  Engineering: "bg-violet-100 text-violet-700",
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
  allProjects: { id: string; name: string }[];
}

export default function ContractorDetail({
  contractor: initialContractor,
  payments,
  allProjects,
}: ContractorDetailProps) {
  const router = useRouter();
  const [contractor, setContractor] = useState(initialContractor);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(contractor.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [w9Uploading, setW9Uploading] = useState(false);
  const [linkingProject, setLinkingProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const isVendor = contractor.type === "vendor";
  const entityLabel = isVendor ? "Vendor" : "Contractor";

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/contractors/${contractor.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`${entityLabel} deleted`);
      router.push("/admin/contractors");
      router.refresh();
    } catch {
      toast.error(`Failed to delete ${entityLabel.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
              Edit {entityLabel}
            </h1>
            <button
              onClick={() => setIsEditing(false)}
              aria-label="Cancel editing"
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
          Back to Contractors & Vendors
        </Link>

        {/* Header */}
        <Card className="mb-8 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                isVendor ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
              }`}>
                {isVendor ? <Store className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isVendor ? (contractor.company || contractor.name) : contractor.name}
                </h1>
                {isVendor ? (
                  contractor.company && contractor.name !== contractor.company && (
                    <p className="mt-0.5 text-gray-500">{contractor.name}</p>
                  )
                ) : (
                  contractor.company && (
                    <p className="mt-0.5 text-gray-500">{contractor.company}</p>
                  )
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isVendor ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700"
                    >
                      {contractor.vendor_category || "Vendor"}
                    </Badge>
                  ) : (
                    contractor.trade.split(", ").filter(Boolean).map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className={TRADE_COLORS[t] ?? TRADE_COLORS.Other}
                      >
                        {t}
                      </Badge>
                    ))
                  )}
                  <Badge variant="outline" className="bg-gray-50 text-gray-600">
                    {entityLabel}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                aria-label="Edit contractor"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                style={{ minHeight: 44 }}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Delete contractor"
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <Card className="mb-8 border-red-200 bg-red-50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">
                  Delete this {entityLabel.toLowerCase()}?
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  This will permanently remove {contractor.name} and cannot be undone.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                    style={{ minHeight: 44 }}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    style={{ minHeight: 44 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
          </Card>
        )}

        {/* Contact & Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Contact Info */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-3">
              {contractor.phone && (
                <a
                  href={`tel:${contractor.phone}`}
                  aria-label={`Call ${contractor.name} at ${contractor.phone}`}
                  className="flex items-center gap-3 rounded-lg p-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  style={{ minHeight: 44 }}
                >
                  <div className="rounded-lg bg-indigo-50 p-2">
                    <Phone className="h-5 w-5 text-indigo-500" />
                  </div>
                  <span className="text-indigo-600 underline decoration-indigo-300 underline-offset-2">
                    {contractor.phone}
                  </span>
                </a>
              )}
              {contractor.email && (
                <a
                  href={`mailto:${contractor.email}`}
                  aria-label={`Email ${contractor.name} at ${contractor.email}`}
                  className="flex items-center gap-3 rounded-lg p-3 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  style={{ minHeight: 44 }}
                >
                  <div className="rounded-lg bg-indigo-50 p-2">
                    <Mail className="h-5 w-5 text-indigo-500" />
                  </div>
                  <span className="text-indigo-600 underline decoration-indigo-300 underline-offset-2">
                    {contractor.email}
                  </span>
                </a>
              )}
              {!isVendor && contractor.license_number && (
                <div
                  className="flex items-center gap-3 p-3 text-sm text-gray-700"
                  style={{ minHeight: 44 }}
                >
                  <div className="rounded-lg bg-gray-50 p-2">
                    <Wrench className="h-5 w-5 text-gray-400" />
                  </div>
                  <span>License: {contractor.license_number}</span>
                </div>
              )}
              {isVendor && contractor.account_number && (
                <div
                  className="flex items-center gap-3 p-3 text-sm text-gray-700"
                  style={{ minHeight: 44 }}
                >
                  <div className="rounded-lg bg-gray-50 p-2">
                    <Tag className="h-5 w-5 text-gray-400" />
                  </div>
                  <span>Account: {contractor.account_number}</span>
                </div>
              )}
              {!contractor.phone && !contractor.email && !contractor.license_number && !contractor.account_number && (
                <p className="text-sm text-gray-400">No contact info on file</p>
              )}
            </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-50 p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Paid</p>
                  <p className="text-xl font-bold tabular-nums text-green-600">
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
                  <p className="text-xl font-bold tabular-nums text-gray-900">
                    {formatCurrency(totalPending)}
                  </p>
                </div>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>

        {/* W9 — contractors only */}
        {!isVendor && (
          <Card className="mb-8 shadow-sm">
            <CardContent className="pt-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                W9
              </h2>
              {contractor.w9_file_url ? (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <FileText className="h-5 w-5 text-green-600 shrink-0" />
                  <a
                    href={contractor.w9_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm font-medium text-green-700 underline decoration-green-400 underline-offset-2 hover:text-green-900 truncate"
                  >
                    {contractor.w9_file_name || "View W9"}
                  </a>
                  <label className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    {w9Uploading ? "Uploading..." : "Replace"}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      disabled={w9Uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setW9Uploading(true);
                        try {
                          const supabase = createClient();
                          const storagePath = `${contractor.id}/${Date.now()}-${sanitizeFilename(file.name)}`;
                          const { error: uploadError } = await supabase.storage
                            .from("contractor-w9")
                            .upload(storagePath, file, { contentType: file.type });
                          if (uploadError) throw uploadError;
                          const { data: urlData } = supabase.storage
                            .from("contractor-w9")
                            .getPublicUrl(storagePath);
                          const res = await fetch(`/api/admin/contractors/${contractor.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ w9_file_url: urlData.publicUrl, w9_file_name: file.name }),
                          });
                          if (!res.ok) throw new Error("Failed to update");
                          const updated = await res.json();
                          setContractor(updated);
                          toast.success("W9 updated");
                        } catch {
                          toast.error("Failed to upload W9");
                        } finally {
                          setW9Uploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
              ) : (
                <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed ${
                  w9Uploading ? "border-gray-200 bg-gray-50" : "border-amber-300 bg-amber-50 hover:border-indigo-400 hover:bg-indigo-50"
                } px-4 py-4 text-sm font-medium transition-colors`}
                  style={{ minHeight: 44 }}
                >
                  {w9Uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <span className="text-gray-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-700">Upload W9 (required)</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    className="hidden"
                    disabled={w9Uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setW9Uploading(true);
                      try {
                        const supabase = createClient();
                        const storagePath = `${contractor.id}/${Date.now()}-${sanitizeFilename(file.name)}`;
                        const { error: uploadError } = await supabase.storage
                          .from("contractor-w9")
                          .upload(storagePath, file, { contentType: file.type });
                        if (uploadError) throw uploadError;
                        const { data: urlData } = supabase.storage
                          .from("contractor-w9")
                          .getPublicUrl(storagePath);
                        const res = await fetch(`/api/admin/contractors/${contractor.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ w9_file_url: urlData.publicUrl, w9_file_name: file.name }),
                        });
                        if (!res.ok) throw new Error("Failed to update");
                        const updated = await res.json();
                        setContractor(updated);
                        toast.success("W9 uploaded");
                      } catch {
                        toast.error("Failed to upload W9");
                      } finally {
                        setW9Uploading(false);
                      }
                    }}
                  />
                </label>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card className="mb-8 shadow-sm">
          <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Notes
            </h2>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                aria-label="Edit notes"
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
              <label htmlFor="contractor-notes" className="sr-only">
                Contractor notes
              </label>
              <textarea
                id="contractor-notes"
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
                  aria-label="Cancel editing notes"
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  style={{ minHeight: 44 }}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  aria-label="Save notes"
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
          </CardContent>
        </Card>

        {/* Associated Projects */}
        {(() => {
          // Derive projects from payments — if a contractor has a payment on a project, they're linked
          const projectMap = new Map<string, { id: string; name: string; totalPaid: number; totalPending: number; paymentCount: number }>();
          for (const p of payments) {
            if (!p.projects) continue;
            const existing = projectMap.get(p.projects.id);
            if (existing) {
              existing.paymentCount++;
              if (p.status === "paid") existing.totalPaid += p.amount || 0;
              else existing.totalPending += p.amount || 0;
            } else {
              projectMap.set(p.projects.id, {
                id: p.projects.id,
                name: p.projects.name,
                totalPaid: p.status === "paid" ? (p.amount || 0) : 0,
                totalPending: p.status !== "paid" ? (p.amount || 0) : 0,
                paymentCount: 1,
              });
            }
          }
          const linkedProjects = Array.from(projectMap.values());
          const linkedProjectIds = new Set(linkedProjects.map((p) => p.id));
          const unlinkableProjects = allProjects.filter((p) => !linkedProjectIds.has(p.id));

          return (
            <Card className="mb-8 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Projects ({linkedProjects.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {linkedProjects.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {linkedProjects.map((proj) => (
                      <Link
                        key={proj.id}
                        href={`/admin/projects/${proj.id}`}
                        className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-4 transition-colors hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {proj.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {proj.paymentCount} payment{proj.paymentCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {proj.totalPaid > 0 && (
                            <p className="text-sm font-medium tabular-nums text-green-600">
                              {formatCurrency(proj.totalPaid)} paid
                            </p>
                          )}
                          {proj.totalPending > 0 && (
                            <p className="text-xs tabular-nums text-gray-500">
                              {formatCurrency(proj.totalPending)} pending
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {linkedProjects.length === 0 && (
                  <p className="text-sm text-gray-400 mb-4">No projects linked yet.</p>
                )}
                {/* Manual link project */}
                {linkingProject ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                      style={{ minHeight: 44 }}
                    >
                      <option value="">Select a project...</option>
                      {unlinkableProjects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      disabled={!selectedProjectId}
                      onClick={async () => {
                        if (!selectedProjectId) return;
                        try {
                          // Create a $0 payment record to establish the link
                          const res = await fetch(`/api/admin/projects/${selectedProjectId}/payments`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              contractor_id: contractor.id,
                              contractor_name: contractor.company || contractor.name,
                              description: `Assigned to project`,
                              amount: 0,
                              status: "pending",
                            }),
                          });
                          if (!res.ok) throw new Error("Failed to link");

                          // Also update any unlinked payments/documents on this project that match by name
                          await fetch(`/api/admin/contractors/${contractor.id}/link-project`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ project_id: selectedProjectId }),
                          }).catch(() => {});

                          toast.success("Project linked");
                          setLinkingProject(false);
                          setSelectedProjectId("");
                          router.refresh();
                        } catch {
                          toast.error("Failed to link project");
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                      style={{ minHeight: 44 }}
                    >
                      Link
                    </button>
                    <button
                      onClick={() => { setLinkingProject(false); setSelectedProjectId(""); }}
                      className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                      style={{ minHeight: 44 }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setLinkingProject(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    style={{ minHeight: 44 }}
                  >
                    <Plus className="h-4 w-4" />
                    Link to Project
                  </button>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Payment History */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>

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
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          payment.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {payment.status === "paid" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {payment.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                    {payment.description && (
                      <p className="mb-1 text-sm text-gray-500">
                        {payment.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold tabular-nums text-gray-900">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-xs tabular-nums text-gray-400">
                        {formatDate(payment.paid_date ?? payment.due_date ?? payment.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <table className="hidden w-full sm:table" role="table">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <th scope="col" className="pb-3 pr-4">Project</th>
                    <th scope="col" className="pb-3 pr-4">Description</th>
                    <th scope="col" className="pb-3 pr-4">Amount</th>
                    <th scope="col" className="pb-3 pr-4">Status</th>
                    <th scope="col" className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((payment, index) => (
                    <tr key={payment.id} className={`text-sm ${index % 2 === 1 ? "bg-gray-50/50" : ""}`}>
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
                      <td className="py-3 pr-4 font-medium tabular-nums text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            payment.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {payment.status === "paid" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {payment.status === "paid" ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td className="py-3 tabular-nums text-gray-500">
                        {formatDate(payment.paid_date ?? payment.due_date ?? payment.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
