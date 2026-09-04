"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Download, Eye, FolderOpen, Trash2 } from "lucide-react";
// `Document` must be imported explicitly: without it TypeScript silently
// resolves it to the DOM global and every property access is wrong.
import type { Document, DocumentCategory } from "@/lib/types/database";
import { confirmAction } from "@/lib/confirmAction";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent, CardAction,
} from "@/components/ui/card";
import SmartUpload from "@/components/admin/SmartUpload";
import DocumentFlagsPanel from "@/components/admin/project/DocumentFlagsPanel";
import { AddButton, EmptyState } from "@/components/admin/project/shared/Primitives";
import { EditOnly } from "@/components/admin/project/shared/EditContext";
import { fmtDate, fmtFileSize } from "@/components/admin/project/shared/format";
import {
  uploadProjectDocument,
  scanProjectDocument,
} from "@/lib/documents/upload-documents";
import type { ExtractedDocumentData } from "@/lib/extract-document";

// Stable toast ids so the per-file progress updates one toast instead of
// stacking sixteen of them.
const UPLOAD_TOAST = "documents-upload";
const SCAN_TOAST = "documents-scan";

export function DocumentsTab({
  projectId,
  documents,
  mutate,
  loading,
  onPreview,
}: {
  projectId: string;
  documents: Document[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
  onPreview: (url: string, name: string) => void;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("general");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /**
   * Read the documents that just landed, one request each.
   *
   * Sequential on purpose: each scan is two model calls, and firing sixteen at
   * once would rate-limit the batch rather than finish it sooner. A failure is
   * reported and skipped — the file is already stored, and the "Scan
   * documents" button catches up anything that missed its pass.
   */
  const scanStored = useCallback(
    async (stored: Array<{ id: string; file: File; aiData?: ExtractedDocumentData }>) => {
      let failures = 0;
      for (let i = 0; i < stored.length; i++) {
        toast.loading(
          `Reading ${i + 1} of ${stored.length} — ${stored[i].file.name}`,
          { id: SCAN_TOAST },
        );
        const { ok } = await scanProjectDocument(projectId, stored[i].id, {
          aiReviewedData: stored[i].aiData,
          autoCreatePayment: Boolean(stored[i].aiData),
        });
        if (!ok) failures++;
      }

      if (failures === 0) {
        toast.success(
          `Read ${stored.length} document${stored.length > 1 ? "s" : ""}`,
          { id: SCAN_TOAST },
        );
      } else {
        toast.error(
          `${failures} of ${stored.length} could not be read — use Scan documents to retry`,
          { id: SCAN_TOAST, duration: 8000 },
        );
      }
      router.refresh();
    },
    [projectId, router],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  }

  async function bulkDelete() {
    if (!(await confirmAction(`Delete ${selectedIds.size} documents?`))) return;
    for (const docId of selectedIds) {
      await mutate(`/api/admin/projects/${projectId}/documents/${docId}`, "DELETE");
    }
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  async function deleteDoc(id: string) {
    if (!(await confirmAction("Delete this document?"))) return;
    await mutate(`/api/admin/projects/${projectId}/documents/${id}`, "DELETE");
  }

  return (
    <div className="space-y-4">
    {/* What the AI found wrong, above the file list — the point is that it's
        seen before the documents are filed away and forgotten. */}
    <DocumentFlagsPanel key={documents.length} projectId={projectId} />

    <ShadCard>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        {!showForm && (
          <CardAction>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedIds(new Set());
                }}
                className={`text-xs px-3 py-1.5 min-h-[36px] rounded-lg border cursor-pointer transition-colors ${
                  selectMode
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {selectMode ? "Cancel Select" : "Select"}
              </button>
              <AddButton label="Upload Files" onClick={() => setShowForm(true)} alwaysShow />
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4 space-y-3">
            <div>
              <label htmlFor="doc-category-su" className="block text-sm text-gray-700 font-medium mb-1">
                Category for all files
              </label>
              <select
                id="doc-category-su"
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
              >
                <option value="general">General</option>
                <option value="contract">Contract</option>
                <option value="permit">Permit</option>
                <option value="invoice">Invoice</option>
                <option value="photo">Photo</option>
                <option value="plan">Plan</option>
                <option value="draw_request">Draw Request</option>
                <option value="change_order">Change Order</option>
                <option value="selection">Selection</option>
              </select>
            </div>
            <SmartUpload
              onUpload={async (uploadFiles, aiResults) => {
                // Phase one: get every file safely into storage. Nothing here
                // reads a document, so a 16-file batch finishes in seconds and
                // one bad file no longer takes the rest of the batch with it.
                const stored: Array<{ id: string; file: File; aiData?: ExtractedDocumentData }> = [];
                const failedFiles: File[] = [];

                for (let i = 0; i < uploadFiles.length; i++) {
                  const file = uploadFiles[i];
                  toast.loading(
                    `Uploading ${i + 1} of ${uploadFiles.length} — ${file.name}`,
                    { id: UPLOAD_TOAST },
                  );
                  const aiData = aiResults?.get(`${file.name}-${file.lastModified}`);
                  const outcome = await uploadProjectDocument(projectId, file, {
                    category,
                    vendor: aiData?.vendor_company || aiData?.vendor_name || null,
                    doc_type: aiData?.document_type || null,
                  });
                  if (outcome.documentId) {
                    stored.push({ id: outcome.documentId, file, aiData });
                  } else {
                    failedFiles.push(file);
                    toast.error(`${file.name}: ${outcome.error}`, { duration: 8000 });
                  }
                }

                toast.dismiss(UPLOAD_TOAST);
                setCategory("general");
                setShowForm(false);
                router.refresh();

                // Phase two: read them. Deliberately not awaited — the files
                // are already saved, so the uploader gets the tab back while
                // the slow part (two model calls per document) runs behind it.
                if (stored.length > 0) void scanStored(stored);

                return { uploaded: stored.length, failedFiles };
              }}
              showAiAnalyze={category === "invoice" || category === "draw_request"}
            />
            <button
              onClick={() => {
                setShowForm(false);
              }}
              className="text-sm text-gray-600 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
          </div>
        )}

        {documents.length === 0 && !showForm && (
          <EmptyState
            icon={FolderOpen}
            label="No documents yet"
            hint="Plans, permits, invoices and receipts live here. Uploads are scanned automatically so vendor and amount are filled in for you."
          />
        )}

        {/* Select All header */}
        {selectMode && documents.length > 0 && (
          <div className="flex items-center gap-3 py-2 border-b border-gray-200 mb-1">
            <input
              type="checkbox"
              checked={selectedIds.size === documents.length}
              onChange={toggleSelectAll}
              className="accent-blue-600 w-4 h-4 min-h-[44px] cursor-pointer"
              aria-label="Select all documents"
            />
            <span className="text-xs text-gray-500 font-medium">
              {selectedIds.size === documents.length ? "Deselect All" : "Select All"}
            </span>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleSelect(doc.id)}
                    className="accent-blue-600 w-4 h-4 shrink-0 cursor-pointer"
                    style={{ minHeight: 44, minWidth: 44 }}
                    aria-label={`Select ${doc.name}`}
                  />
                )}
                <div className="min-w-0">
                  <span className="font-medium text-sm text-gray-900">
                    {doc.name}
                  </span>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {doc.category} | {fmtFileSize(doc.file_size)} |{" "}
                    {fmtDate(doc.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label={`Preview ${doc.name}`}
                  onClick={() => onPreview(fileDownloadUrl(doc.file_url), doc.name)}
                  className="text-gray-600 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <a
                  href={fileDownloadUrl(doc.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Download ${doc.name}`}
                  className="text-gray-600 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
                <EditOnly>
                <button
                  disabled={loading}
                  aria-label={`Delete document ${doc.name}`}
                  onClick={() => deleteDoc(doc.id)}
                  className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                </EditOnly>
              </div>
            </div>
          ))}
        </div>

        {/* Floating action bar for bulk delete */}
        {selectMode && selectedIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center gap-4">
              <span className="text-sm text-gray-700 font-medium">
                {selectedIds.size} selected
              </span>
              <button
                disabled={loading}
                onClick={bulkDelete}
                className="bg-red-600 text-white px-4 py-2 min-h-[44px] rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
              >
                Delete Selected
              </button>
              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setSelectMode(false);
                }}
                className="text-sm text-gray-600 px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </ShadCard>
    </div>
  );
}
