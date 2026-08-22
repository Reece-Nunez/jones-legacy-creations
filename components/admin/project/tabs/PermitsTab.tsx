"use client";

import { useState } from "react";
import { Circle, Edit3, Paperclip, RefreshCw, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import type { Permit, PermitStatus } from "@/lib/types/database";
import { PERMIT_STATUS_COLORS } from "@/lib/types/database";
import { confirmAction } from "@/lib/confirmAction";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent, CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddButton, EmptyState } from "@/components/admin/project/shared/Primitives";
import { EditOnly } from "@/components/admin/project/shared/EditContext";
import { fmtDate } from "@/components/admin/project/shared/format";
import { permitLeftBorder } from "@/components/admin/project/shared/statusStyles";
import { PermitExtractionModal } from "@/components/admin/project/tabs/PermitExtractionModal";

export function PermitsTab({
  projectId,
  permits,
  mutate,
  loading,
  onPreview,
}: {
  projectId: string;
  permits: Permit[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
  onPreview: (url: string, name: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    permit_type: "",
    permit_number: "",
    status: "not_applied" as PermitStatus,
    applied_date: "",
    notes: "",
  });
  const [permitFile, setPermitFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);
  const [showExtractionModal, setShowExtractionModal] = useState(false);

  async function addPermit() {
    if (!form.permit_type) return;

    // If there's a file, upload it first
    let file_url: string | null = null;
    let file_name: string | null = null;
    if (permitFile) {
      const uploadFd = new FormData();
      uploadFd.append("file", permitFile);
      uploadFd.append("category", "permit");
      const uploadRes = await mutate(
        `/api/admin/projects/${projectId}/documents`,
        "POST",
        uploadFd,
      );
      if (uploadRes) {
        const uploadData = await uploadRes.json().catch(() => null);
        if (uploadData) {
          file_url = uploadData.file_url;
          file_name = permitFile.name;
        }
      }
    }

    await mutate(`/api/admin/projects/${projectId}/permits`, "POST", {
      permit_type: form.permit_type,
      permit_number: form.permit_number || null,
      status: form.status,
      applied_date: form.applied_date || null,
      notes: form.notes || null,
      file_url,
      file_name,
    });
    setForm({
      permit_type: "",
      permit_number: "",
      status: "not_applied",
      applied_date: "",
      notes: "",
    });
    setPermitFile(null);
    setShowForm(false);

    // If a file was uploaded, trigger AI extraction
    if (file_url) {
      setExtracting(true);
      try {
        const extractRes = await fetch(
          `/api/admin/projects/${projectId}/permits/extract`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file_url }),
          }
        );
        if (extractRes.ok) {
          const { extracted, current } = await extractRes.json();
          // Only suggest fields that have extracted values AND the project currently lacks
          const suggestions: Record<string, unknown> = {};
          const fieldKeys = [
            "square_footage", "stories", "bedrooms", "bathrooms",
            "garage_spaces", "finish_level", "lot_size", "project_type",
          ];
          for (const key of fieldKeys) {
            if (extracted[key] != null && (current?.[key] == null || current?.[key] === "")) {
              suggestions[key] = extracted[key];
            }
          }
          // Also fill permit_number if extracted and the permit we just created lacks it
          if (extracted.permit_number && !form.permit_number) {
            // Update the permit record with the extracted permit number
            const latestPermit = permits[0]; // permits are ordered desc
            if (latestPermit) {
              await mutate(
                `/api/admin/projects/${projectId}/permits/${latestPermit.id}`,
                "PATCH",
                { permit_number: extracted.permit_number }
              );
            }
          }
          if (Object.keys(suggestions).length > 0) {
            setExtractedData(suggestions);
            setShowExtractionModal(true);
          }
        }
      } catch (e) {
        console.error("Permit extraction failed:", e);
      } finally {
        setExtracting(false);
      }
    }
  }

  async function applyExtractedData(selectedFields: Record<string, unknown>) {
    await mutate(`/api/admin/projects/${projectId}`, "PATCH", selectedFields);
    setShowExtractionModal(false);
    setExtractedData(null);
    toast.success("Property details updated from permit");
  }

  const [editingPermit, setEditingPermit] = useState<string | null>(null);
  const [editPermitForm, setEditPermitForm] = useState({
    permit_type: "",
    permit_number: "",
    status: "not_applied" as PermitStatus,
    applied_date: "",
    approved_date: "",
    expiry_date: "",
    notes: "",
  });

  function startEditPermit(permit: Permit) {
    setEditingPermit(permit.id);
    setEditPermitForm({
      permit_type: permit.permit_type,
      permit_number: permit.permit_number || "",
      status: permit.status,
      applied_date: permit.applied_date ?? "",
      approved_date: permit.approved_date ?? "",
      expiry_date: permit.expiry_date ?? "",
      notes: permit.notes || "",
    });
  }

  async function saveEditPermit(id: string) {
    await mutate(`/api/admin/projects/${projectId}/permits/${id}`, "PATCH", {
      permit_type: editPermitForm.permit_type,
      permit_number: editPermitForm.permit_number || null,
      status: editPermitForm.status,
      applied_date: editPermitForm.applied_date || null,
      approved_date: editPermitForm.approved_date || null,
      expiry_date: editPermitForm.expiry_date || null,
      notes: editPermitForm.notes || null,
    });
    setEditingPermit(null);
  }

  async function updatePermitStatus(id: string, status: PermitStatus) {
    await mutate(`/api/admin/projects/${projectId}/permits/${id}`, "PATCH", {
      status,
      ...(status === "approved"
        ? { approved_date: new Date().toISOString().split("T")[0] }
        : {}),
    });
  }

  async function deletePermit(id: string) {
    if (!(await confirmAction("Delete this permit?"))) return;
    await mutate(`/api/admin/projects/${projectId}/permits/${id}`, "DELETE");
  }

  return (
    <>
    <ShadCard>
      <CardHeader>
        <CardTitle>Permits</CardTitle>
        {!showForm && (
          <CardAction>
            <AddButton label="Add Permit" onClick={() => setShowForm(true)} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <ShadCard className="mb-4 bg-gray-50 border-dashed">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="permit-type" className="block text-sm text-gray-700 font-medium mb-1">
                      Permit Type <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="permit-type"
                      placeholder="Permit Type"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.permit_type}
                      onChange={(e) =>
                        setForm({ ...form, permit_type: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="permit-number" className="block text-sm text-gray-700 font-medium mb-1">
                      Permit Number
                    </label>
                    <input
                      id="permit-number"
                      placeholder="Permit Number"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.permit_number}
                      onChange={(e) =>
                        setForm({ ...form, permit_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="permit-status" className="block text-sm text-gray-700 font-medium mb-1">
                      Status
                    </label>
                    <select
                      id="permit-status"
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as PermitStatus })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                    >
                      <option value="not_applied">Not Applied</option>
                      <option value="applied">Applied</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="permit-date" className="block text-sm text-gray-700 font-medium mb-1">
                      Applied Date
                    </label>
                    <input
                      id="permit-date"
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.applied_date}
                      onChange={(e) =>
                        setForm({ ...form, applied_date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="permit-notes" className="block text-sm text-gray-700 font-medium mb-1">
                    Notes
                  </label>
                  <input
                    id="permit-notes"
                    placeholder="Notes"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">
                    Attach Permit PDF
                  </label>
                  <label className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm cursor-pointer hover:border-gray-400 transition-colors">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600 truncate">
                      {permitFile ? permitFile.name : "Choose file..."}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setPermitFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={loading}
                    onClick={addPermit}
                    className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-sm text-gray-600 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </ShadCard>
        )}

        {permits.length === 0 && !showForm && (
          <EmptyState label="No permits yet" />
        )}

        <div className="divide-y divide-gray-100">
          {permits.map((p) => (
            <div key={p.id}>
              {editingPermit === p.id ? (
                <div className="bg-gray-50 rounded-lg p-3 my-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Permit Type</label>
                      <input
                        value={editPermitForm.permit_type}
                        onChange={(e) => setEditPermitForm({ ...editPermitForm, permit_type: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Permit Number</label>
                      <input
                        value={editPermitForm.permit_number}
                        onChange={(e) => setEditPermitForm({ ...editPermitForm, permit_number: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Status</label>
                      <select
                        value={editPermitForm.status}
                        onChange={(e) => setEditPermitForm({ ...editPermitForm, status: e.target.value as PermitStatus })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                      >
                        <option value="not_applied">Not Applied</option>
                        <option value="applied">Applied</option>
                        <option value="approved">Approved</option>
                        <option value="denied">Denied</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Applied Date</label>
                      <input
                        type="date"
                        value={editPermitForm.applied_date}
                        onChange={(e) => setEditPermitForm({ ...editPermitForm, applied_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Approved Date</label>
                      <input
                        type="date"
                        value={editPermitForm.approved_date}
                        onChange={(e) => setEditPermitForm({ ...editPermitForm, approved_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={editPermitForm.expiry_date}
                        onChange={(e) => setEditPermitForm({ ...editPermitForm, expiry_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 font-medium mb-1">Notes</label>
                    <input
                      value={editPermitForm.notes}
                      onChange={(e) => setEditPermitForm({ ...editPermitForm, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={loading}
                      onClick={() => saveEditPermit(p.id)}
                      className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setEditingPermit(null)}
                      className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 border-l-4 pl-3 ${permitLeftBorder(p.status)}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {p.permit_type}
                      </span>
                      {p.permit_number && (
                        <span className="text-xs text-gray-500">
                          #{p.permit_number}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={`inline-flex items-center gap-1 rounded-full ${PERMIT_STATUS_COLORS[p.status]}`}
                      >
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {p.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.applied_date && <>Applied: {fmtDate(p.applied_date)}</>}
                      {p.approved_date && <> | Approved: {fmtDate(p.approved_date)}</>}
                      {p.expiry_date && <> | Expires: {fmtDate(p.expiry_date)}</>}
                    </div>
                    {p.file_url && (
                      <button
                        onClick={() => onPreview(fileDownloadUrl(p.file_url!), p.file_name || "Permit")}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5 transition-colors cursor-pointer"
                        aria-label={`Preview permit file for ${p.permit_type}`}
                      >
                        <Paperclip className="w-3 h-3" />
                        {p.file_name || "View PDF"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <EditOnly>
                    <select
                      disabled={loading}
                      value={p.status}
                      aria-label={`Change status for permit ${p.permit_type}`}
                      onChange={(e) =>
                        updatePermitStatus(p.id, e.target.value as PermitStatus)
                      }
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-black cursor-pointer transition-colors"
                    >
                      <option value="not_applied">Not Applied</option>
                      <option value="applied">Applied</option>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                      <option value="expired">Expired</option>
                    </select>
                    </EditOnly>
                    <EditOnly>
                    <button
                      disabled={loading}
                      aria-label={`Edit permit ${p.permit_type}`}
                      onClick={() => startEditPermit(p)}
                      className="text-gray-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={loading}
                      aria-label={`Delete permit ${p.permit_type}`}
                      onClick={() => deletePermit(p.id)}
                      className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    </EditOnly>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </ShadCard>

    {/* AI Extraction loading banner */}
    {extracting && (
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
        <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
        <span className="text-sm font-medium text-indigo-700">
          Analyzing permit with AI...
        </span>
      </div>
    )}

    {/* AI Extraction confirmation modal */}
    {showExtractionModal && extractedData && (
      <PermitExtractionModal
        extractedData={extractedData}
        onConfirm={applyExtractedData}
        onCancel={() => {
          setShowExtractionModal(false);
          setExtractedData(null);
        }}
      />
    )}
    </>
  );
}
