"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  CreditCard,
  ClipboardList,
  FolderOpen,
  CheckSquare,
  Plus,
  Trash2,
  X,
  Download,
  Upload,
  Edit3,
  Check,
  LayoutDashboard,
  ArrowRightCircle,
  FileUp,
  MessageSquare,
  Clock,
  TrendingUp,
  TrendingDown,
  Banknote,
  Receipt,
  Circle,
  Paperclip,
  LinkIcon,
  Copy,
  XCircle,
  Send,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type {
  Project,
  Invoice,
  ContractorPayment,
  Contractor,
  Permit,
  Document,
  Task,
  DrawRequest,
  ActivityLogEntry,
  ProjectStatus,
  InvoiceStatus,
  PermitStatus,
  DrawRequestStatus,
  DocumentCategory,
  InvoiceUploadToken,
} from "@/lib/types/database";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  INVOICE_STATUS_COLORS,
  PERMIT_STATUS_COLORS,
  DRAW_STATUS_COLORS,
} from "@/lib/types/database";
import { formatCurrencyInput, unformatCurrency } from "@/lib/formatters";
import { parseDrawFilename } from "@/lib/parse-draw-filename";
import {
  Card as ShadCard,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const fmtDate = (d: string | null) => {
  if (!d) return "--";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const fmtFileSize = (bytes: number | null) => {
  if (!bytes) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 5) return `${weeks}w ago`;
  return `${months}mo ago`;
}

/** Left border color for status-based cards */
function invoiceLeftBorder(status: InvoiceStatus): string {
  switch (status) {
    case "paid": return "border-l-green-500";
    case "overdue": return "border-l-red-500";
    case "sent": return "border-l-blue-500";
    default: return "border-l-gray-300";
  }
}

function permitLeftBorder(status: PermitStatus): string {
  switch (status) {
    case "approved": return "border-l-green-500";
    case "denied": return "border-l-red-500";
    case "expired": return "border-l-orange-500";
    case "applied": return "border-l-blue-500";
    default: return "border-l-gray-300";
  }
}

function drawLeftBorder(status: DrawRequestStatus): string {
  switch (status) {
    case "funded": return "border-l-green-500";
    case "denied": return "border-l-red-500";
    case "approved": return "border-l-blue-500";
    case "submitted": return "border-l-yellow-500";
    default: return "border-l-gray-300";
  }
}

function paymentLeftBorder(status: string): string {
  return status === "paid" ? "border-l-green-500" : "border-l-yellow-500";
}

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "invoices", label: "Invoices", icon: FileText },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "draws", label: "Draws", icon: Banknote },
  { key: "permits", label: "Permits", icon: ClipboardList },
  { key: "documents", label: "Documents", icon: FolderOpen },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "activity", label: "Activity", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  project: Project;
  invoices: Invoice[];
  payments: ContractorPayment[];
  permits: Permit[];
  documents: Document[];
  tasks: Task[];
  drawRequests: DrawRequest[];
  activityLog: ActivityLogEntry[];
  contractors: Contractor[];
}

// ---------------------------------------------------------------------------
// Activity logger helper
// ---------------------------------------------------------------------------

