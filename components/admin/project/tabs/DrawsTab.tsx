"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ArrowRightCircle, Banknote, ChevronDown, ChevronRight, Circle,
  Copy, Download, Edit3, Eye, FileSpreadsheet, LinkIcon, MessageSquare, Paperclip,
  Trash2,
  Receipt, RefreshCw, Send, Sparkles, Unlink, Upload, Wallet, X, XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import type {
  BudgetLineItem, Contractor, ContractorPayment, Document, DrawRequest,
  DrawRequestStatus, Project,
} from "@/lib/types/database";
import { DEFAULT_BUDGET_LINE_ITEMS, DRAW_STATUS_COLORS } from "@/lib/types/database";
import {
  formatCurrency as fmt, formatCurrencyInput, unformatCurrency,
} from "@/lib/formatters";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import { sumDrawAmounts } from "@/lib/finance/project-financials";
import { confirmAction } from "@/lib/confirmAction";
import { parseDrawFilename } from "@/lib/parse-draw-filename";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import QBOPayContractorModal from "@/components/admin/QBOPayContractorModal";
import { AddButton, EmptyState } from "@/components/admin/project/shared/Primitives";
import { EditOnly } from "@/components/admin/project/shared/EditContext";
import { fmtDate } from "@/components/admin/project/shared/format";
import { QBO_CONTRACTOR_PAYMENTS_ENABLED } from "@/components/admin/project/shared/constants";
import { drawLeftBorder, paymentLeftBorder } from "@/components/admin/project/shared/statusStyles";
import { usePaymentActions } from "@/components/admin/project/shared/usePaymentActions";
import { useInvoiceUploadLinks } from "@/components/admin/project/shared/useInvoiceUploadLinks";

