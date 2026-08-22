"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, ChevronDown, ChevronRight, Circle, Copy, Edit3, LinkIcon,
  MessageSquare, Paperclip, Send, Trash2, XCircle,
} from "lucide-react";
import type {
  BudgetLineItem, Contractor, ContractorPayment, DrawRequest,
} from "@/lib/types/database";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import {
  formatCurrency as fmt, formatCurrencyInput,
} from "@/lib/formatters";
import {
  Card as ShadCard, CardHeader, CardTitle, CardContent, CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QBOPayContractorModal from "@/components/admin/QBOPayContractorModal";
import { AddButton, EmptyState } from "@/components/admin/project/shared/Primitives";
import { EditOnly } from "@/components/admin/project/shared/EditContext";
import { fmtDate } from "@/components/admin/project/shared/format";
import { QBO_CONTRACTOR_PAYMENTS_ENABLED } from "@/components/admin/project/shared/constants";
import { paymentLeftBorder } from "@/components/admin/project/shared/statusStyles";
import { usePaymentActions } from "@/components/admin/project/shared/usePaymentActions";
import { useInvoiceUploadLinks } from "@/components/admin/project/shared/useInvoiceUploadLinks";

export function PaymentsTab({
  projectId,
  projectName,
  payments,
  contractors,
  drawRequests,
  budgetLineItems,
  mutate,
  loading,
  onPreview,
}: {
  projectId: string;
  projectName: string;
  payments: ContractorPayment[];
  contractors: Contractor[];
  drawRequests: DrawRequest[];
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

  // Payment CRUD and the invoice-link subsystem are shared with DrawsTab.
  // Destructured back into the original local names so the JSX below is
  // untouched by the extraction.
  const {
    showForm, setShowForm,
    form, setForm,
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

  return (
    <>
    <ShadCard>
      <CardHeader>
        <CardTitle>Contractor Payments</CardTitle>
        {!showForm && (
          <CardAction>
            <AddButton label="Add Payment" onClick={() => setShowForm(true)} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {/* Contractor Upload Links (collapsible) — staff only */}
        <EditOnly>
        <ShadCard className="mb-4">
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
                  <label htmlFor="upload-link-contractor" className="block text-sm text-gray-700 font-medium mb-1">
                    Contractor
                  </label>
                  <select
                    id="upload-link-contractor"
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

        {showForm && (
          <ShadCard className="mb-4 bg-gray-50 border-dashed">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="pay-contractor" className="block text-sm text-gray-700 font-medium mb-1">
                      Contractor <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="pay-contractor"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                      value={form.contractor_id}
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
                  {form.contractor_id === "other" && (
                    <div>
                      <label htmlFor="pay-contractor-name" className="block text-sm text-gray-700 font-medium mb-1">
                        Contractor Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="pay-contractor-name"
                        placeholder="Contractor Name"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        value={form.contractor_name}
                        onChange={(e) =>
                          setForm({ ...form, contractor_name: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <div>
                    <label htmlFor="pay-amount" className="block text-sm text-gray-700 font-medium mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="pay-amount"
                      placeholder="$0.00"
                      type="text"
                      inputMode="decimal"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: formatCurrencyInput(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-desc" className="block text-sm text-gray-700 font-medium mb-1">
                      Description
                    </label>
                    <input
                      id="pay-desc"
                      placeholder="Description"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-due" className="block text-sm text-gray-700 font-medium mb-1">
                      Due Date
                    </label>
                    <input
                      id="pay-due"
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-invoice" className="block text-sm text-gray-700 font-medium mb-1">
                      Attach Invoice (optional)
                    </label>
                    <input
                      id="pay-invoice"
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
                      setShowForm(false);
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

        {payments.length === 0 && !showForm && (
          <EmptyState label="No payments yet" />
        )}

        <div className="divide-y divide-gray-100">
          {payments.map((p) => (
            <div key={p.id}>
              {editingPayment === p.id ? (
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
                      {/* Budget line assignment — explicit override for
                       *  BudgetTab spentByLine matching. Without this,
                       *  paid_personal entries with no invoice filename
                       *  drop into the "Unassigned" bucket. */}
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
              ) : (
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 border-l-4 pl-3 ${paymentLeftBorder(p.status)}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
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
                      {(() => {
                        const linkedDraw = p.draw_request_id ? drawRequests.find((d) => d.id === p.draw_request_id) : null;
                        const drawFunded = linkedDraw?.status === "funded";
                        return (
                          <>
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
                          </>
                        );
                      })()}
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
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {fmt(p.amount)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      Due {fmtDate(p.due_date)}
                    </span>
                    {(() => {
                      const linkedDraw = p.draw_request_id ? drawRequests.find((d) => d.id === p.draw_request_id) : null;
                      const drawFunded = linkedDraw?.status === "funded";

                      // Pending + draw not funded → Blake can front it
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

                      // Pending + draw funded → Blake can pay with draw funds
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

                      // Paid from draw but no receipt yet → prompt to upload
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

                      // Paid from draw + receipt uploaded → show receipt link
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
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </ShadCard>

    {/* QBO Pay Contractor Modal — requires QBO Contractor Payments add-on */}
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