async function logActivity(projectId: string, action: string, description: string) {
  await fetch(`/api/admin/projects/${projectId}/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, description }),
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ProjectDetail({
  project,
  invoices,
  payments,
  permits,
  documents,
  tasks,
  drawRequests,
  activityLog,
  contractors,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(false);

  // ---- financial calculations -------------------------------------------
  const contractValue = project.contract_value ?? project.estimated_value ?? 0;
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
  const totalCollected = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.amount, 0);
  const totalCosts = payments.reduce((s, p) => s + p.amount, 0);
  const profit = totalCollected - totalCosts;

  // ---- generic mutation helper -------------------------------------------
  async function mutate(
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) {
    setLoading(true);
    try {
      const isFormData = body instanceof FormData;
      const res = await fetch(url, {
        method,
        ...(body && !isFormData
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            }
          : {}),
        ...(isFormData ? { body } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Request failed");
      }
      router.refresh();
      return res;
    } finally {
      setLoading(false);
    }
  }

  // ---- status change -----------------------------------------------------
  async function changeStatus(status: ProjectStatus) {
    await mutate(`/api/admin/projects/${project.id}`, "PATCH", { status });
    await logActivity(project.id, "status_change", `Status changed to ${PROJECT_STATUS_LABELS[status]}`);
  }

  // ---- render ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <Header
          project={project}
          onStatusChange={changeStatus}
          loading={loading}
        />

        {/* Financial Summary Bar */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <FinancialCard
            icon={<Receipt className="w-4 h-4 text-blue-500" />}
            label="Contract Value"
            value={contractValue}
          />
          <FinancialCard
            icon={<FileText className="w-4 h-4 text-indigo-500" />}
            label="Invoiced"
            value={totalInvoiced}
          />
          <FinancialCard
            icon={<DollarSign className="w-4 h-4 text-green-500" />}
            label="Collected"
            value={totalCollected}
          />
          <FinancialCard
            icon={<CreditCard className="w-4 h-4 text-orange-500" />}
            label="Costs"
            value={totalCosts}
          />
          <FinancialCard
            icon={
              profit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )
            }
            label="Profit"
            value={profit}
            colored
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("invoices")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm cursor-pointer transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Add Invoice
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm cursor-pointer transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Add Task
          </button>
          <Link
            href={`/admin/projects/${project.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm cursor-pointer transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Project
          </Link>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabKey)}
          className="mt-6"
        >
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.key} value={t.key}>
                  <Icon className="w-4 h-4" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab project={project} mutate={mutate} />
          </TabsContent>
          <TabsContent value="invoices">
            <InvoicesTab
              projectId={project.id}
              invoices={invoices}
              mutate={mutate}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab
              projectId={project.id}
              projectName={project.name}
              payments={payments}
              contractors={contractors}
              mutate={mutate}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="draws">
            <DrawsTab
              projectId={project.id}
              draws={drawRequests}
              documents={documents}
              mutate={mutate}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="permits">
            <PermitsTab
              projectId={project.id}
              permits={permits}
              mutate={mutate}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab
              projectId={project.id}
              documents={documents}
              mutate={mutate}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksTab
              projectId={project.id}
              tasks={tasks}
              mutate={mutate}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityTab activityLog={activityLog} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ===========================================================================
// Financial Card
// ===========================================================================

