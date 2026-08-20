"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Upload,
  Loader2,
  Edit3,
  Trash2,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CompanyInsuranceDocument } from "@/lib/types/database";
import {
  expiryStatus,
  daysUntilExpiration,
  businessToday,
  type ExpiryStatus,
} from "@/lib/insurance/expiryStatus";

// Status drives both the card chrome and the summary banner, so keep the
// lookup in one place rather than re-deriving classes per call site.
const STATUS_STYLES: Record<ExpiryStatus, { border: string; icon: string }> = {
  expired: { border: "border-red-200 bg-red-50", icon: "text-red-600" },
  expiring: { border: "border-amber-200 bg-amber-50", icon: "text-amber-600" },
  current: { border: "border-green-200 bg-green-50", icon: "text-green-600" },
  unknown: { border: "border-gray-200 bg-gray-50", icon: "text-gray-500" },
};

type EditForm = {
  insurance_company: string;
  policy_number: string;
  coverage_type: string;
  expiration_date: string;
  notes: string;
};

const EMPTY_FORM: EditForm = {
  insurance_company: "",
  policy_number: "",
  coverage_type: "",
  expiration_date: "",
  notes: "",
};

export default function CompanyInsurance({
  initialDocs,
}: {
  initialDocs: CompanyInsuranceDocument[];
}) {
  const [docs, setDocs] = useState(initialDocs);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_FORM);

  // Pinned to Utah rather than `new Date()` so SSR and the browser agree —
  // see businessToday().
  const today = businessToday();
  const expiredCount = docs.filter(
    (d) => expiryStatus(d.expiration_date, today) === "expired",
  ).length;
  const expiringCount = docs.filter(
    (d) => expiryStatus(d.expiration_date, today) === "expiring",
  ).length;

  async function upload(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/company/insurance", {
        method: "POST",
        body,
      });
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      setDocs((prev) => [...prev, result.document]);
      toast.success(
        result.ai_extracted?.insurance_company
          ? `Uploaded — extracted ${result.ai_extracted.insurance_company}`
          : "Uploaded",
      );
    } catch {
      toast.error("Failed to upload insurance");
    } finally {
      setUploading(false);
    }
  }

  function startEdit(doc: CompanyInsuranceDocument) {
    setEditingId(doc.id);
    setEditForm({
      insurance_company: doc.insurance_company ?? "",
      policy_number: doc.policy_number ?? "",
      coverage_type: doc.coverage_type ?? "",
      expiration_date: doc.expiration_date ?? "",
      notes: doc.notes ?? "",
    });
  }

  async function save(docId: string) {
    try {
      const res = await fetch(`/api/admin/company/insurance/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setDocs((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      setEditingId(null);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    }
  }

  async function remove(docId: string) {
    const doc = docs.find((d) => d.id === docId);
    if (!doc) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      toast(
        (t) => (
          <div className="flex items-center gap-2">
            <span>Delete {doc.insurance_company || doc.file_name}?</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-800 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        ),
        { duration: Infinity },
      );
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/company/insurance/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success("Insurance removed");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Liability Insurance
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Jones Legacy Creations&apos; own coverage — general liability,
            workers comp, commercial auto, umbrella. Upload a certificate and
            AI will read the carrier, policy&nbsp;#, and expiration.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-black px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50">
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Upload Policy
            </>
          )}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {(expiredCount > 0 || expiringCount > 0) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {expiredCount > 0 && (
              <strong>
                {expiredCount} expired {expiredCount === 1 ? "policy" : "policies"}
              </strong>
            )}
            {expiredCount > 0 && expiringCount > 0 && " · "}
            {expiringCount > 0 && (
              <>
                {expiringCount} expiring within 30 days
              </>
            )}
          </span>
        </div>
      )}

      <Card className="shadow-sm">
        <CardContent className="pt-6">
          {docs.length === 0 ? (
            <div className="py-12 text-center">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                No insurance documents on file yet.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Upload a certificate of insurance to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => {
                const status = expiryStatus(doc.expiration_date, today);
                const days = daysUntilExpiration(doc.expiration_date, today);
                const isEditing = editingId === doc.id;
                const styles = STATUS_STYLES[status];
                const downloadHref = `/api/admin/company/insurance/${doc.id}/download`;

                return (
                  <div
                    key={doc.id}
                    className={`rounded-lg border px-4 py-3 ${styles.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <FileText
                        className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={downloadHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-sm font-medium text-gray-900 hover:underline"
                          >
                            {doc.insurance_company || doc.file_name}
                          </a>
                          {doc.coverage_type && (
                            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-700">
                              {doc.coverage_type}
                            </span>
                          )}
                          {status === "expired" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-medium text-white">
                              <AlertTriangle className="h-3 w-3" /> Expired
                            </span>
                          )}
                          {status === "expiring" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white">
                              <AlertTriangle className="h-3 w-3" /> {days}d left
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                          {doc.policy_number && (
                            <span>Policy #{doc.policy_number}</span>
                          )}
                          {doc.expiration_date && (
                            <span>Expires {doc.expiration_date}</span>
                          )}
                          <a
                            href={downloadHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-blue-600 hover:underline"
                          >
                            {doc.file_name}
                          </a>
                        </div>
                        {doc.notes && !isEditing && (
                          <p className="mt-1 text-xs text-gray-600">
                            {doc.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          aria-label={`Edit ${doc.insurance_company || doc.file_name}`}
                          title="Edit"
                          onClick={() =>
                            isEditing ? setEditingId(null) : startEdit(doc)
                          }
                          className={`cursor-pointer p-1 transition-colors ${isEditing ? "text-blue-600" : "text-gray-400 hover:text-blue-600"}`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label={`Delete ${doc.insurance_company || doc.file_name}`}
                          title="Delete"
                          onClick={() => remove(doc.id)}
                          className="cursor-pointer p-1 text-gray-400 transition-colors hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/60 pt-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-500">
                            Insurance Company
                          </label>
                          <input
                            value={editForm.insurance_company}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                insurance_company: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-500">
                            Coverage Type
                          </label>
                          <input
                            value={editForm.coverage_type}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                coverage_type: e.target.value,
                              }))
                            }
                            placeholder="General Liability, Workers Comp, etc."
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-500">
                            Policy #
                          </label>
                          <input
                            value={editForm.policy_number}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                policy_number: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-xs text-gray-500">
                            Expiration Date
                          </label>
                          <input
                            type="date"
                            value={editForm.expiration_date}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                expiration_date: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-0.5 block text-xs text-gray-500">
                            Notes
                          </label>
                          <input
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                notes: e.target.value,
                              }))
                            }
                            placeholder="Agent contact, renewal reminders, etc."
                            className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          />
                        </div>
                        <div className="flex gap-1.5 sm:col-span-2">
                          <button
                            onClick={() => save(doc.id)}
                            className="cursor-pointer rounded bg-black px-3 py-1 text-xs text-white hover:bg-gray-800"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="cursor-pointer rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