export function DrawsTab({
  projectId,
  projectName,
  project,
  payments,
  draws,
  documents,
  contractors,
  budgetLineItems,
  mutate,
  loading,
  onPreview,
}: {
  projectId: string;
  projectName: string;
  project: Project;
  payments: ContractorPayment[];
  draws: DrawRequest[];
  documents: Document[];
  contractors: Contractor[];
  budgetLineItems: BudgetLineItem[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
  onPreview: (url: string, name: string) => void;
}) {
  const router = useRouter();
  const drawRequests = draws;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    draw_number: "",
    description: "",
    amount: "",
    status: "draft" as DrawRequestStatus,
    submitted_date: "",
    funded_date: "",
  });

  // Payment CRUD and the invoice-link subsystem are shared with PaymentsTab.
  // This file used to carry its own copy of all twelve handlers — the block
  // was labelled "merged from PaymentsTab" — so a fix applied to one tab and
  // not the other would make them disagree about the same payment.
  //
  // Aliased back to this file's original local names so the JSX is untouched.
  const {
    showForm: showPaymentForm, setShowForm: setShowPaymentForm,
    form: paymentForm, setForm: setPaymentForm,
    invoiceFile, setInvoiceFile,
    editingPayment, setEditingPayment,
    editPaymentForm, setEditPaymentForm,
    payModalPayment, setPayModalPayment,
    handleContractorChange,
    addPayment,
    startEditPayment,
    saveEditPayment,
    markAsPaid,
    markPaidFromDraw,
    uploadReceipt,
    deletePayment,
  } = usePaymentActions({ projectId, contractors, mutate });

  const {
    open: uploadLinksOpen, setOpen: setUploadLinksOpen,
    links: uploadLinks,
    contractorId: uploadLinkContractorId, setContractorId: setUploadLinkContractorId,
    loading: uploadLinkLoading,
    copiedTokenId,
    generate: generateUploadLink,
    deactivate: deactivateUploadLink,
    copy: copyUploadLink,
    text: textUploadLink,
  } = useInvoiceUploadLinks({ projectId, projectName, contractors });

  // ---- Payment row renderer (shared between unassigned card + draw tables)
  function renderPaymentRow(p: ContractorPayment) {
    if (editingPayment === p.id) {
      return (
        <div className="bg-gray-50 rounded-lg p-3 my-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Contractor Name</label>
              <input
                value={editPaymentForm.contractor_name}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, contractor_name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Amount</label>
              <input
                type="text"
                inputMode="decimal"
                value={editPaymentForm.amount}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: formatCurrencyInput(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Description</label>
              <input
                value={editPaymentForm.description}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={editPaymentForm.due_date}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, due_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 font-medium mb-1">Status</label>
              <select
                value={editPaymentForm.status}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
              >
                <option value="pending">Needs Draw</option>
                <option value="paid_personal">Paid Personal</option>
                <option value="reimbursed">Reimbursed</option>
                <option value="paid_from_draw">Paid</option>
              </select>
            </div>
            <div>
              {/* Budget line assignment — see PaymentsTab equivalent. */}
              <label className="block text-xs text-gray-600 font-medium mb-1">
                Budget Line
              </label>
              <select
                value={editPaymentForm.budget_line_number}
                onChange={(e) => setEditPaymentForm({ ...editPaymentForm, budget_line_number: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
              >
                <option value="">— Auto-detect / Unassigned —</option>
                {budgetLineItems.map((bli) => (
                  <option key={bli.id} value={bli.line_number}>
                    #{bli.line_number} · {bli.description}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={loading}
              onClick={() => saveEditPayment(p.id)}
              className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => setEditingPayment(null)}
              className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    const linkedDraw = p.draw_request_id ? drawRequests.find((d) => d.id === p.draw_request_id) : null;
    const drawFunded = linkedDraw?.status === "funded";

    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 border-l-4 pl-3 ${paymentLeftBorder(p.status)}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {p.contractor_id ? (
              <Link
                href={`/admin/contractors/${p.contractor_id}`}
                className="font-medium text-sm text-blue-600 hover:underline"
              >
                {p.contractor_name}
              </Link>
            ) : (
              <span className="font-medium text-sm text-gray-900">
                {p.contractor_name}
              </span>
            )}
            {p.status === "reimbursed" && (
              <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700" title={p.reimbursed_date ? `Reimbursed ${fmtDate(p.reimbursed_date)}` : undefined}>
                <Circle className="w-1.5 h-1.5 fill-current" />
                Reimbursed
              </Badge>
            )}
            {p.status === "paid_from_draw" && (
              <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700" title={p.paid_from_draw_date ? `Paid ${fmtDate(p.paid_from_draw_date)}${p.payment_method ? ` · ${p.payment_method}` : ""}` : undefined}>
                <Circle className="w-1.5 h-1.5 fill-current" />
                Paid
                {!p.receipt_file_url && <span className="ml-1 text-amber-700">(no receipt)</span>}
              </Badge>
            )}
            {p.status === "paid_personal" && (
              <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700" title="Blake paid from personal funds — awaiting reimbursement via draw">
                <Circle className="w-1.5 h-1.5 fill-current" />
                Paid Personal
              </Badge>
            )}
            {p.status === "pending" && !drawFunded && (
              <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700">
                <Circle className="w-1.5 h-1.5 fill-current" />
                Needs Draw
              </Badge>
            )}
            {p.status === "pending" && drawFunded && (
              <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800">
                <Circle className="w-1.5 h-1.5 fill-current" />
                Ready to Pay from Draw
              </Badge>
            )}
            {p.qbo_sync_error && (
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700"
                title={p.qbo_sync_error}
              >
                <AlertTriangle className="w-3 h-3" />
                QB Sync Failed
              </Badge>
            )}
          </div>
          {p.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {p.description}
            </p>
          )}
          {p.invoice_file_url && (
            <button
              onClick={() => onPreview(fileDownloadUrl(p.invoice_file_url!), p.invoice_file_name ?? "Invoice")}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5 cursor-pointer"
            >
              <Paperclip className="w-3 h-3" />
              {p.invoice_file_name ?? "Invoice"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span className="font-semibold text-gray-900 tabular-nums">
            {fmt(p.amount)}
          </span>
          <span className="text-gray-500 text-xs">
            Due {fmtDate(p.due_date)}
          </span>
          {(() => {
            if (p.status === "pending" && !drawFunded) {
              const pc = p.contractor_id ? contractors.find((c) => c.id === p.contractor_id) : null;
              const missingW9 = pc?.type !== "vendor" && pc?.w9_required && !pc?.w9_file_url;
              return (
                <>
                  {QBO_CONTRACTOR_PAYMENTS_ENABLED && (
                    <EditOnly>
                    <button
                      disabled={loading || !!missingW9}
                      onClick={() => setPayModalPayment({ id: p.id, contractor_name: p.contractor_name, amount: p.amount })}
                      className={`text-xs font-medium min-h-[44px] px-1 transition-colors ${missingW9 ? "text-gray-400 cursor-not-allowed opacity-50" : p.qbo_sync_error ? "text-red-600 hover:text-red-700 cursor-pointer" : "text-[#2CA01C] hover:text-[#1e7a14] cursor-pointer"}`}
                      title={missingW9 ? "W9 required — upload on the contractor page before paying" : p.qbo_sync_error ? `Last error: ${p.qbo_sync_error}` : "Pay this contractor via QuickBooks"}
                    >
                      {p.qbo_sync_error ? "Retry QB Sync" : "Pay Contractor"}
                    </button>
                    </EditOnly>
                  )}
                  <button
                    disabled={loading}
                    onClick={() => markAsPaid(p)}
                    className="text-xs text-indigo-600 hover:underline disabled:opacity-50 cursor-pointer min-h-[44px] px-1 transition-colors"
                    title="Mark as paid from Blake's personal funds"
                  >
                    Paid Personal
                  </button>
                </>
              );
            }
            if (p.status === "pending" && drawFunded) {
              return (
                <>
                  <button
                    disabled={loading}
                    onClick={() => markPaidFromDraw(p)}
                    className="text-xs text-green-700 hover:underline disabled:opacity-50 cursor-pointer min-h-[44px] px-1 transition-colors"
                    title="Mark as paid from draw funds"
                  >
                    Paid
                  </button>
                  <label className="text-xs text-gray-500 hover:text-blue-600 cursor-pointer min-h-[44px] px-1 transition-colors inline-flex items-center">
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadReceipt(p.id, f);
                        e.target.value = "";
                      }}
                    />
                    Upload Receipt
                  </label>
                </>
              );
            }
            if (p.status === "paid_from_draw" && !p.receipt_file_url) {
              return (
                <label className="text-xs text-blue-600 hover:underline cursor-pointer min-h-[44px] px-1 transition-colors inline-flex items-center">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadReceipt(p.id, f);
                      e.target.value = "";
                    }}
                  />
                  Upload Receipt
                </label>
              );
            }
            if (p.status === "paid_from_draw" && p.receipt_file_url) {
              return (
                <button
                  onClick={() => onPreview(fileDownloadUrl(p.receipt_file_url!), p.receipt_file_name ?? "Receipt")}
                  className="text-xs text-blue-600 hover:underline cursor-pointer min-h-[44px] px-1 transition-colors inline-flex items-center gap-1"
                  title={p.payment_method ? `Paid via ${p.payment_method}` : "View receipt"}
                >
                  <Paperclip className="w-3 h-3" />
                  Receipt
                </button>
              );
            }
            return null;
          })()}
          <EditOnly>
          <button
            disabled={loading}
            aria-label={`Edit payment to ${p.contractor_name}`}
            onClick={() => startEditPayment(p)}
            className="text-gray-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={loading}
            aria-label={`Delete payment to ${p.contractor_name}`}
            onClick={() => deletePayment(p.id)}
            className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          </EditOnly>
        </div>
      </div>
    );
  }

  // Payment summary totals (across all payments on project)
  const paymentTotals = {
    pending: payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
    paidPersonal: payments.filter((p) => p.status === "paid_personal").reduce((s, p) => s + p.amount, 0),
    reimbursed: payments.filter((p) => p.status === "reimbursed").reduce((s, p) => s + p.amount, 0),
    paidFromDraw: payments.filter((p) => p.status === "paid_from_draw").reduce((s, p) => s + p.amount, 0),
  };

  // Payments with no draw, split three ways. Only the unpaid ones are worth
  // flagging: a paid_personal invoice is already covered out of Blake's pocket
  // and just needs reimbursing, and a reimbursed/paid one needs nothing at all.
  // Lumping all three under one amber "not on a draw" header cried wolf on
  // invoices that had already been handled.
  const offDrawPayments = payments.filter((p) => p.draw_request_id === null);
  const unassignedPayments = offDrawPayments.filter((p) => p.status === "pending");
  const awaitingReimbursement = offDrawPayments.filter((p) => p.status === "paid_personal");
  const settledOffDraw = offDrawPayments.filter(
    (p) => p.status === "reimbursed" || p.status === "paid_from_draw",
  );
  const awaitingReimbursementTotal = awaitingReimbursement.reduce((sum, p) => sum + p.amount, 0);


  const [expandedDraws, setExpandedDraws] = useState<Set<string>>(new Set());
  const [uploadingDrawId, setUploadingDrawId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadLineItems, setUploadLineItems] = useState<Record<number, string>>({});
  const [uploadContractors, setUploadContractors] = useState<Record<number, { id?: string; name: string }>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [scanningDrawId, setScanningDrawId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);

  // Post-upload review state
  interface UploadedDocReview {
    id: string;
    fileUrl: string;
    originalName: string;
    suggestedName: string;
    editedName: string;
    vendor: string;
    contractorId: string;
    docType: string;
    lineItemNumber: string;
    amount: number | null;
    editing: boolean;
  }
  const [reviewDocs, setReviewDocs] = useState<UploadedDocReview[]>([]);
  const [savingReview, setSavingReview] = useState(false);

  // Inline row editing — edit doc + linked payment fields together
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocForm, setEditDocForm] = useState({
    line_item_number: "",
    doc_type: "",
    vendor: "",
    name: "",
    amount: "",
    status: "pending" as string,
  });

  function startEditDoc(doc: Document) {
    const p = payments.find((pp) => pp.invoice_file_url === doc.file_url);
    setEditingDocId(doc.id);
    setEditDocForm({
      line_item_number: doc.line_item_number ?? "",
      doc_type: doc.doc_type ?? "",
      vendor: doc.vendor ?? "",
      name: doc.name ?? "",
      amount: p ? formatCurrencyInput(String(p.amount)) : "",
      status: p?.status ?? "pending",
    });
  }

  async function saveEditDoc() {
    if (!editingDocId) return;
    const doc = documents.find((d) => d.id === editingDocId);
    if (!doc) return;

    const docPatch: Record<string, unknown> = {
      id: editingDocId,
      line_item_number: editDocForm.line_item_number || null,
      doc_type: editDocForm.doc_type || null,
      vendor: editDocForm.vendor || null,
      name: editDocForm.name || doc.name,
    };
    if (editDocForm.line_item_number) {
      docPatch.category = "invoice";
    }

    await fetch(`/api/admin/projects/${projectId}/documents`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docPatch),
    });

    const payment = payments.find((p) => p.invoice_file_url === doc.file_url);
    if (payment) {
      const parsedAmount = parseFloat(unformatCurrency(editDocForm.amount));
      await fetch(
        `/api/admin/projects/${projectId}/payments/${payment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: isNaN(parsedAmount) ? payment.amount : parsedAmount,
            status: editDocForm.status,
            contractor_name: editDocForm.vendor || payment.contractor_name,
          }),
        },
      );
    }

    setEditingDocId(null);
    router.refresh();
    toast.success("Row updated");
  }

  /** Build filename: #_Category_DocType_VendorName.ext */
  function buildDocFilename(lineNum: string, docType: string, vendor: string, ext: string) {
    const category = DEFAULT_BUDGET_LINE_ITEMS.find((b) => String(b.line_number) === lineNum)?.description || "";
    const cleanVendor = vendor.replace(/[^a-zA-Z0-9\s&-]/g, "").replace(/\s+/g, "_");
    const parts = [lineNum, category.replace(/\s+/g, "_"), docType || "Invoice", cleanVendor].filter(Boolean);
    return `${parts.join("_")}.${ext}`;
  }

  // Auto-expand the latest draw on first render
  useEffect(() => {
    if (draws.length > 0) {
      const sorted = [...draws].sort((a, b) => b.draw_number - a.draw_number);
      setExpandedDraws(new Set([sorted[0].id]));
    }
  }, [draws.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Documents grouped by draw
  const unassignedDocs = documents.filter((d) => !d.draw_request_id && d.category !== "permit");
  const docsByDraw = draws.reduce<Record<string, Document[]>>((acc, draw) => {
    acc[draw.id] = documents
      .filter((d) => d.draw_request_id === draw.id)
      .sort((a, b) => (a.line_item_number ?? "zzz").localeCompare(b.line_item_number ?? "zzz", undefined, { numeric: true }));
    return acc;
  }, {});

  // Financial summaries
  const totalDraws = sumDrawAmounts(draws);
  const fundedAmount = draws
    .filter((d) => d.status === "funded")
    .reduce((s, d) => s + d.amount, 0);
  const pendingAmount = draws
    .filter((d) => d.status === "submitted" || d.status === "approved")
    .reduce((s, d) => s + d.amount, 0);

  // Auto-increment draw number
  const nextDrawNumber = draws.length > 0
    ? Math.max(...draws.map((d) => d.draw_number)) + 1
    : 1;

  function toggleExpanded(drawId: string) {
    setExpandedDraws((prev) => {
      const next = new Set(prev);
      if (next.has(drawId)) next.delete(drawId);
      else next.add(drawId);
      return next;
    });
  }

  const [newDrawFiles, setNewDrawFiles] = useState<File[]>([]);
  const [newDrawLineItems, setNewDrawLineItems] = useState<Record<number, string>>({});
  const [newDrawContractors, setNewDrawContractors] = useState<Record<number, string>>({});
  const [newDrawUploading, setNewDrawUploading] = useState(false);
  const [newDrawProgress, setNewDrawProgress] = useState<{ done: number; total: number } | null>(null);

  async function addDraw() {
    const drawNum = form.draw_number ? parseInt(form.draw_number) : nextDrawNumber;
    const amount = form.amount ? parseFloat(unformatCurrency(form.amount)) : 0;

    // Create the draw. The user can override status and dates here for
    // historical entry — accrued_interest accrues from funded_date, so
    // recording the actual lender disbursement date matters for accuracy.
    const res = await mutate(`/api/admin/projects/${projectId}/draws`, "POST", {
      draw_number: drawNum,
      description: form.description || null,
      amount,
      status: form.status,
      submitted_date: form.submitted_date || null,
      funded_date: form.status === "funded" ? (form.funded_date || null) : (form.funded_date || null),
      notes: null,
    });

    // Upload files to the new draw if any were selected
    const uploadedDocs: UploadedDocReview[] = [];
    if (res && newDrawFiles.length > 0) {
      const drawData = await res.json().catch(() => null);
      const drawId = drawData?.id;
      if (drawId) {
        setNewDrawUploading(true);
        setNewDrawProgress({ done: 0, total: newDrawFiles.length });
        for (let i = 0; i < newDrawFiles.length; i++) {
          const file = newDrawFiles[i];
          const parsed = parseDrawFilename(file.name);
          const userLineItem = newDrawLineItems[i];
          const userContractor = newDrawContractors[i];
          const fd = new FormData();
          fd.append("file", file);
          fd.append("category", "invoice");
          fd.append("draw_request_id", drawId);
          fd.append("auto_create_payment", "true");
          fd.append("use_ai", "true");
          // User-specified line item # takes priority, then parsed from filename
          if (userLineItem) {
            fd.append("line_item_number", userLineItem);
          } else if (parsed.lineItemNumber != null) {
            fd.append("line_item_number", String(parsed.lineItemNumber));
          }
          if (userContractor) {
            fd.append("contractor_id", userContractor);
            const c = contractors.find((ct) => ct.id === userContractor);
            if (c) fd.append("vendor", c.company || c.name);
          } else if (parsed.vendor) {
            fd.append("vendor", parsed.vendor);
          }
          if (parsed.docType) fd.append("doc_type", parsed.docType);

          const docRes = await mutate(`/api/admin/projects/${projectId}/documents`, "POST", fd);
          setNewDrawProgress({ done: i + 1, total: newDrawFiles.length });

          // Collect for review
          if (docRes) {
            try {
              const result = await docRes.clone().json();
              if (result.duplicate_payment) {
                toast(
                  `Possible duplicate: ${result.duplicate_payment.contractor_name} at ${fmt(result.duplicate_payment.amount)} already exists — no new payment was created.`,
                  { icon: "⚠️", duration: 8000 },
                );
              }
              const ai = result.ai_extracted;
              const vendor = result.vendor || ai?.vendor_company || ai?.vendor_name || "";
              const docType = result.doc_type || (ai?.category ? "Invoice" : "");
              const lineNum = result.line_item_number != null ? String(result.line_item_number) : "";
              const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
              const suggestedName = buildDocFilename(lineNum, docType || "Invoice", vendor, ext);

              uploadedDocs.push({
                id: result.id,
                fileUrl: result.file_url,
                originalName: file.name,
                suggestedName,
                editedName: suggestedName,
                vendor,
                contractorId: result.contractor_id || "",
                docType: docType || "Invoice",
                lineItemNumber: lineNum,
                amount: ai?.amount || null,
                editing: false,
              });
            } catch {
              // skip review for this file
            }
          }
        }
        setNewDrawUploading(false);
        setNewDrawProgress(null);

        // Show review step
        if (uploadedDocs.length > 0) {
          setReviewDocs(uploadedDocs);
        }
      }
    }

    setNewDrawFiles([]);
    setNewDrawLineItems({});
    setNewDrawContractors({});
    setForm({
      draw_number: "",
      description: "",
      amount: "",
      status: "draft",
      submitted_date: "",
      funded_date: "",
    });
    setShowForm(false);
  }

  async function updateDrawStatus(draw: DrawRequest, status: DrawRequestStatus) {
    await mutate(
      `/api/admin/projects/${projectId}/draws/${draw.id}`,
      "PATCH",
      {
        status,
        ...(status === "submitted"
          ? { submitted_date: new Date().toISOString().split("T")[0] }
          : {}),
        ...(status === "funded"
          ? { funded_date: new Date().toISOString().split("T")[0] }
          : {}),
      },
    );
  }

  const [editingDraw, setEditingDraw] = useState<string | null>(null);
  const [editDrawForm, setEditDrawForm] = useState({
    draw_number: "",
    amount: "",
    description: "",
    notes: "",
    submitted_date: "",
    funded_date: "",
  });

  function startEditDraw(draw: DrawRequest) {
    setEditingDraw(draw.id);
    setEditDrawForm({
      draw_number: String(draw.draw_number),
      amount: formatCurrencyInput(String(draw.amount)),
      description: draw.description || "",
      notes: draw.notes || "",
      submitted_date: draw.submitted_date ?? "",
      funded_date: draw.funded_date ?? "",
    });
  }

  async function saveEditDraw(drawId: string) {
    // submitted_date / funded_date sent as null when cleared so the
    // accrued-interest calc respects "not yet funded" state.
    await mutate(`/api/admin/projects/${projectId}/draws/${drawId}`, "PATCH", {
      draw_number: parseInt(editDrawForm.draw_number),
      amount: parseFloat(unformatCurrency(editDrawForm.amount)),
      description: editDrawForm.description || null,
      notes: editDrawForm.notes || null,
      submitted_date: editDrawForm.submitted_date || null,
      funded_date: editDrawForm.funded_date || null,
    });
    setEditingDraw(null);
  }

  async function deleteDraw(id: string) {
    if (!(await confirmAction("Delete this draw request and all its documents?"))) return;
    await mutate(`/api/admin/projects/${projectId}/draws/${id}`, "DELETE");
  }

  async function assignDocToDraw(docId: string, drawId: string) {
    await mutate(`/api/admin/projects/${projectId}/documents`, "PATCH", {
      id: docId,
      draw_request_id: drawId,
    });
  }

  // Taking a document off a draw is not the same as deleting it: the file stays
  // in the project and drops back into "Unassigned Documents", ready to go onto
  // a different draw. The route also unlinks the invoice's payment and re-totals
  // the draw, so the draw amount stops counting this invoice.
  async function removeDocFromDraw(doc: Document) {
    await mutate(`/api/admin/projects/${projectId}/documents`, "PATCH", {
      id: doc.id,
      draw_request_id: null,
    });
  }

  async function deleteDoc(id: string) {
    if (!(await confirmAction("Delete this document?"))) return;
    await mutate(`/api/admin/projects/${projectId}/documents/${id}`, "DELETE");
  }

  async function exportDrawRequest(draw: DrawRequest) {
    try {
      const { exportDrawRequestXlsx } = await import("@/lib/export-draw-request");
      await exportDrawRequestXlsx(draw, project, payments, documents);
      toast.success("Draw request exported");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Failed to export draw request");
    }
  }

  async function downloadDrawInvoicesPdf(draw: DrawRequest) {
    const toastId = toast.loading("Building combined PDF...");
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/draws/${draw.id}/invoices-pdf`,
      );
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Download failed" }));
        throw new Error(error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Draw_${draw.draw_number}_Invoices.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Invoices downloaded", { id: toastId });
    } catch (err) {
      console.error("Download invoices error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to download invoices", { id: toastId });
    }
  }

  async function rescanDrawDocs(drawId: string, docs: Document[]) {
    if (docs.length === 0) return;
    setScanningDrawId(drawId);
    setScanProgress({ done: 0, total: docs.length });

    // Process in batches of 3 to avoid overwhelming the API
    const batchSize = 3;
    let done = 0;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      const batchIds = batch.map((d) => d.id);
      await fetch(`/api/admin/projects/${projectId}/documents/rescan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_ids: batchIds }),
      });
      done += batch.length;
      setScanProgress({ done, total: docs.length });
    }

    setScanningDrawId(null);
    setScanProgress(null);
    router.refresh();
  }

  function handleUploadFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;
    setUploadFiles((prev) => [...prev, ...Array.from(selected)]);
  }

  function removeUploadFile(index: number) {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadFilesToDraw(drawId: string) {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: uploadFiles.length });

    const uploadedDocs: UploadedDocReview[] = [];

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const parsed = parseDrawFilename(file.name);
      const userLineItem = uploadLineItems[i];
      const userContractor = uploadContractors[i];
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "invoice");
      fd.append("draw_request_id", drawId);
      fd.append("auto_create_payment", "true");
      fd.append("use_ai", "true");
      // User-specified line item # takes priority, then parsed from filename
      if (userLineItem) {
        fd.append("line_item_number", userLineItem);
      } else if (parsed.lineItemNumber !== null) {
        fd.append("line_item_number", String(parsed.lineItemNumber));
      }
      if (userContractor?.id) {
        fd.append("contractor_id", userContractor.id);
        fd.append("vendor", userContractor.name);
      } else if (userContractor?.name) {
        // New contractor name typed — auto-create with trade from selected category
        const lineItemNum = userLineItem || (parsed.lineItemNumber !== null ? String(parsed.lineItemNumber) : "");
        const lineItem = DEFAULT_BUDGET_LINE_ITEMS.find((li) => li.line_number === lineItemNum);
        const desc = (lineItem?.description || "").toUpperCase();
        const trade =
          desc.includes("PLUMBING") ? "Plumbing" :
          desc.includes("ELECTRICAL") ? "Electrical" :
          desc.includes("HVAC") ? "HVAC" :
          desc.includes("FRAMING") || desc.includes("LUMBER") || desc.includes("TRUSSES") ? "Framing" :
          desc.includes("ROOFING") ? "Roofing" :
          desc.includes("SLAB") || desc.includes("CONCRETE") ? "Concrete" :
          desc.includes("SHEETROCK") ? "Drywall" :
          desc.includes("PAINT") ? "Painting" :
          desc.includes("FLOORING") ? "Flooring" :
          desc.includes("LANDSCAPING") ? "Landscaping" :
          desc.includes("INSULATION") ? "Insulation" :
          desc.includes("WINDOWS") || desc.includes("DOORS") || desc.includes("GARAGE DOOR") ? "Windows/Doors" :
          desc.includes("STUCCO") || desc.includes("STONE") ? "Siding" :
          desc.includes("CABINETS") ? "Cabinetry" :
          desc.includes("ENGINEERING") ? "Engineering" :
          desc.includes("METAL") || desc.includes("STEEL") ? "Steel/Welding" :
          "General";
        try {
          const createRes = await fetch("/api/admin/contractors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "contractor", name: userContractor.name, trade }),
          });
          if (createRes.ok) {
            const newContractor = await createRes.json();
            fd.append("contractor_id", newContractor.id);
            fd.append("vendor", userContractor.name);
          } else {
            fd.append("vendor", userContractor.name);
          }
        } catch {
          fd.append("vendor", userContractor.name);
        }
      } else if (parsed.vendor) {
        fd.append("vendor", parsed.vendor);
      }
      if (parsed.docType) {
        fd.append("doc_type", parsed.docType);
      }

      const res = await mutate(`/api/admin/projects/${projectId}/documents`, "POST", fd);
      setUploadProgress({ done: i + 1, total: uploadFiles.length });

      // Collect the response for review
      if (res) {
        try {
          const result = await res.clone().json();
          if (result.duplicate_payment) {
            toast(
              `Possible duplicate: ${result.duplicate_payment.contractor_name} at ${fmt(result.duplicate_payment.amount)} already exists — no new payment was created.`,
              { icon: "⚠️", duration: 8000 },
            );
          }
          const ai = result.ai_extracted;
          const vendor = result.vendor || ai?.vendor_company || ai?.vendor_name || "";
          const docType = result.doc_type || (ai?.category ? "Invoice" : "");
          const lineNum = result.line_item_number != null ? String(result.line_item_number) : "";
          const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";

          // Build a clean suggested name
          const suggestedName = buildDocFilename(lineNum, docType || "Invoice", vendor, ext);

          uploadedDocs.push({
            id: result.id,
            fileUrl: result.file_url,
            originalName: file.name,
            suggestedName,
            editedName: suggestedName,
            vendor,
            contractorId: result.contractor_id || "",
            docType: docType || "Invoice",
            lineItemNumber: lineNum,
            amount: ai?.amount || null,
            editing: false,
          });
        } catch {
          // If we can't parse the response, skip review for this file
        }
      }
    }

    setUploadFiles([]);
    setUploadLineItems({});
    setUploadContractors({});
    setUploadingDrawId(null);
    setUploading(false);
    setUploadProgress(null);

    // Show review step if we have docs to review
    if (uploadedDocs.length > 0) {
      setReviewDocs(uploadedDocs);
    }
  }

  async function saveReviewNames() {
    setSavingReview(true);
    try {
      for (const doc of reviewDocs) {
        const updates: Record<string, unknown> = {
          id: doc.id,
          name: doc.editedName,
        };
        // Also update vendor, doc_type, line_item_number, and contractor_id if edited
        if (doc.vendor) updates.vendor = doc.vendor;
        if (doc.docType) updates.doc_type = doc.docType;
        if (doc.lineItemNumber) updates.line_item_number = doc.lineItemNumber;
        if (doc.contractorId) updates.contractor_id = doc.contractorId;

        await fetch(`/api/admin/projects/${projectId}/documents`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        // Also update the linked contractor payment's invoice_file_name
        const linkedPayment = payments.find((p) => p.invoice_file_url === doc.fileUrl);
        if (linkedPayment) {
          await fetch(`/api/admin/projects/${projectId}/payments/${linkedPayment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoice_file_name: doc.editedName,
              contractor_name: doc.vendor || linkedPayment.contractor_name,
            }),
          });
        }
      }
      toast.success("Document names updated");
      router.refresh();
    } catch {
      toast.error("Failed to update names");
    } finally {
      setSavingReview(false);
      setReviewDocs([]);
    }
  }

  function dismissReview() {
    setReviewDocs([]);
  }

  const sortedDraws = [...draws].sort((a, b) => b.draw_number - a.draw_number);

  return (
    <>
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ShadCard className="p-4">
          <CardContent className="p-0">
            <p className="text-xs text-gray-500 font-medium">Total Draws</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{fmt(totalDraws)}</p>
          </CardContent>
        </ShadCard>
        <ShadCard className="p-4">
          <CardContent className="p-0">
            <p className="text-xs text-gray-500 font-medium">Funded</p>
            <p className="text-lg font-bold text-green-600 tabular-nums">{fmt(fundedAmount)}</p>
          </CardContent>
        </ShadCard>
        <ShadCard className="p-4">
          <CardContent className="p-0">
            <p className="text-xs text-gray-500 font-medium">Pending</p>
            <p className="text-lg font-bold text-blue-600 tabular-nums">{fmt(pendingAmount)}</p>
          </CardContent>
        </ShadCard>
      </div>

      {/* Payment Summary Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ShadCard className="p-4 border-l-4 border-l-orange-500">
          <CardContent className="p-0">
            <p className="text-xs text-gray-500 font-medium">Pending</p>
            <p className="text-lg font-bold text-orange-600 tabular-nums">{fmt(paymentTotals.pending)}</p>
          </CardContent>
        </ShadCard>
        <ShadCard className="p-4 border-l-4 border-l-indigo-400">
          <CardContent className="p-0">
            <p className="text-xs text-gray-500 font-medium">Paid Personal</p>
            <p className="text-lg font-bold text-indigo-600 tabular-nums">{fmt(paymentTotals.paidPersonal)}</p>
          </CardContent>
        </ShadCard>
        <ShadCard className="p-4 border-l-4 border-l-green-500">
          <CardContent className="p-0">
            <p className="text-xs text-gray-500 font-medium">Reimbursed</p>
            <p className="text-lg font-bold text-green-600 tabular-nums">{fmt(paymentTotals.reimbursed)}</p>
          </CardContent>
        </ShadCard>
        <ShadCard className="p-4 border-l-4 border-l-green-700">
          <CardContent className="p-0">
            <p className="text-xs text-gray-500 font-medium">Paid</p>
            <p className="text-lg font-bold text-green-700 tabular-nums">{fmt(paymentTotals.paidFromDraw)}</p>
          </CardContent>
        </ShadCard>
      </div>

      {/* Add Payment button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Payments</h3>
        {!showPaymentForm && (
          <AddButton label="Add Payment" onClick={() => setShowPaymentForm(true)} />
        )}
      </div>

      {/* Add Payment Form */}
      {showPaymentForm && (
        <ShadCard className="bg-gray-50 border-dashed">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="draws-pay-contractor" className="block text-sm text-gray-700 font-medium mb-1">
                    Contractor <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="draws-pay-contractor"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                    value={paymentForm.contractor_id}
                    onChange={(e) => handleContractorChange(e.target.value)}
                  >
                    <option value="">Select contractor...</option>
                    {contractors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.company ? ` \u2014 ${c.company}` : ""}
                      </option>
                    ))}
                    <option value="other">Other (type name)</option>
                  </select>
                </div>
                {paymentForm.contractor_id === "other" && (
                  <div>
                    <label htmlFor="draws-pay-contractor-name" className="block text-sm text-gray-700 font-medium mb-1">
                      Contractor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="draws-pay-contractor-name"
                      placeholder="Contractor Name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={paymentForm.contractor_name}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, contractor_name: e.target.value })
                      }
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="draws-pay-amount" className="block text-sm text-gray-700 font-medium mb-1">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="draws-pay-amount"
                    placeholder="$0.00"
                    type="text"
                    inputMode="decimal"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: formatCurrencyInput(e.target.value) })}
                  />
                </div>
                <div>
                  <label htmlFor="draws-pay-desc" className="block text-sm text-gray-700 font-medium mb-1">
                    Description
                  </label>
                  <input
                    id="draws-pay-desc"
                    placeholder="Description"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={paymentForm.description}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label htmlFor="draws-pay-due" className="block text-sm text-gray-700 font-medium mb-1">
                    Due Date
                  </label>
                  <input
                    id="draws-pay-due"
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={paymentForm.due_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="draws-pay-invoice" className="block text-sm text-gray-700 font-medium mb-1">
                    Attach Invoice (optional)
                  </label>
                  <input
                    id="draws-pay-invoice"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-gray-200 file:text-sm file:font-medium file:text-gray-700 file:cursor-pointer focus:outline-none focus:ring-2 focus:ring-black"
                    onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                  />
                  {invoiceFile && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {invoiceFile.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={addPayment}
                  className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setInvoiceFile(null);
                  }}
                  className="text-sm text-gray-600 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </CardContent>
        </ShadCard>
      )}

      {/* Contractor Upload Links (collapsible) — staff only */}
      <EditOnly>
      <ShadCard>
        <button
          type="button"
          onClick={() => setUploadLinksOpen(!uploadLinksOpen)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left cursor-pointer hover:bg-gray-50 transition-colors rounded-t-lg"
        >
          {uploadLinksOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <LinkIcon className="w-4 h-4 text-gray-700" />
          <span className="text-sm font-semibold text-gray-900">Contractor Upload Links</span>
          {uploadLinks.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs bg-blue-50 text-blue-700">
              {uploadLinks.length} active
            </Badge>
          )}
        </button>
        {uploadLinksOpen && (
          <CardContent className="pt-0 pb-4">
            <p className="text-xs text-gray-500 mb-3">
              Generate a link to text to a contractor so they can upload their invoice directly.
            </p>
            <div className="flex items-end gap-2 mb-4">
              <div className="flex-1">
                <label htmlFor="draws-upload-link-contractor" className="block text-sm text-gray-700 font-medium mb-1">
                  Contractor
                </label>
                <select
                  id="draws-upload-link-contractor"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                  value={uploadLinkContractorId}
                  onChange={(e) => setUploadLinkContractorId(e.target.value)}
                >
                  <option value="">Select contractor...</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` \u2014 ${c.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                disabled={!uploadLinkContractorId || uploadLinkLoading}
                onClick={generateUploadLink}
                className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                {uploadLinkLoading ? "Generating..." : "Generate Link"}
              </button>
            </div>

            {uploadLinks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Active Links:</p>
                {uploadLinks.map((link) => {
                  const contractor = contractors.find((c) => c.id === link.contractor_id);
                  const displayUrl = `${typeof window !== "undefined" ? window.location.host : ""}/.../submit-invoice/${link.token.slice(0, 8)}...`;
                  return (
                    <div
                      key={link.id}
                      className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {link.contractor_name}
                            {contractor?.company && (
                              <span className="text-gray-500"> &mdash; {contractor.company}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                            {displayUrl}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => copyUploadLink(link.token, link.id)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 min-h-[36px] rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedTokenId === link.id ? "Copied!" : "Copy Link"}
                        </button>
                        {contractor?.phone && (
                          <button
                            onClick={() =>
                              textUploadLink(link.token, link.contractor_name, link.contractor_id)
                            }
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 min-h-[36px] rounded-md border border-gray-300 bg-white text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Text Link
                          </button>
                        )}
                        <button
                          disabled={uploadLinkLoading}
                          onClick={() => deactivateUploadLink(link.id)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 min-h-[36px] rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors ml-auto"
                        >
                          <XCircle className="w-3 h-3" />
                          Deactivate
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {uploadLinks.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                No active upload links. Select a contractor and generate one above.
              </p>
            )}
          </CardContent>
        )}
      </ShadCard>
      </EditOnly>

      {/* Unpaid and not on any draw — the only off-draw bucket that needs action */}
      {unassignedPayments.length > 0 && (
        <ShadCard className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">
              Not on a draw yet ({unassignedPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {unassignedPayments.map((p) => (
                <div key={p.id}>{renderPaymentRow(p)}</div>
              ))}
            </div>
          </CardContent>
        </ShadCard>
      )}

      {/* Paid out of Blake's pocket. Not a draw problem, but the money is still
          owed back, so it stays on screen with a running total. */}
      {awaitingReimbursement.length > 0 && (
        <ShadCard className="border-indigo-200 bg-indigo-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium text-indigo-800">
                Paid personally — awaiting reimbursement ({awaitingReimbursement.length})
              </CardTitle>
              <span className="text-sm font-semibold text-indigo-800 tabular-nums">
                {fmt(awaitingReimbursementTotal)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {awaitingReimbursement.map((p) => (
                <div key={p.id}>{renderPaymentRow(p)}</div>
              ))}
            </div>
          </CardContent>
        </ShadCard>
      )}

      {/* Already settled and never filed under a draw — listed so they don't
          vanish from this tab, but with nothing outstanding. */}
      {settledOffDraw.length > 0 && (
        <ShadCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Settled, not on a draw ({settledOffDraw.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {settledOffDraw.map((p) => (
                <div key={p.id}>{renderPaymentRow(p)}</div>
              ))}
            </div>
          </CardContent>
        </ShadCard>
      )}

      {/* Header with New Draw button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Draw Requests</h3>
        {!showForm && (
          <AddButton label="New Draw" onClick={() => setShowForm(true)} />
        )}
      </div>

      {/* New Draw Form */}
      {showForm && (
        <ShadCard className="bg-gray-50 border-dashed">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="draw-number" className="block text-sm text-gray-700 font-medium mb-1">
                    Draw #
                  </label>
                  <input
                    id="draw-number"
                    placeholder={String(nextDrawNumber)}
                    type="number"
                    inputMode="numeric"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={form.draw_number}
                    onChange={(e) => setForm({ ...form, draw_number: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="draw-amount" className="block text-sm text-gray-700 font-medium mb-1">
                    Amount
                  </label>
                  <input
                    id="draw-amount"
                    placeholder="$0.00"
                    type="text"
                    inputMode="decimal"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: formatCurrencyInput(e.target.value) })}
                  />
                </div>
                <div>
                  <label htmlFor="draw-desc" className="block text-sm text-gray-700 font-medium mb-1">
                    Description
                  </label>
                  <input
                    id="draw-desc"
                    placeholder="Description"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              {/* Status + dates — defaults are the new-draw happy path
               *  (draft, both dates blank), but the user can record
               *  historical draws by setting status=funded and entering
               *  the actual disbursement date. accrued_interest accrues
               *  from funded_date, so entering it accurately matters for
               *  the projected_profit number. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="draw-status" className="block text-sm text-gray-700 font-medium mb-1">
                    Status
                  </label>
                  <select
                    id="draw-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as DrawRequestStatus })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="funded">Funded</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="draw-submitted-date" className="block text-sm text-gray-700 font-medium mb-1">
                    Submitted Date
                  </label>
                  <input
                    id="draw-submitted-date"
                    type="date"
                    value={form.submitted_date}
                    onChange={(e) => setForm({ ...form, submitted_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label htmlFor="draw-funded-date" className="block text-sm text-gray-700 font-medium mb-1">
                    Funded Date{" "}
                    <span className="text-[10px] text-gray-500 font-normal">(drives interest)</span>
                  </label>
                  <input
                    id="draw-funded-date"
                    type="date"
                    value={form.funded_date}
                    onChange={(e) => setForm({ ...form, funded_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              {/* File upload */}
              <div>
                <label className="block text-sm text-gray-700 font-medium mb-1">
                  Supporting Documents
                </label>
                <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-5 text-sm cursor-pointer hover:border-gray-400 hover:bg-gray-100/50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">Click to select invoices, receipts, and permits</span>
                  <span className="text-xs text-gray-400">Select multiple files — filenames are auto-parsed</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      if (e.target.files) setNewDrawFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                    }}
                  />
                </label>
              </div>

              {/* Selected files preview */}
              {newDrawFiles.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">{newDrawFiles.length} file{newDrawFiles.length !== 1 ? "s" : ""} ready to upload</p>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                    {newDrawFiles.map((f, i) => {
                      return (
                        <div key={`${f.name}-${i}`} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50">
                          <div className="shrink-0 sm:w-44">
                            <select
                              value={newDrawLineItems[i] || ""}
                              onChange={(e) => setNewDrawLineItems((prev) => ({ ...prev, [i]: e.target.value }))}
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 appearance-none bg-white"
                              aria-label={`Category for ${f.name}`}
                            >
                              <option value="">Select category...</option>
                              {DEFAULT_BUDGET_LINE_ITEMS.map((item) => (
                                <option key={item.line_number} value={String(item.line_number)}>
                                  {item.line_number}. {item.description}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="shrink-0 sm:w-44">
                            <select
                              value={newDrawContractors[i] || ""}
                              onChange={(e) => setNewDrawContractors((prev) => ({ ...prev, [i]: e.target.value }))}
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 appearance-none bg-white"
                              aria-label={`Contractor/Vendor for ${f.name}`}
                            >
                              <option value="">Select contractor/vendor...</option>
                              {contractors.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.company || c.name}{c.type === "vendor" ? " (Vendor)" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <p className="truncate text-gray-900 text-xs flex-1">{f.name}</p>
                            <button
                              onClick={() => {
                                setNewDrawFiles(prev => prev.filter((_, idx) => idx !== i));
                                setNewDrawLineItems((prev) => { const next = { ...prev }; delete next[i]; return next; });
                                setNewDrawContractors((prev) => { const next = { ...prev }; delete next[i]; return next; });
                              }}
                              aria-label={`Remove ${f.name}`}
                              className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload progress */}
              {newDrawProgress && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uploading {newDrawProgress.done} of {newDrawProgress.total}...</span>
                    <span className="text-gray-500 tabular-nums">{Math.round((newDrawProgress.done / newDrawProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-600 transition-all duration-300" style={{ width: `${(newDrawProgress.done / newDrawProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  disabled={loading || newDrawUploading}
                  onClick={addDraw}
                  className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {newDrawUploading
                    ? `Uploading ${newDrawProgress?.done ?? 0}/${newDrawProgress?.total ?? 0}...`
                    : loading
                      ? "Saving..."
                      : newDrawFiles.length > 0
                        ? `Create Draw & Upload ${newDrawFiles.length} File${newDrawFiles.length !== 1 ? "s" : ""}`
                        : "Create Draw"}
                </button>
                <button
                  disabled={newDrawUploading}
                  onClick={() => { setShowForm(false); setNewDrawFiles([]); }}
                  className="text-sm text-gray-600 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </CardContent>
        </ShadCard>
      )}

      {/* AI Rename Review Panel */}
      {reviewDocs.length > 0 && (
        <ShadCard className="border-indigo-200 bg-indigo-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Review AI-Suggested Names ({reviewDocs.length})
            </CardTitle>
            <p className="text-xs text-indigo-600 mt-1">
              AI analyzed your documents and suggested clean names. Accept, edit, or skip each one.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewDocs.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-indigo-100 bg-white p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">
                        Original: {doc.originalName}
                      </p>
                      {doc.amount && (
                        <p className="text-xs text-green-600 font-medium">
                          Amount: ${doc.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>

                  {doc.editing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 uppercase">Category</label>
                          <select
                            value={doc.lineItemNumber}
                            onChange={(e) => {
                              const updated = [...reviewDocs];
                              const lineNum = e.target.value;
                              updated[idx] = { ...doc, lineItemNumber: lineNum };
                              const ext = doc.originalName.split(".").pop() || "pdf";
                              updated[idx].editedName = buildDocFilename(lineNum, updated[idx].docType, updated[idx].vendor, ext);
                              setReviewDocs(updated);
                            }}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                          >
                            <option value="">Select category...</option>
                            {DEFAULT_BUDGET_LINE_ITEMS.map((item) => (
                              <option key={item.line_number} value={String(item.line_number)}>
                                {item.line_number}. {item.description}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 uppercase">Type</label>
                          <input
                            type="text"
                            value={doc.docType}
                            onChange={(e) => {
                              const updated = [...reviewDocs];
                              updated[idx] = { ...doc, docType: e.target.value };
                              const ext = doc.originalName.split(".").pop() || "pdf";
                              updated[idx].editedName = buildDocFilename(updated[idx].lineItemNumber, e.target.value, updated[idx].vendor, ext);
                              setReviewDocs(updated);
                            }}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            placeholder="Invoice"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 uppercase">Contractor / Vendor</label>
                          <select
                            value={doc.contractorId}
                            onChange={(e) => {
                              const updated = [...reviewDocs];
                              const selectedId = e.target.value;
                              const selectedContractor = contractors.find((c) => c.id === selectedId);
                              const vendorName = selectedContractor ? (selectedContractor.company || selectedContractor.name) : doc.vendor;
                              updated[idx] = { ...doc, contractorId: selectedId, vendor: vendorName };
                              const ext = doc.originalName.split(".").pop() || "pdf";
                              updated[idx].editedName = buildDocFilename(updated[idx].lineItemNumber, updated[idx].docType, vendorName, ext);
                              setReviewDocs(updated);
                            }}
                            className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                          >
                            <option value="">Select contractor/vendor...</option>
                            {contractors.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.company || c.name}{c.type === "vendor" ? " (Vendor)" : ""}
                              </option>
                            ))}
                          </select>
                          {!doc.contractorId && (
                            <input
                              type="text"
                              value={doc.vendor}
                              onChange={(e) => {
                                const updated = [...reviewDocs];
                                updated[idx] = { ...doc, vendor: e.target.value };
                                const ext = doc.originalName.split(".").pop() || "pdf";
                                updated[idx].editedName = buildDocFilename(updated[idx].lineItemNumber, updated[idx].docType, e.target.value, ext);
                                setReviewDocs(updated);
                              }}
                              className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 mt-1"
                              placeholder="Or type vendor name..."
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Preview:</span>
                        <span className="text-xs font-medium text-indigo-700">{doc.editedName}</span>
                      </div>
                      <button
                        onClick={() => {
                          const updated = [...reviewDocs];
                          updated[idx] = { ...doc, editing: false };
                          setReviewDocs(updated);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Done editing
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowRightCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {doc.editedName}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const updated = [...reviewDocs];
                          updated[idx] = { ...doc, editing: true };
                          setReviewDocs(updated);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 shrink-0 min-h-[36px] px-2"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                disabled={savingReview}
                onClick={saveReviewNames}
                className="bg-indigo-600 text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {savingReview ? "Saving..." : "Accept & Save Names"}
              </button>
              <button
                disabled={savingReview}
                onClick={dismissReview}
                className="text-sm text-gray-600 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Skip (keep original names)
              </button>
            </div>
          </CardContent>
        </ShadCard>
      )}

      {/* Unassigned Documents */}
      {unassignedDocs.length > 0 && (
        <ShadCard className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">
              Unassigned Documents ({unassignedDocs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedDocs.map((doc) => {
                const parsed = parseDrawFilename(doc.name);
                return (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-b border-amber-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <a
                        href={fileDownloadUrl(doc.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block transition-colors"
                      >
                        {doc.name}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        {parsed.lineItemNumber !== null && (
                          <span>#{parsed.lineItemNumber}</span>
                        )}
                        {(doc.vendor || parsed.vendor) && (
                          <span>{doc.vendor || parsed.vendor}</span>
                        )}
                        {(doc.doc_type || parsed.docType) && (
                          <span>{doc.doc_type || parsed.docType}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        disabled={loading}
                        defaultValue=""
                        aria-label={`Assign ${doc.name} to a draw`}
                        onChange={(e) => {
                          if (e.target.value) assignDocToDraw(doc.id, e.target.value);
                        }}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-black cursor-pointer transition-colors"
                      >
                        <option value="" disabled>Assign to Draw...</option>
                        {sortedDraws.map((d) => (
                          <option key={d.id} value={d.id}>
                            Draw #{d.draw_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </ShadCard>
      )}

      {/* Draw Cards */}
      {draws.length === 0 && !showForm && unassignedDocs.length === 0 && (
        <EmptyState label="No draw requests yet" />
      )}

      {sortedDraws.map((draw) => {
        const drawDocs = docsByDraw[draw.id] || [];
        const isExpanded = expandedDraws.has(draw.id);
        const isUploading = uploadingDrawId === draw.id;

        return (
          <ShadCard key={draw.id} className={`border-l-4 ${drawLeftBorder(draw.status)}`}>
            {/* Draw Header - clickable to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleExpanded(draw.id)}
              className="w-full text-left cursor-pointer"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <span className="font-semibold text-gray-900">
                      Draw #{draw.draw_number}
                    </span>
                    <span className="text-gray-500">--</span>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {fmt(draw.amount)}
                    </span>
                    <Badge
                      variant="outline"
                      className={`inline-flex items-center gap-1 rounded-full text-xs ${DRAW_STATUS_COLORS[draw.status]}`}
                    >
                      <Circle className="w-1.5 h-1.5 fill-current" />
                      {draw.status.charAt(0).toUpperCase() + draw.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                {draw.description && (
                  <p className="text-xs text-gray-500 mt-1 ml-6">{draw.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-0.5 ml-6">
                  {drawDocs.length} document{drawDocs.length !== 1 ? "s" : ""}
                  {draw.submitted_date && <> | Submitted: {fmtDate(draw.submitted_date)}</>}
                  {draw.funded_date && <> | Funded: {fmtDate(draw.funded_date)}</>}
                </p>
              </CardHeader>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <CardContent className="pt-0">
                <Separator className="mb-3" />

                {/* Action Buttons */}
                {!isUploading && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadingDrawId(draw.id);
                        setUploadFiles([]);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-black cursor-pointer min-h-[36px] px-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Files
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportDrawRequest(draw);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 cursor-pointer min-h-[36px] px-2 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Export Draw Request
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadDrawInvoicesPdf(draw);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 cursor-pointer min-h-[36px] px-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download All Invoices
                    </button>
                  </div>
                )}

                {/* Upload Form (inline) */}
                {isUploading && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300 space-y-3">
                    <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-4 text-sm cursor-pointer hover:border-gray-400 hover:bg-gray-100/50 transition-colors">
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 text-xs">
                        Click to select files -- you can pick multiple
                      </span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleUploadFileSelect}
                      />
                    </label>

                    {uploadFiles.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500">
                          {uploadFiles.length} file{uploadFiles.length !== 1 ? "s" : ""} selected
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                          {uploadFiles.map((f, i) => {
                            return (
                              <div
                                key={`${f.name}-${i}`}
                                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded px-2 py-2 text-sm hover:bg-gray-50"
                              >
                                <div className="shrink-0 sm:w-44">
                                  <select
                                    value={uploadLineItems[i] || ""}
                                    onChange={(e) => setUploadLineItems((prev) => ({ ...prev, [i]: e.target.value }))}
                                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 appearance-none bg-white"
                                    aria-label={`Category for ${f.name}`}
                                  >
                                    <option value="">Select category...</option>
                                    {DEFAULT_BUDGET_LINE_ITEMS.map((item) => (
                                      <option key={item.line_number} value={String(item.line_number)}>
                                        {item.line_number}. {item.description}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="shrink-0 sm:w-44 relative">
                                  <input
                                    type="text"
                                    value={uploadContractors[i]?.name || ""}
                                    onChange={(e) => {
                                      const typed = e.target.value;
                                      // Check if it matches an existing contractor
                                      const match = contractors.find(
                                        (c) => (c.company || c.name).toLowerCase() === typed.toLowerCase()
                                      );
                                      setUploadContractors((prev) => ({
                                        ...prev,
                                        [i]: match ? { id: match.id, name: match.company || match.name } : { name: typed },
                                      }));
                                    }}
                                    list={`contractor-list-${i}`}
                                    placeholder="Type or select contractor..."
                                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                                    aria-label={`Contractor/Vendor for ${f.name}`}
                                  />
                                  <datalist id={`contractor-list-${i}`}>
                                    {contractors.map((c) => (
                                      <option key={c.id} value={c.company || c.name} />
                                    ))}
                                  </datalist>
                                </div>
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <p className="truncate text-gray-900 text-xs flex-1">{f.name}</p>
                                  <button
                                    onClick={() => removeUploadFile(i)}
                                    aria-label={`Remove ${f.name}`}
                                    className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors shrink-0"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Upload progress */}
                    {uploadProgress && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 text-xs">
                            Uploading {uploadProgress.done} of {uploadProgress.total}...
                          </span>
                          <span className="text-gray-500 tabular-nums text-xs">
                            {Math.round((uploadProgress.done / uploadProgress.total) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-600 transition-all duration-300"
                            style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        disabled={uploading || loading || uploadFiles.length === 0}
                        onClick={() => uploadFilesToDraw(draw.id)}
                        className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {uploading
                          ? `Uploading ${uploadProgress?.done ?? 0}/${uploadProgress?.total ?? 0}...`
                          : `Upload ${uploadFiles.length || ""} File${uploadFiles.length !== 1 ? "s" : ""}`}
                      </button>
                      <button
                        disabled={uploading}
                        onClick={() => {
                          setUploadingDrawId(null);
                          setUploadFiles([]);
                        }}
                        className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Document List */}
                {drawDocs.length === 0 && !isUploading && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No documents in this draw yet
                  </p>
                )}

                {drawDocs.length > 0 && (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                            <th className="pb-2 pr-3 font-medium w-10">#</th>
                            <th className="pb-2 pr-3 font-medium">Category</th>
                            <th className="pb-2 pr-3 font-medium">Type</th>
                            <th className="pb-2 pr-3 font-medium">Vendor</th>
                            <th className="pb-2 pr-3 font-medium">Filename</th>
                            <th className="pb-2 pr-3 font-medium text-right w-24">Amount</th>
                            <th className="pb-2 pr-3 font-medium w-32">Status</th>
                            <th className="pb-2 font-medium w-32"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {drawDocs.map((doc) => {
                            const docPayment = payments.find((p) => p.invoice_file_url === doc.file_url);
                            const drawFunded = draw.status === "funded";
                            return (
                            <React.Fragment key={doc.id}>
                            <tr className="hover:bg-gray-50">
                              <td className="py-2 pr-3 text-xs text-gray-500 tabular-nums">
                                {doc.line_item_number ?? "--"}
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-700">
                                {doc.line_item_number != null
                                  ? DEFAULT_BUDGET_LINE_ITEMS.find((b) => b.line_number === doc.line_item_number)?.description ?? doc.category
                                  : doc.category}
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-700">
                                {doc.doc_type ?? "--"}
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-700">
                                {doc.contractor_id ? (
                                  <a
                                    href={`/admin/contractors/${doc.contractor_id}`}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                  >
                                    {doc.vendor ?? contractors.find((c) => c.id === doc.contractor_id)?.company ?? contractors.find((c) => c.id === doc.contractor_id)?.name ?? "--"}
                                  </a>
                                ) : (
                                  doc.vendor ?? "--"
                                )}
                              </td>
                              <td className="py-2 pr-3 text-xs min-w-0">
                                <a
                                  href={fileDownloadUrl(doc.file_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 truncate block max-w-[200px] transition-colors"
                                  title={doc.name}
                                >
                                  {doc.name}
                                </a>
                              </td>
                              <td className="py-2 pr-3 text-xs text-right tabular-nums text-gray-700">
                                {docPayment ? fmt(docPayment.amount) : "--"}
                              </td>
                              <td className="py-2 pr-3 text-xs">
                                {docPayment ? (
                                  <div className="flex flex-wrap gap-1">
                                    {docPayment.status === "reimbursed" && (
                                      <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-[10px]" title={docPayment.reimbursed_date ? `Reimbursed ${fmtDate(docPayment.reimbursed_date)}` : undefined}>
                                        <Circle className="w-1.5 h-1.5 fill-current" />
                                        Reimbursed
                                      </Badge>
                                    )}
                                    {docPayment.status === "paid_from_draw" && (
                                      <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 text-[10px]" title={docPayment.paid_from_draw_date ? `Paid ${fmtDate(docPayment.paid_from_draw_date)}` : undefined}>
                                        <Circle className="w-1.5 h-1.5 fill-current" />
                                        Paid
                                      </Badge>
                                    )}
                                    {docPayment.status === "paid_personal" && (
                                      <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">
                                        <Circle className="w-1.5 h-1.5 fill-current" />
                                        Paid Personal
                                      </Badge>
                                    )}
                                    {docPayment.status === "pending" && !drawFunded && (
                                      <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-700 text-[10px]">
                                        <Circle className="w-1.5 h-1.5 fill-current" />
                                        Needs Draw
                                      </Badge>
                                    )}
                                    {docPayment.status === "pending" && drawFunded && (
                                      <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 text-[10px]">
                                        <Circle className="w-1.5 h-1.5 fill-current" />
                                        Ready to Pay from Draw
                                      </Badge>
                                    )}
                                    {docPayment.qbo_sync_error && (
                                      <Badge
                                        variant="outline"
                                        className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-[10px]"
                                        title={docPayment.qbo_sync_error}
                                      >
                                        <AlertTriangle className="w-3 h-3" />
                                        QB Sync Failed
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">--</span>
                                )}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-0.5 flex-nowrap justify-end">
                                  {docPayment && docPayment.status === "pending" && (
                                    <EditOnly>
                                    <button
                                      disabled={loading}
                                      onClick={() => markAsPaid(docPayment)}
                                      title="Mark as Paid Personal"
                                      aria-label="Mark as Paid Personal"
                                      className="text-indigo-500 hover:text-indigo-700 disabled:opacity-50 cursor-pointer p-1 transition-colors"
                                    >
                                      <Wallet className="w-3.5 h-3.5" />
                                    </button>
                                    </EditOnly>
                                  )}
                                  {docPayment && (docPayment.status === "pending" || docPayment.status === "paid_personal") && (
                                    <EditOnly>
                                    <button
                                      disabled={loading}
                                      onClick={() => markPaidFromDraw(docPayment)}
                                      title="Mark as Paid"
                                      aria-label="Mark as Paid"
                                      className="text-green-600 hover:text-green-800 disabled:opacity-50 cursor-pointer p-1 transition-colors"
                                    >
                                      <Banknote className="w-3.5 h-3.5" />
                                    </button>
                                    </EditOnly>
                                  )}
                                  {docPayment && docPayment.receipt_file_url ? (
                                    <button
                                      onClick={() => onPreview(fileDownloadUrl(docPayment.receipt_file_url!), docPayment.receipt_file_name ?? "Receipt")}
                                      title={docPayment.payment_method ? `View receipt · ${docPayment.payment_method}` : "View receipt"}
                                      aria-label="View receipt"
                                      className="text-blue-500 hover:text-blue-700 cursor-pointer p-1 transition-colors"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                    </button>
                                  ) : docPayment ? (
                                    <label
                                      title="Upload receipt"
                                      aria-label="Upload receipt"
                                      className="text-gray-400 hover:text-amber-600 cursor-pointer p-1 transition-colors inline-flex items-center"
                                    >
                                      <input
                                        type="file"
                                        accept="application/pdf,image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) uploadReceipt(docPayment.id, f);
                                          e.target.value = "";
                                        }}
                                      />
                                      <Receipt className="w-3.5 h-3.5" />
                                    </label>
                                  ) : null}
                                  {/* Divider between payment actions and doc actions */}
                                  {docPayment && <span className="mx-0.5 h-4 w-px bg-gray-200" aria-hidden />}
                                  <EditOnly>
                                  <button
                                    aria-label={`Edit ${doc.name}`}
                                    title="Edit"
                                    onClick={() => editingDocId === doc.id ? setEditingDocId(null) : startEditDoc(doc)}
                                    className={`p-1 cursor-pointer transition-colors ${editingDocId === doc.id ? "text-blue-500" : "text-gray-400 hover:text-blue-500"}`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  </EditOnly>
                                  <button
                                    aria-label={`Preview ${doc.name}`}
                                    title="Preview"
                                    onClick={() => onPreview(fileDownloadUrl(doc.file_url), doc.name)}
                                    className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a
                                    href={fileDownloadUrl(doc.file_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Download ${doc.name}`}
                                    title="Download"
                                    className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <EditOnly>
                                  <button
                                    disabled={loading}
                                    aria-label={`Remove ${doc.name} from this draw`}
                                    title="Remove from draw (keeps the document)"
                                    onClick={() => removeDocFromDraw(doc)}
                                    className="text-gray-400 hover:text-amber-600 disabled:opacity-50 p-1 cursor-pointer transition-colors"
                                  >
                                    <Unlink className="w-3.5 h-3.5" />
                                  </button>
                                  </EditOnly>
                                  <EditOnly>
                                  <button
                                    disabled={loading}
                                    aria-label={`Delete ${doc.name}`}
                                    title="Delete"
                                    onClick={() => deleteDoc(doc.id)}
                                    className="text-gray-400 hover:text-red-500 disabled:opacity-50 p-1 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  </EditOnly>
                                </div>
                              </td>
                            </tr>
                            {editingDocId === doc.id && (
                              <tr className="bg-blue-50">
                                <td colSpan={8} className="px-3 py-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-0.5">Category / Line #</label>
                                      <select
                                        value={editDocForm.line_item_number}
                                        onChange={(e) => setEditDocForm((prev) => ({ ...prev, line_item_number: e.target.value }))}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="">Select category...</option>
                                        {DEFAULT_BUDGET_LINE_ITEMS.map(item => (
                                          <option key={item.line_number} value={String(item.line_number)}>
                                            {item.line_number}. {item.description}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-0.5">Type</label>
                                      <input
                                        value={editDocForm.doc_type}
                                        onChange={(e) => setEditDocForm((prev) => ({ ...prev, doc_type: e.target.value }))}
                                        placeholder="Invoice, Receipt, etc."
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-0.5">Vendor</label>
                                      <input
                                        value={editDocForm.vendor}
                                        onChange={(e) => setEditDocForm((prev) => ({ ...prev, vendor: e.target.value }))}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-xs text-gray-500 mb-0.5">Filename</label>
                                      <input
                                        value={editDocForm.name}
                                        onChange={(e) => setEditDocForm((prev) => ({ ...prev, name: e.target.value }))}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    {(() => {
                                      const p = payments.find((pp) => pp.invoice_file_url === doc.file_url);
                                      if (!p) return null;
                                      return (
                                        <>
                                          <div>
                                            <label className="block text-xs text-gray-500 mb-0.5">Amount</label>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={editDocForm.amount}
                                              onChange={(e) => setEditDocForm((prev) => ({ ...prev, amount: formatCurrencyInput(e.target.value) }))}
                                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs text-gray-500 mb-0.5">Payment Status</label>
                                            <select
                                              value={editDocForm.status}
                                              onChange={(e) => setEditDocForm((prev) => ({ ...prev, status: e.target.value }))}
                                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                              <option value="pending">Needs Draw</option>
                                              <option value="paid_personal">Paid Personal</option>
                                              <option value="reimbursed">Reimbursed</option>
                                              <option value="paid_from_draw">Paid</option>
                                            </select>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button onClick={saveEditDoc} className="px-3 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800 transition-colors">Save Changes</button>
                                    <button onClick={() => setEditingDocId(null)} className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">Cancel</button>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 font-semibold">
                            <td colSpan={5} className="py-2 pr-3 text-xs text-right text-gray-700">Total</td>
                            <td className="py-2 pr-3 text-xs text-right tabular-nums text-gray-900">
                              {fmt(
                                drawDocs.reduce((sum, d) => {
                                  const p = payments.find((p) => p.invoice_file_url === d.file_url);
                                  return sum + (p?.amount ?? 0);
                                }, 0),
                              )}
                            </td>
                            <td className="py-2" colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile card layout */}
                    <div className="sm:hidden space-y-2">
                      {drawDocs.map((doc) => (
                        <div key={doc.id} className="bg-gray-50 rounded-lg p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={fileDownloadUrl(doc.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 truncate flex-1 transition-colors"
                            >
                              {doc.name}
                            </a>
                            <div className="flex items-center gap-1 shrink-0">
                              <EditOnly>
                              <button
                                aria-label={`Edit ${doc.name}`}
                                onClick={() => editingDocId === doc.id ? setEditingDocId(null) : startEditDoc(doc)}
                                className={`p-1 cursor-pointer transition-colors ${editingDocId === doc.id ? "text-blue-500" : "text-gray-400 hover:text-blue-500"}`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              </EditOnly>
                              <button
                                aria-label={`Preview ${doc.name}`}
                                onClick={() => onPreview(fileDownloadUrl(doc.file_url), doc.name)}
                                className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={fileDownloadUrl(doc.file_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Download ${doc.name}`}
                                className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <EditOnly>
                              <button
                                disabled={loading}
                                aria-label={`Remove ${doc.name} from this draw`}
                                title="Remove from draw (keeps the document)"
                                onClick={() => removeDocFromDraw(doc)}
                                className="text-gray-400 hover:text-amber-600 disabled:opacity-50 p-1 cursor-pointer transition-colors"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                              </EditOnly>
                              <EditOnly>
                              <button
                                disabled={loading}
                                aria-label={`Delete ${doc.name}`}
                                onClick={() => deleteDoc(doc.id)}
                                className="text-gray-400 hover:text-red-500 disabled:opacity-50 p-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              </EditOnly>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            {doc.line_item_number !== null && <span>#{doc.line_item_number}</span>}
                            {doc.doc_type && <span>{doc.doc_type}</span>}
                            {doc.vendor && <span>{doc.vendor}</span>}
                            {(() => {
                              const p = payments.find((p) => p.invoice_file_url === doc.file_url);
                              return p ? <span className="font-medium text-gray-700 tabular-nums">{fmt(p.amount)}</span> : null;
                            })()}
                          </div>
                          {editingDocId === doc.id && (
                            <div className="pt-2 border-t border-blue-200 space-y-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Category / Line #</label>
                                <select
                                  value={editDocForm.line_item_number}
                                  onChange={(e) => setEditDocForm((prev) => ({ ...prev, line_item_number: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select category...</option>
                                  {DEFAULT_BUDGET_LINE_ITEMS.map(item => (
                                    <option key={item.line_number} value={String(item.line_number)}>
                                      {item.line_number}. {item.description}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Type</label>
                                <input
                                  value={editDocForm.doc_type}
                                  onChange={(e) => setEditDocForm((prev) => ({ ...prev, doc_type: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Vendor</label>
                                <input
                                  value={editDocForm.vendor}
                                  onChange={(e) => setEditDocForm((prev) => ({ ...prev, vendor: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-0.5">Filename</label>
                                <input
                                  value={editDocForm.name}
                                  onChange={(e) => setEditDocForm((prev) => ({ ...prev, name: e.target.value }))}
                                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              {(() => {
                                const p = payments.find((pp) => pp.invoice_file_url === doc.file_url);
                                if (!p) return null;
                                return (
                                  <>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-0.5">Amount</label>
                                      <input
                                        type="text"
                                        inputMode="decimal"
                                        value={editDocForm.amount}
                                        onChange={(e) => setEditDocForm((prev) => ({ ...prev, amount: formatCurrencyInput(e.target.value) }))}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-0.5">Payment Status</label>
                                      <select
                                        value={editDocForm.status}
                                        onChange={(e) => setEditDocForm((prev) => ({ ...prev, status: e.target.value }))}
                                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      >
                                        <option value="pending">Needs Draw</option>
                                        <option value="paid_personal">Paid Personal</option>
                                        <option value="reimbursed">Reimbursed</option>
                                        <option value="paid_from_draw">Paid</option>
                                      </select>
                                    </div>
                                  </>
                                );
                              })()}
                              <div className="flex gap-2">
                                <button onClick={saveEditDoc} className="flex-1 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800 transition-colors">Save Changes</button>
                                <button onClick={() => setEditingDocId(null)} className="flex-1 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Edit Draw Form */}
                {editingDraw === draw.id && (
                  <>
                    <Separator className="my-3" />
                    <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 font-medium mb-1">Draw #</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            value={editDrawForm.draw_number}
                            onChange={(e) => setEditDrawForm({ ...editDrawForm, draw_number: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 font-medium mb-1">Amount</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={editDrawForm.amount}
                            onChange={(e) => setEditDrawForm({ ...editDrawForm, amount: formatCurrencyInput(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 font-medium mb-1">Description</label>
                          <input
                            type="text"
                            value={editDrawForm.description}
                            onChange={(e) => setEditDrawForm({ ...editDrawForm, description: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                      {/* Dates — funded_date drives the accrued_interest
                       *  calc, so this is the place to correct a draw that
                       *  was recorded after the fact with the wrong date. */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-600 font-medium mb-1">
                            Submitted Date
                          </label>
                          <input
                            type="date"
                            value={editDrawForm.submitted_date}
                            onChange={(e) => setEditDrawForm({ ...editDrawForm, submitted_date: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 font-medium mb-1">
                            Funded Date{" "}
                            <span className="text-[10px] text-gray-500 font-normal">(drives interest)</span>
                          </label>
                          <input
                            type="date"
                            value={editDrawForm.funded_date}
                            onChange={(e) => setEditDrawForm({ ...editDrawForm, funded_date: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 font-medium mb-1">Notes</label>
                        <textarea
                          value={editDrawForm.notes}
                          onChange={(e) => setEditDrawForm({ ...editDrawForm, notes: e.target.value })}
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={loading}
                          onClick={() => saveEditDraw(draw.id)}
                          className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {loading ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={() => setEditingDraw(null)}
                          className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Draw Actions */}
                <Separator className="my-3" />
                <div className="flex flex-wrap items-center gap-2">
                  <EditOnly>
                  <select
                    disabled={loading}
                    value={draw.status}
                    aria-label={`Change status for Draw #${draw.draw_number}`}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateDrawStatus(draw, e.target.value as DrawRequestStatus);
                    }}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-black cursor-pointer transition-colors"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="funded">Funded</option>
                    <option value="denied">Denied</option>
                  </select>
                  </EditOnly>
                  {drawDocs.length > 0 && (
                    <button
                      disabled={loading || scanningDrawId === draw.id}
                      aria-label={`Re-scan all documents in Draw #${draw.draw_number}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        rescanDrawDocs(draw.id, drawDocs);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 cursor-pointer min-h-[36px] px-2 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${scanningDrawId === draw.id ? "animate-spin" : ""}`} />
                      {scanningDrawId === draw.id && scanProgress
                        ? `Scanning ${scanProgress.done} of ${scanProgress.total}...`
                        : "Re-scan All"}
                    </button>
                  )}
                  <EditOnly>
                  <button
                    disabled={loading}
                    aria-label={`Edit Draw #${draw.draw_number}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditDraw(draw);
                    }}
                    className="text-xs text-gray-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer min-h-[36px] px-2 flex items-center gap-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    disabled={loading}
                    aria-label={`Delete Draw #${draw.draw_number}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDraw(draw.id);
                    }}
                    className="text-xs text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[36px] px-2 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  </EditOnly>
                </div>
              </CardContent>
            )}
          </ShadCard>
        );
      })}
    </div>

    {/* QBO Pay Contractor Modal - requires QBO Contractor Payments add-on */}
    {QBO_CONTRACTOR_PAYMENTS_ENABLED && payModalPayment && (
      <QBOPayContractorModal
        contractorPaymentId={payModalPayment.id}
        contractorName={payModalPayment.contractor_name}
        amount={payModalPayment.amount}
        onClose={() => setPayModalPayment(null)}
        onPaid={() => { setPayModalPayment(null); router.refresh(); }}
      />
    )}
    </>
  );
}