function FinancialCard({
  icon,
  label,
  value,
  colored,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colored?: boolean;
}) {
  const colorClass = colored
    ? value >= 0
      ? "text-green-600"
      : "text-red-600"
    : "text-gray-900";

  return (
    <ShadCard className="p-3 sm:p-4">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-gray-500 font-medium">{label}</span>
        </div>
        <p className={`text-lg sm:text-xl font-bold tabular-nums ${colorClass}`}>
          {fmt(value)}
        </p>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Header
// ===========================================================================

function Header({
  project,
  onStatusChange,
  loading,
}: {
  project: Project;
  onStatusChange: (s: ProjectStatus) => void;
  loading: boolean;
}) {
  const address = [project.address, project.city, project.state, project.zip]
    .filter(Boolean)
    .join(", ");

  return (
    <ShadCard className="p-4 sm:p-6">
      <CardContent className="p-0">
        {/* Back link + title */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {project.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${PROJECT_STATUS_COLORS[project.status]}`}
              >
                <Circle className="w-2 h-2 fill-current" />
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
              <select
                disabled={loading}
                value={project.status}
                aria-label="Change project status"
                onChange={(e) =>
                  onStatusChange(e.target.value as ProjectStatus)
                }
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-black cursor-pointer transition-colors"
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="tabular-nums">
                {project.estimated_value ? fmt(project.estimated_value) : "--"}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-500" />
              {fmtDate(project.start_date)}
              {project.end_date ? ` - ${fmtDate(project.end_date)}` : ""}
            </span>
          </div>
        </div>

        {/* Client info row */}
        <Separator className="my-4" />
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {project.client_name}
          </span>
          {project.client_email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {project.client_email}
            </span>
          )}
          {project.client_phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {project.client_phone}
            </span>
          )}
          {address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {address}
            </span>
          )}
        </div>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Overview Tab
// ===========================================================================

function OverviewTab({
  project,
  mutate,
}: {
  project: Project;
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) => Promise<Response | undefined>;
}) {
  const [editingField, setEditingField] = useState<
    "description" | "notes" | null
  >(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(field: "description" | "notes") {
    setEditValue(project[field] ?? "");
    setEditingField(field);
  }

  async function saveEdit() {
    if (!editingField) return;
    await mutate(`/api/admin/projects/${project.id}`, "PATCH", {
      [editingField]: editValue,
    });
    setEditingField(null);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Description card */}
      <ShadCard>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          {editingField === "description" ? (
            <div className="space-y-2">
              <label htmlFor="edit-description" className="block text-sm text-gray-700 font-medium">
                Description
              </label>
              <textarea
                id="edit-description"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                rows={4}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1 text-sm bg-black text-white px-3 py-1.5 min-h-[44px] rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-sm text-gray-600 px-3 py-1.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {project.description || "No description yet."}
              </p>
              <button
                onClick={() => startEdit("description")}
                aria-label="Edit description"
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-black cursor-pointer transition-opacity"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </ShadCard>

      {/* Notes card */}
      <ShadCard>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {editingField === "notes" ? (
            <div className="space-y-2">
              <label htmlFor="edit-notes" className="block text-sm text-gray-700 font-medium">
                Notes
              </label>
              <textarea
                id="edit-notes"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                rows={4}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1 text-sm bg-black text-white px-3 py-1.5 min-h-[44px] rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
                <button
                  onClick={() => setEditingField(null)}
                  className="text-sm text-gray-600 px-3 py-1.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {project.notes || "No notes yet."}
              </p>
              <button
                onClick={() => startEdit("notes")}
                aria-label="Edit notes"
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-black cursor-pointer transition-opacity"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </ShadCard>
    </div>
  );
}

// ===========================================================================
// Invoices Tab
// ===========================================================================

function InvoicesTab({
  projectId,
  invoices,
  mutate,
  loading,
}: {
  projectId: string;
  invoices: Invoice[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    invoice_number: "",
    description: "",
    amount: "",
    status: "draft" as InvoiceStatus,
    due_date: "",
  });

  async function addInvoice() {
    if (!form.invoice_number || !form.amount) return;
    await mutate(`/api/admin/projects/${projectId}/invoices`, "POST", {
      invoice_number: form.invoice_number,
      description: form.description || null,
      amount: parseFloat(unformatCurrency(form.amount)),
      status: form.status,
      due_date: form.due_date || null,
    });
    setForm({
      invoice_number: "",
      description: "",
      amount: "",
      status: "draft",
      due_date: "",
    });
    setShowForm(false);
  }

  async function markPaid(inv: Invoice) {
    await mutate(`/api/admin/projects/${projectId}/invoices`, "PATCH", {
      id: inv.id,
      status: "paid",
      paid_date: new Date().toISOString().split("T")[0],
    });
  }

  async function deleteInvoice(id: string) {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;
    await mutate(`/api/admin/projects/${projectId}/invoices`, "DELETE", { id });
  }

  return (
    <ShadCard>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
        {!showForm && (
          <CardAction>
            <AddButton label="Add Invoice" onClick={() => setShowForm(true)} />
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
                    <label htmlFor="inv-number" className="block text-sm text-gray-700 font-medium mb-1">
                      Invoice # <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="inv-number"
                      placeholder="Invoice #"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.invoice_number}
                      onChange={(e) =>
                        setForm({ ...form, invoice_number: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-amount" className="block text-sm text-gray-700 font-medium mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="inv-amount"
                      placeholder="$0.00"
                      type="text"
                      inputMode="decimal"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: formatCurrencyInput(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-desc" className="block text-sm text-gray-700 font-medium mb-1">
                      Description
                    </label>
                    <input
                      id="inv-desc"
                      placeholder="Description"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-due" className="block text-sm text-gray-700 font-medium mb-1">
                      Due Date
                    </label>
                    <input
                      id="inv-due"
                      type="date"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="inv-status" className="block text-sm text-gray-700 font-medium mb-1">
                    Status
                  </label>
                  <select
                    id="inv-status"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as InvoiceStatus })
                    }
                    className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={loading}
                    onClick={addInvoice}
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

        {invoices.length === 0 && !showForm && (
          <EmptyState label="No invoices yet" />
        )}

        <div className="divide-y divide-gray-100">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 border-l-4 pl-3 ${invoiceLeftBorder(inv.status)}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-gray-900">
                    {inv.invoice_number}
                  </span>
                  <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1 rounded-full ${INVOICE_STATUS_COLORS[inv.status]}`}
                  >
                    <Circle className="w-1.5 h-1.5 fill-current" />
                    {inv.status}
                  </Badge>
                </div>
                {inv.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {inv.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-900 tabular-nums">
                  {fmt(inv.amount)}
                </span>
                <span className="text-gray-500 text-xs">
                  Due {fmtDate(inv.due_date)}
                </span>
                {inv.status !== "paid" && (
                  <button
                    disabled={loading}
                    onClick={() => markPaid(inv)}
                    className="text-xs text-green-600 hover:underline disabled:opacity-50 cursor-pointer min-h-[44px] px-2 transition-colors"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  disabled={loading}
                  aria-label={`Delete invoice ${inv.invoice_number}`}
                  onClick={() => deleteInvoice(inv.id)}
                  className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Payments Tab
// ===========================================================================

function PaymentsTab({
  projectId,
  projectName,
  payments,
  contractors,
  mutate,
  loading,
}: {
  projectId: string;
  projectName: string;
  payments: ContractorPayment[];
  contractors: Contractor[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    contractor_id: "",
    contractor_name: "",
    description: "",
    amount: "",
    due_date: "",
  });
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  // --- Upload Links state ---
  const [uploadLinksOpen, setUploadLinksOpen] = useState(false);
  const [uploadLinks, setUploadLinks] = useState<InvoiceUploadToken[]>([]);
  const [uploadLinkContractorId, setUploadLinkContractorId] = useState("");
  const [uploadLinkLoading, setUploadLinkLoading] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const fetchUploadLinks = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/upload-links`);
      if (res.ok) {
        const data = await res.json();
        setUploadLinks(data);
      }
    } catch {
      // silently fail
    }
  }, [projectId]);

  useEffect(() => {
    fetchUploadLinks();
  }, [fetchUploadLinks]);

  async function generateUploadLink() {
    if (!uploadLinkContractorId) return;
    const contractor = contractors.find((c) => c.id === uploadLinkContractorId);
    if (!contractor) return;
    setUploadLinkLoading(true);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/upload-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractor_id: contractor.id,
          contractor_name: contractor.name,
          project_name: projectName,
        }),
      });
      if (res.ok) {
        await fetchUploadLinks();
        setUploadLinkContractorId("");
      }
    } finally {
      setUploadLinkLoading(false);
    }
  }

  async function deactivateUploadLink(tokenId: string) {
    setUploadLinkLoading(true);
    try {
      const res = await fetch(
        `/api/admin/projects/${projectId}/upload-links/${tokenId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        await fetchUploadLinks();
      }
    } finally {
      setUploadLinkLoading(false);
    }
  }

  function copyUploadLink(token: string, tokenId: string) {
    const url = `${window.location.origin}/submit-invoice/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedTokenId(tokenId);
    setTimeout(() => setCopiedTokenId(null), 2000);
  }

  function textUploadLink(token: string, contractorName: string, contractorId: string) {
    const contractor = contractors.find((c) => c.id === contractorId);
    if (!contractor?.phone) return;
    const url = `${window.location.origin}/submit-invoice/${token}`;
    const firstName = contractorName.split(" ")[0];
    const message = `Hi ${firstName}, please upload your invoice for ${projectName} here: ${url}`;
    window.open(`sms:${contractor.phone}?body=${encodeURIComponent(message)}`);
  }

  function handleContractorChange(value: string) {
    if (value === "other") {
      setForm({ ...form, contractor_id: "other", contractor_name: "" });
    } else if (value === "") {
      setForm({ ...form, contractor_id: "", contractor_name: "" });
    } else {
      const contractor = contractors.find((c) => c.id === value);
      setForm({
        ...form,
        contractor_id: value,
        contractor_name: contractor?.name ?? "",
      });
    }
  }

  async function addPayment() {
    if (!form.contractor_name || !form.amount) return;

    const fd = new FormData();
    fd.append("contractor_id", form.contractor_id);
    fd.append("contractor_name", form.contractor_name);
    fd.append("description", form.description);
    fd.append("amount", unformatCurrency(form.amount));
    fd.append("due_date", form.due_date);
    if (invoiceFile) fd.append("invoice_file", invoiceFile);

    await mutate(`/api/admin/projects/${projectId}/payments`, "POST", fd);
    setForm({ contractor_id: "", contractor_name: "", description: "", amount: "", due_date: "" });
    setInvoiceFile(null);
    setShowForm(false);
  }

  async function markPaid(p: ContractorPayment) {
    await mutate(`/api/admin/projects/${projectId}/payments`, "PATCH", {
      id: p.id,
      status: "paid",
      paid_date: new Date().toISOString().split("T")[0],
    });
  }

  async function deletePayment(id: string) {
    if (!window.confirm("Are you sure you want to delete this payment?")) return;
    await mutate(`/api/admin/projects/${projectId}/payments`, "DELETE", { id });
  }

  return (
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
        {/* Contractor Upload Links (collapsible) */}
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
            <div
              key={p.id}
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
                  <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-1 rounded-full ${
                      p.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    <Circle className="w-1.5 h-1.5 fill-current" />
                    {p.status}
                  </Badge>
                </div>
                {p.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {p.description}
                  </p>
                )}
                {p.invoice_file_url && (
                  <a
                    href={p.invoice_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                  >
                    <Paperclip className="w-3 h-3" />
                    {p.invoice_file_name ?? "Invoice"}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-gray-900 tabular-nums">
                  {fmt(p.amount)}
                </span>
                <span className="text-gray-500 text-xs">
                  Due {fmtDate(p.due_date)}
                </span>
                {p.status !== "paid" && (
                  <button
                    disabled={loading}
                    onClick={() => markPaid(p)}
                    className="text-xs text-green-600 hover:underline disabled:opacity-50 cursor-pointer min-h-[44px] px-2 transition-colors"
                  >
                    Mark Paid
                  </button>
                )}
                <button
                  disabled={loading}
                  aria-label={`Delete payment to ${p.contractor_name}`}
                  onClick={() => deletePayment(p.id)}
                  className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Draws Tab
// ===========================================================================

function DrawsTab({
  projectId,
  draws,
  documents,
  mutate,
  loading,
}: {
  projectId: string;
  draws: DrawRequest[];
  documents: Document[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    draw_number: "",
    description: "",
    amount: "",
  });
  const [expandedDraws, setExpandedDraws] = useState<Set<string>>(new Set());
  const [uploadingDrawId, setUploadingDrawId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  // Auto-expand the latest draw on first render
  useEffect(() => {
    if (draws.length > 0) {
      const sorted = [...draws].sort((a, b) => b.draw_number - a.draw_number);
      setExpandedDraws(new Set([sorted[0].id]));
    }
  }, [draws.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Documents grouped by draw
  const unassignedDocs = documents.filter((d) => !d.draw_request_id);
  const docsByDraw = draws.reduce<Record<string, Document[]>>((acc, draw) => {
    acc[draw.id] = documents
      .filter((d) => d.draw_request_id === draw.id)
      .sort((a, b) => (a.line_item_number ?? 999) - (b.line_item_number ?? 999));
    return acc;
  }, {});

  // Financial summaries
  const totalDraws = draws.reduce((s, d) => s + d.amount, 0);
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

  async function addDraw() {
    const drawNum = form.draw_number ? parseInt(form.draw_number) : nextDrawNumber;
    const amount = form.amount ? parseFloat(unformatCurrency(form.amount)) : 0;
    if (!amount) return;
    await mutate(`/api/admin/projects/${projectId}/draws`, "POST", {
      draw_number: drawNum,
      description: form.description || null,
      amount,
      status: "draft",
      notes: null,
    });
    setForm({ draw_number: "", description: "", amount: "" });
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

  async function deleteDraw(id: string) {
    if (!window.confirm("Are you sure you want to delete this draw request?")) return;
    await mutate(`/api/admin/projects/${projectId}/draws/${id}`, "DELETE");
  }

  async function assignDocToDraw(docId: string, drawId: string) {
    await mutate(`/api/admin/projects/${projectId}/documents`, "PATCH", {
      id: docId,
      draw_request_id: drawId,
    });
  }

  async function deleteDoc(id: string) {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    await mutate(`/api/admin/projects/${projectId}/documents`, "DELETE", { id });
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

    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      const parsed = parseDrawFilename(file.name);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", "draw_request");
      fd.append("draw_request_id", drawId);
      if (parsed.lineItemNumber !== null) {
        fd.append("line_item_number", String(parsed.lineItemNumber));
      }
      if (parsed.vendor) {
        fd.append("vendor", parsed.vendor);
      }
      if (parsed.docType) {
        fd.append("doc_type", parsed.docType);
      }
      await mutate(`/api/admin/projects/${projectId}/documents`, "POST", fd);
      setUploadProgress({ done: i + 1, total: uploadFiles.length });
    }

    setUploadFiles([]);
    setUploadingDrawId(null);
    setUploading(false);
    setUploadProgress(null);
  }

  const sortedDraws = [...draws].sort((a, b) => b.draw_number - a.draw_number);

  return (
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
                    Amount <span className="text-red-500">*</span>
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
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  onClick={addDraw}
                  className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {loading ? "Saving..." : "Create Draw"}
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
                        href={doc.file_url}
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

                {/* Upload Files Button */}
                {!isUploading && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadingDrawId(draw.id);
                      setUploadFiles([]);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-black mb-3 cursor-pointer min-h-[36px] px-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Files to Draw
                  </button>
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
                        <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                          {uploadFiles.map((f, i) => {
                            const parsed = parseDrawFilename(f.name);
                            return (
                              <div
                                key={`${f.name}-${i}`}
                                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="truncate text-gray-900 text-xs">{f.name}</p>
                                  <p className="text-xs text-gray-400">
                                    {parsed.lineItemNumber !== null && `#${parsed.lineItemNumber} `}
                                    {parsed.category && `${parsed.category} `}
                                    {parsed.docType && `/ ${parsed.docType} `}
                                    {parsed.vendor && `- ${parsed.vendor}`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => removeUploadFile(i)}
                                  aria-label={`Remove ${f.name}`}
                                  className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
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
                            <th className="pb-2 font-medium w-20"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {drawDocs.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                              <td className="py-2 pr-3 text-xs text-gray-500 tabular-nums">
                                {doc.line_item_number ?? "--"}
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-700">
                                {doc.line_item_number !== null
                                  ? parseDrawFilename(doc.name).category ?? doc.category
                                  : doc.category}
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-700">
                                {doc.doc_type ?? "--"}
                              </td>
                              <td className="py-2 pr-3 text-xs text-gray-700">
                                {doc.vendor ?? "--"}
                              </td>
                              <td className="py-2 pr-3 text-xs min-w-0">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 truncate block max-w-[200px] transition-colors"
                                  title={doc.name}
                                >
                                  {doc.name}
                                </a>
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-1">
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Download ${doc.name}`}
                                    className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    disabled={loading}
                                    aria-label={`Delete ${doc.name}`}
                                    onClick={() => deleteDoc(doc.id)}
                                    className="text-gray-400 hover:text-red-500 disabled:opacity-50 p-1 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile card layout */}
                    <div className="sm:hidden space-y-2">
                      {drawDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="bg-gray-50 rounded-lg p-3 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 truncate flex-1 transition-colors"
                            >
                              {doc.name}
                            </a>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Download ${doc.name}`}
                                className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                disabled={loading}
                                aria-label={`Delete ${doc.name}`}
                                onClick={() => deleteDoc(doc.id)}
                                className="text-gray-400 hover:text-red-500 disabled:opacity-50 p-1 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            {doc.line_item_number !== null && (
                              <span>#{doc.line_item_number}</span>
                            )}
                            {doc.doc_type && <span>{doc.doc_type}</span>}
                            {doc.vendor && <span>{doc.vendor}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Draw Actions */}
                <Separator className="my-3" />
                <div className="flex flex-wrap items-center gap-2">
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
                </div>
              </CardContent>
            )}
          </ShadCard>
        );
      })}
    </div>
  );
}

