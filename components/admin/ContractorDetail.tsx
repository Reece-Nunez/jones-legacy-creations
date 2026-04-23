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
  Send,
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
  "Exterior Finishes": "bg-lime-100 text-lime-700",
  Fencing: "bg-emerald-100 text-emerald-700",
  Other: "bg-gray-100 text-gray-600",
};

interface PaymentWithProject extends ContractorPayment {
  projects?: { id: string; name: string } | null;
}

interface ProjectAssignment {
  project_id: string;
  projects?: { id: string; name: string } | { id: string; name: string }[] | null;
}

interface ContractorDetailProps {
  contractor: Contractor;
  payments: PaymentWithProject[];
  allProjects: { id: string; name: string }[];
  projectAssignments: ProjectAssignment[];
}

export default function ContractorDetail({
  contractor: initialContractor,
  payments,
  allProjects,
  projectAssignments,
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
  const [insuranceUploading, setInsuranceUploading] = useState(false);
  const [editingInsuranceExp, setEditingInsuranceExp] = useState(false);
  const [insuranceExp, setInsuranceExp] = useState(contractor.insurance_expiration_date ?? "");
  const [linkingProject, setLinkingProject] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showDDModal, setShowDDModal] = useState(false);
  const [ddPreviewHtml, setDdPreviewHtml] = useState<string | null>(null);
  const [ddPreviewLoading, setDdPreviewLoading] = useState(false);
  const [ddSending, setDdSending] = useState(false);
  const [w9Syncing, setW9Syncing] = useState(false);
  const [w9Extracting, setW9Extracting] = useState(false);

  const isVendor = contractor.type === "vendor";
  const entityLabel = isVendor ? "Vendor" : "Contractor";

  const totalPaid = payments
    .filter((p) => p.status !== "pending")
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

  async function syncW9ToQBO() {
    try {
      const res = await fetch("/api/quickbooks/sync/w9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId: contractor.id }),
      });
      if (res.ok) {
        setContractor((prev) => ({ ...prev, w9_qbo_uploaded_at: new Date().toISOString() }));
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  async function extractW9ToQBO() {
    setW9Extracting(true);
    try {
      const res = await fetch(
        `/api/admin/contractors/${contractor.id}/extract-w9`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to extract W9 details");
        return;
      }
      setContractor((prev) => ({ ...prev, w9_qbo_extracted_at: new Date().toISOString() }));
      const { extracted } = data;
      const parts = [
        extracted.name,
        extracted.ein ? `EIN: ${extracted.ein}` : null,
        [extracted.city, extracted.state, extracted.zip].filter(Boolean).join(", "),
      ].filter(Boolean);
      toast.success(`QB updated — ${parts.join(" · ")}`);
    } catch {
      toast.error("Failed to extract W9 details");
    } finally {
      setW9Extracting(false);
    }
  }

  async function openDDInvite() {
    setShowDDModal(true);
    setDdPreviewHtml(null);
    setDdPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/contractors/${contractor.id}/dd-invite`);
      if (!res.ok) throw new Error("Failed to load preview");
      const html = await res.text();
      setDdPreviewHtml(html);
    } catch {
      toast.error("Failed to load email preview");
      setShowDDModal(false);
    } finally {
      setDdPreviewLoading(false);
    }
  }

  async function sendDDInvite() {
    setDdSending(true);
    try {
      const res = await fetch(`/api/admin/contractors/${contractor.id}/dd-invite`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      toast.success(`Direct deposit invite sent to ${contractor.email}`);
      setShowDDModal(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setDdSending(false);
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
    <>
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
                  {!isVendor && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      1099
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={contractor.email ? openDDInvite : undefined}
                disabled={!contractor.email}
                title={!contractor.email ? "Add an email to this contractor to send a direct deposit invite" : "Send direct deposit invite"}
                aria-label="Send direct deposit invite"
                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-50"
                style={{ minHeight: 44 }}
              >
                <Send className="h-4 w-4" />
                Invite DD
              </button>
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
        {!isVendor && contractor.w9_required === false && (
          <Card className="mb-8 shadow-sm">
            <CardContent className="pt-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                W9
              </h2>
              <p className="text-sm text-gray-400">W9 not required for this contractor.</p>
            </CardContent>
          </Card>
        )}
        {!isVendor && contractor.w9_required !== false && (
          <Card className="mb-8 shadow-sm">
            <CardContent className="pt-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                W9
              </h2>
              {contractor.w9_file_url ? (
                <div className="space-y-2">
                  {/* File row */}
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
                    <label className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 shrink-0">
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
                          await syncW9ToQBO();
                          toast.success("W9 updated");
                          // Fire-and-forget extraction — result shown via its own toast
                          extractW9ToQBO();
                        } catch {
                          toast.error("Failed to upload W9");
                        } finally {
                          setW9Uploading(false);
                        }
                      }}
                    />
                    </label>
                  </div>
                  {/* Action buttons + status badges row */}
                  <div className="flex items-center gap-3 flex-wrap px-1">
                    <button
                      onClick={async () => {
                        setW9Syncing(true);
                        try {
                          const res = await fetch("/api/quickbooks/sync/w9", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ contractorId: contractor.id }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error ?? "Upload failed");
                          setContractor((prev) => ({ ...prev, w9_qbo_uploaded_at: new Date().toISOString() }));
                          toast.success("W9 uploaded to QuickBooks");
                        } catch (err: unknown) {
                          toast.error(err instanceof Error ? err.message : "Failed to upload W9");
                        } finally {
                          setW9Syncing(false);
                        }
                      }}
                      disabled={w9Syncing}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#2CA01C] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e7a14] disabled:opacity-50 transition-colors"
                      title="Upload W9 to QuickBooks"
                    >
                      {w9Syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {w9Syncing ? "Uploading…" : "Send W9 to QB"}
                    </button>
                    <button
                      onClick={extractW9ToQBO}
                      disabled={w9Extracting}
                      className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      title="Extract name, EIN, and address from W9 and update QuickBooks"
                    >
                      {w9Extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      {w9Extracting ? "Reading…" : "Extract Info to QB"}
                    </button>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      {contractor.w9_qbo_uploaded_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-0.5 text-xs font-medium text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          W9 in QB
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-500 px-2.5 py-0.5 text-xs font-medium text-white">
                          W9 not sent to QB
                        </span>
                      )}
                      {contractor.w9_qbo_extracted_at ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-medium text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          Info in QB
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-white">
                          <AlertTriangle className="h-3 w-3" />
                          Info not extracted
                        </span>
                      )}
                    </div>
                  </div>
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
                        await syncW9ToQBO();
                        toast.success("W9 uploaded");
                        // Fire-and-forget extraction — result shown via its own toast
                        extractW9ToQBO();
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

        {/* Proof of Insurance */}
        {!isVendor && (
          <Card className="mb-8 shadow-sm">
            <CardContent className="pt-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Proof of Insurance
              </h2>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expDate = contractor.insurance_expiration_date
                  ? new Date(contractor.insurance_expiration_date)
                  : null;
                const isExpired = expDate ? expDate < today : false;
                const daysUntilExp = expDate
                  ? Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const expiringSoon = daysUntilExp !== null && daysUntilExp >= 0 && daysUntilExp <= 30;

                async function uploadInsurance(file: File) {
                  setInsuranceUploading(true);
                  try {
                    const supabase = createClient();
                    const storagePath = `${contractor.id}/insurance/${Date.now()}-${sanitizeFilename(file.name)}`;
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
                      body: JSON.stringify({
                        insurance_file_url: urlData.publicUrl,
                        insurance_file_name: file.name,
                      }),
                    });
                    if (!res.ok) throw new Error("Failed to update");
                    const updated = await res.json();
                    setContractor(updated);
                    toast.success("Insurance uploaded");
                  } catch {
                    toast.error("Failed to upload insurance");
                  } finally {
                    setInsuranceUploading(false);
                  }
                }

                async function saveInsuranceExp() {
                  try {
                    const res = await fetch(`/api/admin/contractors/${contractor.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ insurance_expiration_date: insuranceExp || null }),
                    });
                    if (!res.ok) throw new Error("Failed");
                    const updated = await res.json();
                    setContractor(updated);
                    setEditingInsuranceExp(false);
                    toast.success("Expiration updated");
                  } catch {
                    toast.error("Failed to update expiration");
                  }
                }

                return contractor.insurance_file_url ? (
                  <div className="space-y-2">
                    <div
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                        isExpired
                          ? "border-red-200 bg-red-50"
                          : expiringSoon
                          ? "border-amber-200 bg-amber-50"
                          : "border-green-200 bg-green-50"
                      }`}
                    >
                      <FileText
                        className={`h-5 w-5 shrink-0 ${
                          isExpired ? "text-red-600" : expiringSoon ? "text-amber-600" : "text-green-600"
                        }`}
                      />
                      <a
                        href={contractor.insurance_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 text-sm font-medium truncate underline underline-offset-2 ${
                          isExpired
                            ? "text-red-700 decoration-red-400 hover:text-red-900"
                            : expiringSoon
                            ? "text-amber-700 decoration-amber-400 hover:text-amber-900"
                            : "text-green-700 decoration-green-400 hover:text-green-900"
                        }`}
                      >
                        {contractor.insurance_file_name || "View insurance"}
                      </a>
                      <label className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 shrink-0">
                        {insuranceUploading ? "Uploading..." : "Replace"}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                          disabled={insuranceUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadInsurance(f);
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap px-1 text-xs">
                      <span className="text-gray-500">Expiration:</span>
                      {editingInsuranceExp ? (
                        <>
                          <input
                            type="date"
                            value={insuranceExp}
                            onChange={(e) => setInsuranceExp(e.target.value)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          />
                          <button
                            onClick={saveInsuranceExp}
                            className="rounded bg-black px-2 py-1 text-xs text-white hover:bg-gray-800"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingInsuranceExp(false);
                              setInsuranceExp(contractor.insurance_expiration_date ?? "");
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingInsuranceExp(true)}
                            className="font-medium text-gray-700 underline decoration-gray-300 underline-offset-2 hover:text-black"
                          >
                            {contractor.insurance_expiration_date ?? "Set expiration date"}
                          </button>
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-medium text-white">
                              <AlertTriangle className="h-3 w-3" />
                              Expired
                            </span>
                          )}
                          {expiringSoon && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-white">
                              <AlertTriangle className="h-3 w-3" />
                              Expires in {daysUntilExp} day{daysUntilExp === 1 ? "" : "s"}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <label
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-sm font-medium transition-colors ${
                      insuranceUploading
                        ? "border-gray-200 bg-gray-50"
                        : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50"
                    }`}
                    style={{ minHeight: 44 }}
                  >
                    {insuranceUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                        <span className="text-gray-500">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-gray-600" />
                        <span className="text-gray-700">Upload proof of insurance</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      disabled={insuranceUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadInsurance(f);
                      }}
                    />
                  </label>
                );
              })()}
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
          // Combine explicit assignments + payment-derived relationships
          const projectMap = new Map<string, { id: string; name: string; totalPaid: number; totalPending: number; paymentCount: number; assigned: boolean }>();

          // Add explicit assignments first
          for (const a of projectAssignments) {
            const proj = Array.isArray(a.projects) ? a.projects[0] : a.projects;
            if (!proj) continue;
            projectMap.set(proj.id, {
              id: proj.id,
              name: proj.name,
              totalPaid: 0,
              totalPending: 0,
              paymentCount: 0,
              assigned: true,
            });
          }

          // Add/merge payment-derived data
          for (const p of payments) {
            if (!p.projects) continue;
            const existing = projectMap.get(p.projects.id);
            if (existing) {
              existing.paymentCount++;
              if (p.status !== "pending") existing.totalPaid += p.amount || 0;
              else existing.totalPending += p.amount || 0;
            } else {
              projectMap.set(p.projects.id, {
                id: p.projects.id,
                name: p.projects.name,
                totalPaid: p.status !== "pending" ? (p.amount || 0) : 0,
                totalPending: p.status === "pending" ? (p.amount || 0) : 0,
                paymentCount: 1,
                assigned: false,
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
                      <div
                        key={proj.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-4"
                      >
                        <Link
                          href={`/admin/projects/${proj.id}`}
                          className="min-w-0 flex-1 transition-colors hover:opacity-80"
                        >
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {proj.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {proj.paymentCount} payment{proj.paymentCount !== 1 ? "s" : ""}
                          </p>
                        </Link>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
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
                          <button
                            onClick={async () => {
                              const confirmed = await new Promise<boolean>((resolve) => {
                                toast(
                                  (t) => (
                                    <div className="flex flex-col gap-3">
                                      <p className="text-sm font-medium">Unlink {proj.name} from this contractor?</p>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => { toast.dismiss(t.id); resolve(true); }}
                                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                                        >
                                          Yes, Unlink
                                        </button>
                                        <button
                                          onClick={() => { toast.dismiss(t.id); resolve(false); }}
                                          className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ),
                                  { duration: Infinity }
                                );
                              });
                              if (!confirmed) return;
                              try {
                                const res = await fetch(`/api/admin/contractors/${contractor.id}/unlink-project`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ project_id: proj.id }),
                                });
                                if (!res.ok) throw new Error("Failed");
                                toast.success("Project unlinked");
                                router.refresh();
                              } catch {
                                toast.error("Failed to unlink project");
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                            aria-label={`Unlink ${proj.name}`}
                            title="Unlink project"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
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
                          // Create the assignment in the junction table
                          const res = await fetch(`/api/admin/contractors/${contractor.id}/link-project`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ project_id: selectedProjectId }),
                          });
                          if (!res.ok) throw new Error("Failed to link");

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
                          payment.status !== "pending"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {payment.status !== "pending" ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {payment.status !== "pending" ? "Paid" : "Pending"}
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
                            payment.status !== "pending"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {payment.status !== "pending" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {payment.status !== "pending" ? "Paid" : "Pending"}
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

    {/* Direct Deposit Invite Modal */}
    {showDDModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: "90vh" }}>
          {/* Modal header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Direct Deposit Invite</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Preview the email that will be sent to {contractor.email}
              </p>
            </div>
            <button
              onClick={() => setShowDDModal(false)}
              aria-label="Close"
              className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Email preview */}
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {ddPreviewLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : ddPreviewHtml ? (
              <iframe
                srcDoc={ddPreviewHtml}
                title="Email Preview"
                className="w-full rounded-lg border border-gray-200"
                style={{ height: 480 }}
              />
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              onClick={() => setShowDDModal(false)}
              className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              style={{ minHeight: 44 }}
            >
              Cancel
            </button>
            <button
              onClick={sendDDInvite}
              disabled={ddSending || ddPreviewLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              style={{ minHeight: 44 }}
            >
              {ddSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {ddSending ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