// ===========================================================================
// Permits Tab
// ===========================================================================

function PermitsTab({
  projectId,
  permits,
  mutate,
  loading,
}: {
  projectId: string;
  permits: Permit[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    permit_type: "",
    permit_number: "",
    status: "not_applied" as PermitStatus,
    applied_date: "",
    notes: "",
  });

  async function addPermit() {
    if (!form.permit_type) return;
    await mutate(`/api/admin/projects/${projectId}/permits`, "POST", {
      permit_type: form.permit_type,
      permit_number: form.permit_number || null,
      status: form.status,
      applied_date: form.applied_date || null,
      notes: form.notes || null,
    });
    setForm({
      permit_type: "",
      permit_number: "",
      status: "not_applied",
      applied_date: "",
      notes: "",
    });
    setShowForm(false);
  }

  async function updatePermitStatus(id: string, status: PermitStatus) {
    await mutate(`/api/admin/projects/${projectId}/permits`, "PATCH", {
      id,
      status,
      ...(status === "approved"
        ? { approved_date: new Date().toISOString().split("T")[0] }
        : {}),
    });
  }

  async function deletePermit(id: string) {
    if (!window.confirm("Are you sure you want to delete this permit?")) return;
    await mutate(`/api/admin/projects/${projectId}/permits`, "DELETE", { id });
  }

  return (
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
            <div
              key={p.id}
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
              </div>
              <div className="flex items-center gap-2">
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
                <button
                  disabled={loading}
                  aria-label={`Delete permit ${p.permit_type}`}
                  onClick={() => deletePermit(p.id)}
                  className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Documents Tab
// ===========================================================================

function DocumentsTab({
  projectId,
  documents,
  mutate,
  loading,
}: {
  projectId: string;
  documents: Document[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<DocumentCategory>("general");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadDocs() {
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      fd.append("category", category);
      await mutate(
        `/api/admin/projects/${projectId}/documents`,
        "POST",
        fd,
      );
      setUploadProgress({ done: i + 1, total: files.length });
    }

    setFiles([]);
    setCategory("general");
    setShowForm(false);
    setUploading(false);
    setUploadProgress(null);
  }

  async function deleteDoc(id: string) {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    await mutate(`/api/admin/projects/${projectId}/documents`, "DELETE", { id });
  }

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ShadCard>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
        {!showForm && (
          <CardAction>
            <AddButton label="Upload Files" onClick={() => setShowForm(true)} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <ShadCard className="mb-4 bg-gray-50 border-dashed">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {/* Drop zone / file picker */}
                <div>
                  <label htmlFor="doc-file" className="block text-sm text-gray-700 font-medium mb-1">
                    Files <span className="text-red-500">*</span>
                  </label>
                  <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-300 rounded-lg px-4 py-6 text-sm cursor-pointer hover:border-gray-400 hover:bg-gray-100/50 transition-colors">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-gray-600">
                      Click to select files — you can pick multiple
                    </span>
                    <span className="text-xs text-gray-400">PDFs, images, documents, spreadsheets</span>
                    <input
                      id="doc-file"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                {/* Selected files list */}
                {files.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>
                    <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gray-200 bg-white p-2">
                      {files.map((f, i) => (
                        <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-gray-900">{f.name}</p>
                            <p className="text-xs text-gray-400">{fmtSize(f.size)}</p>
                          </div>
                          <button
                            onClick={() => removeFile(i)}
                            aria-label={`Remove ${f.name}`}
                            className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category + actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div>
                    <label htmlFor="doc-category" className="block text-sm text-gray-700 font-medium mb-1">
                      Category for all files
                    </label>
                    <select
                      id="doc-category"
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as DocumentCategory)
                      }
                      className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                    >
                      <option value="general">General</option>
                      <option value="contract">Contract</option>
                      <option value="permit">Permit</option>
                      <option value="invoice">Invoice</option>
                      <option value="photo">Photo</option>
                      <option value="plan">Plan</option>
                      <option value="draw_request">Draw Request</option>
                    </select>
                  </div>
                </div>

                {/* Upload progress */}
                {uploadProgress && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uploading {uploadProgress.done} of {uploadProgress.total}...</span>
                      <span className="text-gray-500 tabular-nums">{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
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
                    disabled={uploading || loading || files.length === 0}
                    onClick={uploadDocs}
                    className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {uploading
                      ? `Uploading ${uploadProgress?.done ?? 0}/${uploadProgress?.total ?? 0}...`
                      : `Upload ${files.length || ""} File${files.length !== 1 ? "s" : ""}`}
                  </button>
                  <button
                    disabled={uploading}
                    onClick={() => {
                      setShowForm(false);
                      setFiles([]);
                    }}
                    className="text-sm text-gray-600 px-4 py-2.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </ShadCard>
        )}

        {documents.length === 0 && !showForm && (
          <EmptyState label="No documents yet" />
        )}

        <div className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm text-gray-900">
                  {doc.name}
                </span>
                <div className="text-xs text-gray-500 mt-0.5">
                  {doc.category} | {fmtFileSize(doc.file_size)} |{" "}
                  {fmtDate(doc.created_at)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Download ${doc.name}`}
                  className="text-gray-600 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  disabled={loading}
                  aria-label={`Delete document ${doc.name}`}
                  onClick={() => deleteDoc(doc.id)}
                  className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Tasks Tab
// ===========================================================================

function TasksTab({
  projectId,
  tasks,
  mutate,
  loading,
}: {
  projectId: string;
  tasks: Task[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");

  async function addTask() {
    if (!newTitle.trim()) return;
    await mutate(`/api/admin/projects/${projectId}/tasks`, "POST", {
      title: newTitle.trim(),
      due_date: newDueDate || null,
      sort_order: tasks.length,
    });
    setNewTitle("");
    setNewDueDate("");
  }

  async function toggleTask(t: Task) {
    await mutate(`/api/admin/projects/${projectId}/tasks`, "PATCH", {
      id: t.id,
      completed: !t.completed,
    });
  }

  async function deleteTask(id: string) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    await mutate(`/api/admin/projects/${projectId}/tasks`, "DELETE", { id });
  }

  const incomplete = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <ShadCard>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 && (
          <EmptyState label="No tasks yet" />
        )}

        <div className="divide-y divide-gray-100">
          {incomplete.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 py-2.5"
            >
              <button
                disabled={loading}
                aria-label={`Mark "${t.title}" as complete`}
                onClick={() => toggleTask(t)}
                className="w-6 h-6 rounded border-2 border-gray-300 hover:border-black flex-shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              />
              <span className="flex-1 text-sm text-gray-900">{t.title}</span>
              {t.due_date && (
                <span className="text-xs text-gray-500">{fmtDate(t.due_date)}</span>
              )}
              <button
                disabled={loading}
                aria-label={`Delete task "${t.title}"`}
                onClick={() => deleteTask(t.id)}
                className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {completed.length > 0 && (
            <>
              {incomplete.length > 0 && (
                <div className="py-2">
                  <span className="text-xs text-gray-500 font-medium">
                    Completed ({completed.length})
                  </span>
                </div>
              )}
              {completed.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 py-2.5 border-l-4 border-l-green-400 pl-3"
                >
                  <button
                    disabled={loading}
                    aria-label={`Mark "${t.title}" as incomplete`}
                    onClick={() => toggleTask(t)}
                    className="w-6 h-6 rounded border-2 border-green-500 bg-green-500 flex-shrink-0 flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] transition-colors"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </button>
                  <span className="flex-1 text-sm text-gray-500 line-through">
                    {t.title}
                  </span>
                  {t.due_date && (
                    <span className="text-xs text-gray-500">
                      {fmtDate(t.due_date)}
                    </span>
                  )}
                  <button
                    disabled={loading}
                    aria-label={`Delete task "${t.title}"`}
                    onClick={() => deleteTask(t.id)}
                    className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Add task inline */}
        <ShadCard className="mt-4 bg-gray-50 border-dashed">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label htmlFor="new-task-title" className="sr-only">Task title</label>
                <input
                  id="new-task-title"
                  placeholder="Add a task..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                />
              </div>
              <div>
                <label htmlFor="new-task-date" className="sr-only">Due date</label>
                <input
                  id="new-task-date"
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <button
                disabled={loading || !newTitle.trim()}
                onClick={addTask}
                className="bg-black text-white px-4 py-2.5 min-h-[44px] rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {loading ? "Adding..." : "Add"}
              </button>
            </div>
          </CardContent>
        </ShadCard>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Activity Tab
// ===========================================================================

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  status_change: ArrowRightCircle,
  invoice_paid: DollarSign,
  payment_made: CreditCard,
  task_completed: CheckSquare,
  draw_submitted: FileUp,
  project_created: Plus,
  note_added: MessageSquare,
};

function ActivityTab({ activityLog }: { activityLog: ActivityLogEntry[] }) {
  return (
    <ShadCard>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activityLog.length === 0 && (
          <EmptyState label="No activity yet" />
        )}

        <div className="relative">
          {activityLog.length > 0 && (
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200" />
          )}

          <div className="space-y-0">
            {activityLog.map((entry) => {
              const IconComponent = ACTION_ICONS[entry.action] ?? Clock;
              return (
                <div key={entry.id} className="relative flex gap-3 py-3">
                  {/* Dot / Icon */}
                  <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                    <IconComponent className="w-3 h-3 text-gray-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{entry.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {timeAgo(entry.created_at)}
                      <span className="mx-1.5 text-gray-300">|</span>
                      {fmtDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Shared small components
// ===========================================================================

function AddButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black cursor-pointer min-h-[44px] px-2 transition-colors"
    >
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-gray-500 text-center py-8">{label}</p>
  );
}
