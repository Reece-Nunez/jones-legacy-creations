"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  CreditCard,
  ClipboardList,
  FolderOpen,
  CheckSquare,
  Plus,
  Trash2,
  X,
  Download,
  Eye,
  FileText,
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
  ChevronUp,
  RefreshCw,
  Landmark,
  Building,
  Percent,
  UserCircle,
  FileSpreadsheet,
  Sparkles,
  Wallet,
  Camera,
  Globe,
  Lock,
} from "lucide-react";
import type {
  Project,
  ContractorPayment,
  Contractor,
  Permit,
  Document,
  Task,
  TeamMember,
  BudgetLineItem,
  DrawRequest,
  ActivityLogEntry,
  ProjectStatus,
  PermitStatus,
  DrawRequestStatus,
  DocumentCategory,
  InvoiceUploadToken,
  DrawLineItem,
} from "@/lib/types/database";
import { DEFAULT_BUDGET_LINE_ITEMS } from "@/lib/types/database";

type ProgressItem = DrawLineItem & { completed: boolean };
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_TYPE_LABELS,
  PERMIT_STATUS_COLORS,
  DRAW_STATUS_COLORS,
  FINISH_LEVEL_LABELS,
} from "@/lib/types/database";
import type { FinishLevel } from "@/lib/types/database";
import toast from "react-hot-toast";
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
import SmartUpload from "@/components/admin/SmartUpload";

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

/** Toast-based confirmation instead of window.confirm */
function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              Yes, Delete
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
      { duration: 10000 }
    );
  });
}

/** Left border color for status-based cards */
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
  { key: "overview",   label: "Overview",  icon: LayoutDashboard },
  { key: "photos",     label: "Photos",    icon: Camera },
  { key: "payments",   label: "Payments",  icon: CreditCard },
  { key: "draws",      label: "Draws",     icon: Banknote },
  { key: "budget",     label: "Budget",    icon: Wallet },
  { key: "tasks",      label: "Tasks",     icon: CheckSquare },
  { key: "permits",    label: "Permits",   icon: ClipboardList },
  { key: "documents",  label: "Documents", icon: FolderOpen },
  { key: "activity",   label: "Activity",  icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  project: Project;
  payments: ContractorPayment[];
  permits: Permit[];
  documents: Document[];
  tasks: Task[];
  budgetLineItems: BudgetLineItem[];
  drawRequests: DrawRequest[];
  activityLog: ActivityLogEntry[];
  contractors: Contractor[];
}

// ---------------------------------------------------------------------------
// Tab scroll row with arrow buttons
// ---------------------------------------------------------------------------

function TabsScrollRow({ activeTab }: { activeTab: TabKey }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function checkScroll() {
    const el = listRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    checkScroll();
    const el = listRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, []);

  // Scroll active tab into view whenever it changes
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const active = el.querySelector('[data-state="active"]') as HTMLElement | null;
    if (active) active.scrollIntoView({ inline: "nearest", behavior: "smooth" });
    setTimeout(checkScroll, 300);
  }, [activeTab]);

  function scroll(dir: "left" | "right") {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-end border-b border-gray-200">
      {/* Left arrow */}
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll tabs left"
        className={`absolute left-0 z-10 flex items-center justify-center w-10 h-full bg-gradient-to-r from-gray-50 via-gray-50/90 to-transparent transition-opacity ${
          canLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-300 shadow-sm">
          <ChevronRight className="w-3.5 h-3.5 text-gray-700 rotate-180" />
        </span>
      </button>

      {/* Scrollable list */}
      <div ref={listRef} className="w-full overflow-x-auto scrollbar-hide">
        <TabsList variant="line" className="justify-start flex-nowrap !h-auto border-b-0 pb-0 w-max min-w-full">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.key} value={t.key} className="flex-shrink-0 flex-grow-0 px-3 py-2">
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll("right")}
        aria-label="Scroll tabs right"
        className={`absolute right-0 z-10 flex items-center justify-center w-10 h-full bg-gradient-to-l from-gray-50 via-gray-50/90 to-transparent transition-opacity ${
          canRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-300 shadow-sm">
          <ChevronRight className="w-3.5 h-3.5 text-gray-700" />
        </span>
      </button>
    </div>
  );
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
  payments,
  permits,
  documents,
  tasks,
  budgetLineItems,
  drawRequests,
  activityLog,
  contractors,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? (searchParams.get("tab") as TabKey)
    : "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [completionPercent, setCompletionPercent] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/projects/${project.id}/progress`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.items)) setProgressItems(data.items);
        if (typeof data.percent === "number") setCompletionPercent(data.percent);
      })
      .catch(() => {});
  }, [project.id, documents]);

  // ---- financial calculations -------------------------------------------
  const contractValue = project.contract_value ?? project.estimated_value ?? 0;
  const totalCosts = payments.reduce((s, p) => s + p.amount, 0);

  // ---- loan / profit calculations ----------------------------------------
  const hasLoanFields = !!(project.sale_price && project.loan_amount);

  const salePrice = project.sale_price ?? 0;
  const loanAmount = project.loan_amount ?? 0;
  const downPayment = project.down_payment ?? 0;
  const originationFeePercent = project.origination_fee_percent ?? 0;
  const interestRate = project.interest_rate ?? 0;

  const originationFee = loanAmount * originationFeePercent / 100;

  // Accrued interest: per-draw method
  const accruedInterest = (() => {
    if (!interestRate) return 0;
    const fundedDraws = drawRequests
      .filter((d) => d.status === "funded" && d.funded_date)
      .sort((a, b) => new Date(a.funded_date!).getTime() - new Date(b.funded_date!).getTime());
    if (fundedDraws.length === 0) return 0;

    const endDate = project.status === "completed" && project.end_date
      ? new Date(project.end_date)
      : new Date();

    let interest = 0;
    let runningBalance = 0;
    for (let i = 0; i < fundedDraws.length; i++) {
      const draw = fundedDraws[i];
      runningBalance += draw.amount;
      const drawDate = new Date(draw.funded_date!);
      // Interest accrues from this draw's funded_date to the next draw's funded_date (or endDate)
      const nextDate = i < fundedDraws.length - 1
        ? new Date(fundedDraws[i + 1].funded_date!)
        : endDate;
      const days = Math.max(0, (nextDate.getTime() - drawDate.getTime()) / (1000 * 60 * 60 * 24));
      interest += runningBalance * (interestRate / 100) * (days / 365);
    }
    return interest;
  })();

  const totalLenderCost = originationFee + accruedInterest;
  // Down payment is collateral — Blake gets it back at closing, not a cost
  const projectedProfit = salePrice - totalCosts - originationFee - accruedInterest;
  const profitMargin = salePrice > 0 ? (projectedProfit / salePrice) * 100 : 0;

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
        const msg = err.error ?? "Request failed";
        toast.error(msg);
        throw new Error(msg);
      }
      // Success feedback based on method
      if (method === "POST") toast.success("Created successfully");
      else if (method === "PATCH") toast.success("Updated successfully");
      else if (method === "DELETE") toast.success("Deleted");
      router.refresh();
      return res;
    } catch (e) {
      if (e instanceof Error && !e.message.includes("Request failed")) {
        toast.error("Something went wrong");
      }
      throw e;
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
      {previewFile && (
        <FilePreviewModal
          url={previewFile.url}
          name={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <Header
          project={project}
          onStatusChange={changeStatus}
          loading={loading}
          completionPercent={completionPercent}
        />

        {/* Financial Summary */}
        {hasLoanFields ? (
          <FinancialSummary
            salePrice={salePrice}
            totalCosts={totalCosts}
            loanAmount={loanAmount}
            downPayment={downPayment}
            lenderName={project.lender_name}
            originationFee={originationFee}
            originationFeePercent={originationFeePercent}
            accruedInterest={accruedInterest}
            interestRate={interestRate}
            totalLenderCost={totalLenderCost}
            projectedProfit={projectedProfit}
            profitMargin={profitMargin}
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            <FinancialCard
              icon={<Receipt className="w-4 h-4 text-blue-500" />}
              label="Contract Value"
              value={contractValue}
            />
            <FinancialCard
              icon={<CreditCard className="w-4 h-4 text-orange-500" />}
              label="Costs"
              value={totalCosts}
            />
            <FinancialCard
              icon={
                contractValue - totalCosts >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )
              }
              label="Profit"
              value={contractValue - totalCosts}
              colored
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
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
          <TabsScrollRow activeTab={activeTab} />

          <TabsContent value="overview">
            <OverviewTab
              project={project}
              mutate={mutate}
              progressItems={progressItems}
              completionPercent={completionPercent}
            />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetTab
              projectId={project.id}
              budgetLineItems={budgetLineItems}
              payments={payments}
              documents={documents}
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
              onPreview={(url, name) => setPreviewFile({ url, name })}
            />
          </TabsContent>
          <TabsContent value="draws">
            <DrawsTab
              projectId={project.id}
              project={project}
              payments={payments}
              draws={drawRequests}
              documents={documents}
              contractors={contractors}
              mutate={mutate}
              loading={loading}
              onPreview={(url, name) => setPreviewFile({ url, name })}
            />
          </TabsContent>
          <TabsContent value="permits">
            <PermitsTab
              projectId={project.id}
              project={project}
              permits={permits}
              mutate={mutate}
              loading={loading}
              onPreview={(url, name) => setPreviewFile({ url, name })}
            />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab
              projectId={project.id}
              documents={documents}
              mutate={mutate}
              loading={loading}
              onPreview={(url, name) => setPreviewFile({ url, name })}
            />
          </TabsContent>
          <TabsContent value="photos">
            <PhotosTab
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
// Financial Summary (Loan / Profit Calculator)
// ===========================================================================

function FinancialSummary({
  salePrice,
  totalCosts,
  loanAmount,
  downPayment,
  lenderName,
  originationFee,
  originationFeePercent,
  accruedInterest,
  interestRate,
  totalLenderCost,
  projectedProfit,
  profitMargin,
}: {
  salePrice: number;
  totalCosts: number;
  loanAmount: number;
  downPayment: number;
  lenderName: string | null;
  originationFee: number;
  originationFeePercent: number;
  accruedInterest: number;
  interestRate: number;
  totalLenderCost: number;
  projectedProfit: number;
  profitMargin: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const profitColor = projectedProfit >= 0 ? "text-green-600" : "text-red-600";
  const profitBg = projectedProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200";
  const marginColor = profitMargin >= 0 ? "text-green-600" : "text-red-600";

  return (
    <ShadCard className="mt-4 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-4 py-3 text-left hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-semibold text-gray-900">Financial Summary</span>
          {lenderName && (
            <span className="text-xs text-gray-500">({lenderName})</span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 sm:hidden" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 sm:hidden" />
          )}
        </div>
        <div className="flex items-center gap-3 pl-6 sm:pl-0">
          <span className={`text-sm font-bold tabular-nums ${profitColor}`}>
            Profit: {fmt(projectedProfit)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400 hidden sm:block" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          )}
        </div>
      </button>

      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          {/* Row 1: Project Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <MiniCard
              icon={<DollarSign className="w-3.5 h-3.5 text-blue-500" />}
              label="Sale Price"
              value={fmt(salePrice)}
              className="text-gray-900"
            />
            <MiniCard
              icon={<CreditCard className="w-3.5 h-3.5 text-orange-500" />}
              label="Total Costs"
              value={fmt(totalCosts)}
              className="text-gray-900"
            />
            <MiniCard
              icon={<Landmark className="w-3.5 h-3.5 text-indigo-500" />}
              label="Loan Amount"
              value={fmt(loanAmount)}
              className="text-gray-900"
            />
            <MiniCard
              icon={<Banknote className="w-3.5 h-3.5 text-emerald-500" />}
              label="Down Payment"
              value={fmt(downPayment)}
              className="text-gray-900"
            />
          </div>

          {/* Row 2: Lender Costs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <MiniCard
              icon={<Percent className="w-3.5 h-3.5 text-purple-500" />}
              label={`Origination Fee (${originationFeePercent}%)`}
              value={fmt(originationFee)}
              className="text-gray-900"
            />
            <MiniCard
              icon={<TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
              label={`Accrued Interest (${interestRate}%)`}
              value={fmt(accruedInterest)}
              className="text-gray-900"
            />
            <MiniCard
              icon={<Building className="w-3.5 h-3.5 text-red-500" />}
              label="Total Lender Cost"
              value={fmt(totalLenderCost)}
              className="text-red-600 font-bold"
            />
          </div>

          {/* Row 3: Bottom Line */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border ${profitBg}`}>
            <div className="flex items-center gap-3">
              {projectedProfit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
              <div>
                <p className="text-xs text-gray-500 font-medium">Projected Profit</p>
                <p className={`text-2xl font-bold tabular-nums ${profitColor}`}>
                  {fmt(projectedProfit)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Percent className={`w-5 h-5 ${profitMargin >= 0 ? "text-green-500" : "text-red-500"}`} />
              <div>
                <p className="text-xs text-gray-500 font-medium">Profit Margin</p>
                <p className={`text-2xl font-bold tabular-nums ${marginColor}`}>
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </ShadCard>
  );
}

function MiniCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
      </div>
      <p className={`text-sm font-semibold tabular-nums ${className ?? "text-gray-900"}`}>
        {value}
      </p>
    </div>
  );
}

// ===========================================================================
// Header
// ===========================================================================

function Header({
  project,
  onStatusChange,
  loading,
  completionPercent,
}: {
  project: Project;
  onStatusChange: (s: ProjectStatus) => void;
  loading: boolean;
  completionPercent: number;
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

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">Construction Progress</span>
            <span className="text-sm font-bold text-gray-900">{completionPercent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completionPercent >= 100
                  ? "bg-green-500"
                  : completionPercent >= 50
                  ? "bg-blue-500"
                  : "bg-amber-500"
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {completionPercent === 0 ? "Not started" :
             completionPercent === 100 ? "Complete!" :
             `${completionPercent}% complete`}
          </p>
        </div>
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// File Preview Modal
// ===========================================================================

function FilePreviewModal({
  url,
  name,
  onClose,
}: {
  url: string;
  name: string;
  onClose: () => void;
}) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "heic", "avif"].includes(ext);
  const isPdf = ext === "pdf";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-800 truncate max-w-[70%]">{name}</span>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-black border border-gray-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-black p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 min-h-0">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={name}
              className="max-w-full max-h-full object-contain p-4"
            />
          )}
          {isPdf && (
            <iframe
              src={url}
              title={name}
              className="w-full h-full min-h-[70vh]"
            />
          )}
          {!isImage && !isPdf && (
            <div className="text-center p-8">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">Preview not available for this file type.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Overview Tab
// ===========================================================================

function ProgressCard({
  items,
  completionPercent,
}: {
  items: ProgressItem[];
  completionPercent: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = items.filter(i => i.completed).length;

  // Group items by phase (preserving order from DRAW_LINE_ITEM_WEIGHTS)
  const phases: string[] = [];
  const byPhase: Record<string, ProgressItem[]> = {};
  for (const item of items) {
    if (!byPhase[item.phase]) {
      phases.push(item.phase);
      byPhase[item.phase] = [];
    }
    byPhase[item.phase].push(item);
  }

  return (
    <ShadCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Construction Progress</CardTitle>
          <span className="text-2xl font-bold text-gray-900">{completionPercent}%</span>
        </div>
        <div className="mt-2">
          <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completionPercent >= 100 ? "bg-green-500" :
                completionPercent >= 50 ? "bg-blue-500" : "bg-amber-500"
              }`}
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {completedCount} of {items.length} items invoiced · Auto-tracked
            </span>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
            >
              {expanded ? "Hide details" : "View details"}
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading progress...</p>
          ) : (
            <div className="space-y-4">
              {phases.map((phase) => {
                const phaseItems = byPhase[phase];
                const phaseComplete = phaseItems.every(i => i.completed);
                const phaseAny = phaseItems.some(i => i.completed);
                return (
                  <div key={phase}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${
                        phaseComplete ? "text-green-600" : phaseAny ? "text-blue-600" : "text-gray-400"
                      }`}>
                        {phase}
                      </span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="space-y-0.5">
                      {phaseItems.map((item) => (
                        <div
                          key={item.number}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                            item.completed ? "bg-green-50" : "bg-gray-50"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                            item.completed ? "bg-green-500 border-green-500" : "border-gray-300"
                          }`}>
                            {item.completed && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-xs font-bold text-gray-400 tabular-nums w-6 shrink-0">
                            #{item.number}
                          </span>
                          <span className={`text-sm flex-1 ${item.completed ? "text-green-700" : "text-gray-700"}`}>
                            {item.description}
                          </span>
                          <span className="text-xs text-gray-400 tabular-nums shrink-0">{item.weight}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </ShadCard>
  );
}

function OverviewTab({
  project,
  mutate,
  progressItems,
  completionPercent,
}: {
  project: Project;
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) => Promise<Response | undefined>;
  progressItems: ProgressItem[];
  completionPercent: number;
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
      {/* Progress card — full width */}
      <div className="lg:col-span-2">
        <ProgressCard
          items={progressItems}
          completionPercent={completionPercent}
        />
      </div>

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

      {/* Property Details card */}
      <PropertyDetailsCard project={project} mutate={mutate} />
    </div>
  );
}

// ===========================================================================
// Property Details Card (Overview Tab)
// ===========================================================================

const PROPERTY_FIELD_LABELS: Record<string, string> = {
  square_footage: "Square Footage",
  stories: "Stories",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  garage_spaces: "Garage Spaces",
  finish_level: "Finish Level",
  lot_size: "Lot Size",
  flooring_preference: "Flooring",
  countertop_preference: "Countertops",
  cabinet_preference: "Cabinets",
  project_type: "Project Type",
};

const PROPERTY_FIELDS = Object.keys(PROPERTY_FIELD_LABELS) as (keyof typeof PROPERTY_FIELD_LABELS)[];

function PropertyDetailsCard({
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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    square_footage: project.square_footage != null ? String(project.square_footage) : "",
    stories: project.stories != null ? String(project.stories) : "",
    bedrooms: project.bedrooms != null ? String(project.bedrooms) : "",
    bathrooms: project.bathrooms != null ? String(project.bathrooms) : "",
    garage_spaces: project.garage_spaces != null ? String(project.garage_spaces) : "",
    finish_level: project.finish_level ?? "",
    lot_size: project.lot_size ?? "",
    flooring_preference: project.flooring_preference ?? "",
    countertop_preference: project.countertop_preference ?? "",
    cabinet_preference: project.cabinet_preference ?? "",
  }));

  function startEditing() {
    setForm({
      square_footage: project.square_footage != null ? String(project.square_footage) : "",
      stories: project.stories != null ? String(project.stories) : "",
      bedrooms: project.bedrooms != null ? String(project.bedrooms) : "",
      bathrooms: project.bathrooms != null ? String(project.bathrooms) : "",
      garage_spaces: project.garage_spaces != null ? String(project.garage_spaces) : "",
      finish_level: project.finish_level ?? "",
      lot_size: project.lot_size ?? "",
      flooring_preference: project.flooring_preference ?? "",
      countertop_preference: project.countertop_preference ?? "",
      cabinet_preference: project.cabinet_preference ?? "",
    });
    setEditing(true);
  }

  async function save() {
    await mutate(`/api/admin/projects/${project.id}`, "PATCH", {
      square_footage: form.square_footage ? parseInt(form.square_footage) : null,
      stories: form.stories ? parseInt(form.stories) : null,
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
      garage_spaces: form.garage_spaces ? parseInt(form.garage_spaces) : null,
      finish_level: form.finish_level || null,
      lot_size: form.lot_size || null,
      flooring_preference: form.flooring_preference || null,
      countertop_preference: form.countertop_preference || null,
      cabinet_preference: form.cabinet_preference || null,
    });
    setEditing(false);
  }

  function displayValue(key: string): string {
    const val = project[key as keyof Project];
    if (val == null || val === "") return "—";
    if (key === "finish_level") return FINISH_LEVEL_LABELS[val as FinishLevel] ?? String(val);
    return String(val);
  }

  return (
    <ShadCard className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Square Footage</label>
                <input type="number" min="0" value={form.square_footage} onChange={(e) => setForm({ ...form, square_footage: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="2400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Stories</label>
                <input type="number" min="1" value={form.stories} onChange={(e) => setForm({ ...form, stories: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bedrooms</label>
                <input type="number" min="0" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="4" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bathrooms</label>
                <input type="number" min="0" step="0.5" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="2.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Garage Spaces</label>
                <input type="number" min="0" value={form.garage_spaces} onChange={(e) => setForm({ ...form, garage_spaces: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="2" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Finish Level</label>
                <select value={form.finish_level} onChange={(e) => setForm({ ...form, finish_level: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
                  <option value="">Select...</option>
                  {Object.entries(FINISH_LEVEL_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lot Size</label>
                <input type="text" value={form.lot_size} onChange={(e) => setForm({ ...form, lot_size: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="0.25 acres" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Flooring</label>
                <input type="text" value={form.flooring_preference} onChange={(e) => setForm({ ...form, flooring_preference: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="Hardwood" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Countertops</label>
                <input type="text" value={form.countertop_preference} onChange={(e) => setForm({ ...form, countertop_preference: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="Granite" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Cabinets</label>
                <input type="text" value={form.cabinet_preference} onChange={(e) => setForm({ ...form, cabinet_preference: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="Custom" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="inline-flex items-center gap-1 text-sm bg-black text-white px-3 py-1.5 min-h-[44px] rounded-lg hover:bg-gray-800 cursor-pointer transition-colors">
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="text-sm text-gray-600 px-3 py-1.5 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {PROPERTY_FIELDS.map((key) => (
                <div key={key}>
                  <p className="text-xs font-medium text-gray-500">{PROPERTY_FIELD_LABELS[key]}</p>
                  <p className="text-sm text-gray-900 mt-0.5">{displayValue(key)}</p>
                </div>
              ))}
            </div>
            <button
              onClick={startEditing}
              aria-label="Edit property details"
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-black cursor-pointer transition-opacity"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        )}
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
  onPreview,
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
  onPreview: (url: string, name: string) => void;
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

  const [editingPayment, setEditingPayment] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    contractor_name: "",
    description: "",
    amount: "",
    status: "pending" as string,
    due_date: "",
  });

  function startEditPayment(p: ContractorPayment) {
    setEditingPayment(p.id);
    setEditPaymentForm({
      contractor_name: p.contractor_name,
      description: p.description || "",
      amount: formatCurrencyInput(String(p.amount)),
      status: p.status,
      due_date: p.due_date ?? "",
    });
  }

  async function saveEditPayment(id: string) {
    await mutate(`/api/admin/projects/${projectId}/payments/${id}`, "PATCH", {
      contractor_name: editPaymentForm.contractor_name,
      description: editPaymentForm.description || null,
      amount: parseFloat(unformatCurrency(editPaymentForm.amount)),
      status: editPaymentForm.status,
      due_date: editPaymentForm.due_date || null,
    });
    setEditingPayment(null);
  }

  async function markFunded(p: ContractorPayment) {
    await mutate(`/api/admin/projects/${projectId}/payments/${p.id}`, "PATCH", {
      status: "paid",
      paid_date: new Date().toISOString().split("T")[0],
    });
  }

  async function deletePayment(id: string) {
    if (!(await confirmAction("Delete this payment?"))) return;
    await mutate(`/api/admin/projects/${projectId}/payments/${id}`, "DELETE");
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
                  <div>
                    <label className="block text-xs text-gray-600 font-medium mb-1">Status</label>
                    <select
                      value={editPaymentForm.status}
                      onChange={(e) => setEditPaymentForm({ ...editPaymentForm, status: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
                    >
                      <option value="pending">Needs Draw</option>
                      <option value="paid">Funded</option>
                    </select>
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
                      <Badge
                        variant="outline"
                        className={`inline-flex items-center gap-1 rounded-full ${
                          p.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        {p.status === "paid" ? "Funded" : "Needs Draw"}
                      </Badge>
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {p.description}
                      </p>
                    )}
                    {p.invoice_file_url && (
                      <button
                        onClick={() => onPreview(p.invoice_file_url!, p.invoice_file_name ?? "Invoice")}
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
                    {p.status !== "paid" && (
                      <button
                        disabled={loading}
                        onClick={() => markFunded(p)}
                        className="text-xs text-green-600 hover:underline disabled:opacity-50 cursor-pointer min-h-[44px] px-2 transition-colors"
                      >
                        Mark Funded
                      </button>
                    )}
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
                  </div>
                </div>
              )}
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
  project,
  payments,
  draws,
  documents,
  contractors,
  mutate,
  loading,
  onPreview,
}: {
  projectId: string;
  project: Project;
  payments: ContractorPayment[];
  draws: DrawRequest[];
  documents: Document[];
  contractors: Contractor[];
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
    draw_number: "",
    description: "",
    amount: "",
  });
  const [expandedDraws, setExpandedDraws] = useState<Set<string>>(new Set());
  const [uploadingDrawId, setUploadingDrawId] = useState<string | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadLineItems, setUploadLineItems] = useState<Record<number, string>>({});
  const [uploadContractors, setUploadContractors] = useState<Record<number, { id?: string; name: string }>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [scanningDrawId, setScanningDrawId] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const drawsRouter = useRouter();

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
  const [reviewDrawId, setReviewDrawId] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);

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

  const [newDrawFiles, setNewDrawFiles] = useState<File[]>([]);
  const [newDrawLineItems, setNewDrawLineItems] = useState<Record<number, string>>({});
  const [newDrawContractors, setNewDrawContractors] = useState<Record<number, string>>({});
  const [newDrawUploading, setNewDrawUploading] = useState(false);
  const [newDrawProgress, setNewDrawProgress] = useState<{ done: number; total: number } | null>(null);

  async function addDraw() {
    const drawNum = form.draw_number ? parseInt(form.draw_number) : nextDrawNumber;
    const amount = form.amount ? parseFloat(unformatCurrency(form.amount)) : 0;

    // Create the draw first
    const res = await mutate(`/api/admin/projects/${projectId}/draws`, "POST", {
      draw_number: drawNum,
      description: form.description || null,
      amount,
      status: "draft",
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
          fd.append("category", "draw_request");
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
          setReviewDrawId(drawId);
        }
      }
    }

    setNewDrawFiles([]);
    setNewDrawLineItems({});
    setNewDrawContractors({});
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

  const [editingDraw, setEditingDraw] = useState<string | null>(null);
  const [editDrawForm, setEditDrawForm] = useState({ draw_number: "", amount: "", description: "", notes: "" });

  function startEditDraw(draw: DrawRequest) {
    setEditingDraw(draw.id);
    setEditDrawForm({
      draw_number: String(draw.draw_number),
      amount: formatCurrencyInput(String(draw.amount)),
      description: draw.description || "",
      notes: draw.notes || "",
    });
  }

  async function saveEditDraw(drawId: string) {
    await mutate(`/api/admin/projects/${projectId}/draws/${drawId}`, "PATCH", {
      draw_number: parseInt(editDrawForm.draw_number),
      amount: parseFloat(unformatCurrency(editDrawForm.amount)),
      description: editDrawForm.description || null,
      notes: editDrawForm.notes || null,
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
    drawsRouter.refresh();
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
      fd.append("category", "draw_request");
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
      setReviewDrawId(drawId);
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
      drawsRouter.refresh();
    } catch {
      toast.error("Failed to update names");
    } finally {
      setSavingReview(false);
      setReviewDocs([]);
      setReviewDrawId(null);
    }
  }

  function dismissReview() {
    setReviewDocs([]);
    setReviewDrawId(null);
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
                                  <button
                                    aria-label={`Preview ${doc.name}`}
                                    onClick={() => onPreview(doc.file_url, doc.name)}
                                    className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
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
                              <button
                                aria-label={`Preview ${doc.name}`}
                                onClick={() => onPreview(doc.file_url, doc.name)}
                                className="text-gray-400 hover:text-black p-1 cursor-pointer transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
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
  project,
  permits,
  mutate,
  loading,
  onPreview,
}: {
  projectId: string;
  project: Project;
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
                        onClick={() => onPreview(p.file_url!, p.file_name || "Permit")}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-0.5 transition-colors cursor-pointer"
                        aria-label={`Preview permit file for ${p.permit_type}`}
                      >
                        <Paperclip className="w-3 h-3" />
                        {p.file_name || "View PDF"}
                      </button>
                    )}
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

// ===========================================================================
// Permit Extraction Confirmation Modal
// ===========================================================================

function PermitExtractionModal({
  extractedData,
  onConfirm,
  onCancel,
}: {
  extractedData: Record<string, unknown>;
  onConfirm: (selected: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(extractedData)) {
      initial[key] = true;
    }
    return initial;
  });

  function handleConfirm() {
    const result: Record<string, unknown> = {};
    for (const [key, checked] of Object.entries(selected)) {
      if (checked) {
        result[key] = extractedData[key];
      }
    }
    onConfirm(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              AI Extracted Property Details
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            The following details were extracted from the permit. Uncheck any you don&apos;t want to save.
          </p>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.entries(extractedData).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected[key] ?? true}
                onChange={(e) =>
                  setSelected({ ...selected, [key]: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {PROPERTY_FIELD_LABELS[key] || key}
                </p>
                <p className="text-sm text-gray-600">
                  {key === "finish_level"
                    ? FINISH_LEVEL_LABELS[value as FinishLevel] ?? String(value)
                    : key === "project_type"
                      ? PROJECT_TYPE_LABELS[value as keyof typeof PROJECT_TYPE_LABELS] ?? String(value)
                      : String(value)}
                </p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-indigo-500 cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Save Selected
          </button>
        </div>
      </div>
    </div>
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
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>("general");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
              <AddButton label="Upload Files" onClick={() => setShowForm(true)} />
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
              </select>
            </div>
            <SmartUpload
              onUpload={async (uploadFiles, aiResults) => {
                for (let i = 0; i < uploadFiles.length; i++) {
                  const fd = new FormData();
                  fd.append("file", uploadFiles[i]);
                  fd.append("category", category);
                  const key = `${uploadFiles[i].name}-${uploadFiles[i].lastModified}`;
                  const aiData = aiResults?.get(key);
                  if (aiData) {
                    fd.append("use_ai", "false");
                    fd.append("vendor", aiData.vendor_company || aiData.vendor_name || "");
                    fd.append("doc_type", aiData.document_type || "");
                    fd.append("auto_create_payment", "true");
                    fd.append("ai_reviewed_data", JSON.stringify(aiData));
                  } else if (category === "invoice" || category === "draw_request") {
                    fd.append("use_ai", "true");
                  }
                  await mutate(
                    `/api/admin/projects/${projectId}/documents`,
                    "POST",
                    fd,
                  );
                }
                setCategory("general");
                setShowForm(false);
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
          <EmptyState label="No documents yet" />
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
                  onClick={() => onPreview(doc.file_url, doc.name)}
                  className="text-gray-600 hover:text-black min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
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
  );
}

// ===========================================================================
// Photos Tab
// ===========================================================================

function PhotosTab({
  projectId,
  documents,
  mutate,
  loading,
}: {
  projectId: string;
  documents: Document[];
  mutate: (url: string, method: string, body?: Record<string, unknown> | FormData) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const photos = documents.filter((d) => d.category === "photo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);
      formData.append("category", "photo");
      await mutate(`/api/admin/projects/${projectId}/documents`, "POST", formData);
      toast.success("Photo uploaded");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function togglePublic(doc: Document) {
    await mutate(`/api/admin/projects/${projectId}/documents/${doc.id}`, "PATCH", {
      is_public: !doc.is_public,
    } as unknown as Record<string, unknown>);
    toast.success(doc.is_public ? "Photo set to private" : "Photo is now public");
  }

  async function deletePhoto(doc: Document) {
    const confirmed = await confirmAction("Delete this photo?");
    if (!confirmed) return;
    await mutate(`/api/admin/projects/${projectId}/documents/${doc.id}`, "DELETE");
    toast.success("Photo deleted");
  }

  return (
    <ShadCard>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Project Photos</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{photos.filter(p => p.is_public).length} public · {photos.filter(p => !p.is_public).length} private</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              {uploading ? "Uploading..." : "Add Photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={uploadPhoto}
              className="hidden"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-4">No photos yet. Tap &quot;Add Photo&quot; to upload from your phone or camera.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Upload first photo
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              Toggle the <Globe className="w-3 h-3 inline" /> icon to make a photo visible on the public gallery. <Lock className="w-3 h-3 inline" /> = private only.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((doc) => (
                <div key={doc.id} className="group relative">
                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={doc.file_url}
                      alt={doc.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => deletePhoto(doc)}
                        className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-full text-red-500 hover:bg-white cursor-pointer"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Public toggle below image */}
                  <button
                    onClick={() => togglePublic(doc)}
                    className={`mt-1.5 w-full inline-flex items-center justify-center gap-1.5 text-xs py-1 rounded-lg border transition-colors cursor-pointer ${
                      doc.is_public
                        ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                    aria-label={doc.is_public ? "Make private" : "Make public"}
                  >
                    {doc.is_public ? (
                      <><Globe className="w-3 h-3" /> Public</>
                    ) : (
                      <><Lock className="w-3 h-3" /> Private</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
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
  const [newAssignee, setNewAssignee] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({
    title: "",
    due_date: "",
    assigned_to: "",
  });

  useEffect(() => {
    fetch("/api/admin/team")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setTeamMembers(data); })
      .catch(() => {});
  }, []);

  function startEditTask(t: Task) {
    setEditingTask(t.id);
    setEditTaskForm({
      title: t.title,
      due_date: t.due_date ?? "",
      assigned_to: t.assigned_to ?? "",
    });
  }

  async function saveEditTask(id: string) {
    await mutate(`/api/admin/projects/${projectId}/tasks/${id}`, "PATCH", {
      title: editTaskForm.title,
      due_date: editTaskForm.due_date || null,
      assigned_to: editTaskForm.assigned_to || null,
    });
    setEditingTask(null);
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    await mutate(`/api/admin/projects/${projectId}/tasks`, "POST", {
      title: newTitle.trim(),
      due_date: newDueDate || null,
      assigned_to: newAssignee || null,
      sort_order: tasks.length,
    });
    setNewTitle("");
    setNewDueDate("");
    setNewAssignee("");
  }

  async function toggleTask(t: Task) {
    await mutate(`/api/admin/projects/${projectId}/tasks/${t.id}`, "PATCH", {
      completed: !t.completed,
    });
  }

  async function deleteTask(id: string) {
    if (!(await confirmAction("Delete this task?"))) return;
    await mutate(`/api/admin/projects/${projectId}/tasks/${id}`, "DELETE");
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
            <div key={t.id}>
              {editingTask === t.id ? (
                <div className="bg-gray-50 rounded-lg p-3 my-2 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 font-medium mb-1">Title</label>
                      <input
                        value={editTaskForm.title}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editTaskForm.due_date}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, due_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 font-medium mb-1">Assign To</label>
                      <select
                        value={editTaskForm.assigned_to}
                        onChange={(e) => setEditTaskForm({ ...editTaskForm, assigned_to: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map((m) => (
                          <option key={m.email} value={m.email}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={loading}
                      onClick={() => saveEditTask(t.id)}
                      className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      {loading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setEditingTask(null)}
                      className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2.5">
                  <button
                    disabled={loading}
                    aria-label={`Mark "${t.title}" as complete`}
                    onClick={() => toggleTask(t)}
                    className="w-6 h-6 rounded border-2 border-gray-300 hover:border-black flex-shrink-0 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900">{t.title}</span>
                    {t.assigned_to && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                        <UserCircle className="w-3 h-3" />
                        {teamMembers.find((m) => m.email === t.assigned_to)?.name || t.assigned_to}
                      </span>
                    )}
                  </div>
                  {t.due_date && (
                    <span className="text-xs text-gray-500 shrink-0">{fmtDate(t.due_date)}</span>
                  )}
                  <button
                    disabled={loading}
                    aria-label={`Edit task "${t.title}"`}
                    onClick={() => startEditTask(t)}
                    className="text-gray-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={loading}
                    aria-label={`Delete task "${t.title}"`}
                    onClick={() => deleteTask(t.id)}
                    className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
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
                <div key={t.id}>
                  {editingTask === t.id ? (
                    <div className="bg-gray-50 rounded-lg p-3 my-2 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 font-medium mb-1">Title</label>
                          <input
                            value={editTaskForm.title}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 font-medium mb-1">Due Date</label>
                          <input
                            type="date"
                            value={editTaskForm.due_date}
                            onChange={(e) => setEditTaskForm({ ...editTaskForm, due_date: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={loading}
                          onClick={() => saveEditTask(t.id)}
                          className="bg-black text-white px-3 py-2 min-h-[36px] rounded-lg text-xs hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                        >
                          {loading ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="text-xs text-gray-600 px-3 py-2 min-h-[36px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5 border-l-4 border-l-green-400 pl-3">
                      <button
                        disabled={loading}
                        aria-label={`Mark "${t.title}" as incomplete`}
                        onClick={() => toggleTask(t)}
                        className="w-6 h-6 rounded border-2 border-green-500 bg-green-500 flex-shrink-0 flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] transition-colors"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-500 line-through">
                          {t.title}
                        </span>
                        {t.assigned_to && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            <UserCircle className="w-3 h-3" />
                            {teamMembers.find((m) => m.email === t.assigned_to)?.name || t.assigned_to}
                          </span>
                        )}
                      </div>
                      {t.due_date && (
                        <span className="text-xs text-gray-500 shrink-0">
                          {fmtDate(t.due_date)}
                        </span>
                      )}
                      <button
                        disabled={loading}
                        aria-label={`Edit task "${t.title}"`}
                        onClick={() => startEditTask(t)}
                        className="text-gray-500 hover:text-blue-600 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={loading}
                        aria-label={`Delete task "${t.title}"`}
                        onClick={() => deleteTask(t.id)}
                        className="text-gray-500 hover:text-red-500 disabled:opacity-50 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
              <div>
                <label htmlFor="new-task-assignee" className="sr-only">Assign to</label>
                <select
                  id="new-task-assignee"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Assign to...</option>
                  {teamMembers.map((m) => (
                    <option key={m.email} value={m.email}>{m.name}</option>
                  ))}
                </select>
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
// Budget Tab
// ===========================================================================

function BudgetTab({
  projectId,
  budgetLineItems,
  payments,
  documents,
  mutate,
  loading,
}: {
  projectId: string;
  budgetLineItems: BudgetLineItem[];
  payments: ContractorPayment[];
  documents: Document[];
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) => Promise<Response | undefined>;
  loading: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const hasBudget = budgetLineItems.length > 0;

  // Parse a line item number from a filename like "5_Slab_Invoice_..." or "6a_Plumbing_..."
  function parseLineNumFromFilename(filename: string | null): string | null {
    if (!filename) return null;
    const m = filename.match(/^(\d+[a-z]?)\s*[_ ]/i);
    return m ? m[1].toLowerCase() : null;
  }

  // Normalize line number for matching: "5A" → "5a", strip trailing letters for fallback
  function numericPart(s: string) { return s.replace(/[a-z]/gi, ""); }

  // Resolve the best matching budget line_number for a parsed filename number
  // e.g. "5" → "5a" (first budget item with numeric part "5"), "6a" → "6a" (exact)
  function resolveLine(parsed: string): string {
    const lower = parsed.toLowerCase();
    // Exact match first
    if (budgetLineItems.some(b => b.line_number.toLowerCase() === lower)) return lower;
    // Numeric prefix fallback — first budget line item with same digits
    const num = numericPart(lower);
    const fallback = budgetLineItems.find(b => numericPart(b.line_number) === num);
    return fallback ? fallback.line_number : lower;
  }

  // Build actual spent per line item.
  // Source 1: documents with line_item_number that have a matching payment by URL.
  // Source 2: payments whose invoice_file_name encodes a line number (covers payments
  //           uploaded without a document record, e.g. via contractor invoice link).
  const spentByLine = new Map<string, number>();
  const countedPaymentIds = new Set<string>();

  // Source 1 — document-linked payments
  for (const doc of documents) {
    if (doc.line_item_number == null) continue;
    const payment = payments.find((p) => p.invoice_file_url === doc.file_url);
    if (payment) {
      const key = resolveLine(doc.line_item_number);
      spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
      countedPaymentIds.add(payment.id);
    }
  }

  // Source 2 — payments not already counted, parse line number from invoice_file_name
  for (const payment of payments) {
    if (countedPaymentIds.has(payment.id)) continue;
    const parsed = parseLineNumFromFilename(payment.invoice_file_name);
    if (!parsed) continue;
    const key = resolveLine(parsed);
    spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
  }

  // Use budget line items if they exist, otherwise show defaults
  const lineItems = hasBudget
    ? budgetLineItems
    : DEFAULT_BUDGET_LINE_ITEMS.map((d) => ({
        ...d,
        id: "",
        project_id: projectId,
        budgeted_amount: 0,
        notes: null,
        created_at: "",
        updated_at: "",
      }));

  const totalBudgeted = lineItems.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  const totalSpent = Array.from(spentByLine.values()).reduce((s, v) => s + v, 0);

  async function initializeBudget() {
    setSaving(true);
    try {
      await fetch(`/api/admin/projects/${projectId}/budget`, { method: "PUT" });
      router.refresh();
      toast.success("Budget initialized with default line items");
    } catch {
      toast.error("Failed to initialize budget");
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    const amounts: Record<string, string> = {};
    for (const item of lineItems) {
      amounts[item.line_number] = item.budgeted_amount ? String(item.budgeted_amount) : "";
    }
    setEditAmounts(amounts);
    setEditing(true);
  }

  async function saveBudget() {
    setSaving(true);
    try {
      const items = lineItems.map((item) => ({
        line_number: item.line_number,
        description: item.description,
        budgeted_amount: parseFloat(editAmounts[item.line_number] || "0") || 0,
      }));

      await fetch(`/api/admin/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });

      router.refresh();
      setEditing(false);
      toast.success("Budget saved");
    } catch {
      toast.error("Failed to save budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ShadCard>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Budget vs Actual</CardTitle>
          <div className="flex gap-2">
            {!hasBudget && !editing && (
              <button
                onClick={initializeBudget}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                style={{ minHeight: 36 }}
              >
                <Plus className="w-3.5 h-3.5" />
                Set Up Budget
              </button>
            )}
            {hasBudget && !editing && (
              <>
                <button
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Budget
                </button>
                <button
                  onClick={async () => {
                    const confirmed = await confirmAction("Delete the entire budget and start fresh? This cannot be undone.");
                    if (!confirmed) return;
                    setSaving(true);
                    try {
                      await fetch(`/api/admin/projects/${projectId}/budget`, { method: "DELETE" });
                      router.refresh();
                      toast.success("Budget deleted");
                    } catch {
                      toast.error("Failed to delete budget");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset
                </button>
              </>
            )}
            {editing && (
              <>
                <button
                  onClick={saveBudget}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  {saving ? "Saving..." : "Save Budget"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: 36 }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasBudget && !editing ? (
          <EmptyState label="No budget set up yet — click 'Set Up Budget' to add the standard 29 line items" />
        ) : (
          <>
            {/* Summary bar */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-600">Total Budgeted</p>
                <p className="text-lg font-bold tabular-nums text-blue-900">{fmt(totalBudgeted)}</p>
              </div>
              <div className="rounded-lg bg-orange-50 p-3">
                <p className="text-xs font-medium text-orange-600">Total Spent</p>
                <p className="text-lg font-bold tabular-nums text-orange-900">{fmt(totalSpent)}</p>
              </div>
              <div className={`rounded-lg p-3 ${totalBudgeted - totalSpent >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className={`text-xs font-medium ${totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalBudgeted - totalSpent >= 0 ? "Under Budget" : "Over Budget"}
                </p>
                <p className={`text-lg font-bold tabular-nums ${totalBudgeted - totalSpent >= 0 ? "text-green-900" : "text-red-900"}`}>
                  {fmt(Math.abs(totalBudgeted - totalSpent))}
                </p>
              </div>
            </div>

            {/* Overall progress bar */}
            {totalBudgeted > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>{Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100)}% of budget used</span>
                  <span>{fmt(totalBudgeted - totalSpent)} remaining</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      totalSpent / totalBudgeted > 1
                        ? "bg-red-500"
                        : totalSpent / totalBudgeted > 0.9
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min((totalSpent / totalBudgeted) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="pb-2 pr-3 w-10">#</th>
                    <th className="pb-2 pr-3">Description</th>
                    <th className="pb-2 pr-3 text-right w-32">Budgeted</th>
                    <th className="pb-2 pr-3 text-right w-32">Spent</th>
                    <th className="pb-2 pr-3 text-right w-32">Remaining</th>
                    <th className="pb-2 w-40">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lineItems.map((item) => {
                    const budgeted = item.budgeted_amount || 0;
                    const spent = spentByLine.get(item.line_number) || 0;
                    const remaining = budgeted - spent;
                    const pctUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                    const overBudget = remaining < 0;

                    return (
                      <tr key={item.line_number} className={`${overBudget ? "bg-red-50/50" : ""}`}>
                        <td className="py-2.5 pr-3 text-xs text-gray-400 tabular-nums">{item.line_number}</td>
                        <td className="py-2.5 pr-3 font-medium text-gray-900">{item.description}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {editing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editAmounts[item.line_number] || ""}
                              onChange={(e) => setEditAmounts((prev) => ({ ...prev, [item.line_number]: e.target.value }))}
                              placeholder="0.00"
                              className="w-full text-right rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                            />
                          ) : (
                            <span className="text-gray-700">{budgeted > 0 ? fmt(budgeted) : "--"}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-gray-700">
                          {spent > 0 ? fmt(spent) : "--"}
                        </td>
                        <td className={`py-2.5 pr-3 text-right tabular-nums font-medium ${overBudget ? "text-red-600" : "text-green-600"}`}>
                          {budgeted > 0 || spent > 0 ? fmt(remaining) : "--"}
                        </td>
                        <td className="py-2.5">
                          {budgeted > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pctUsed > 100 ? "bg-red-500" : pctUsed > 90 ? "bg-amber-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(pctUsed, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs tabular-nums w-10 text-right ${overBudget ? "text-red-600 font-bold" : "text-gray-500"}`}>
                                {Math.round(pctUsed)}%
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 font-bold">
                    <td className="py-3 pr-3"></td>
                    <td className="py-3 pr-3 text-gray-900">TOTALS</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-900">{fmt(totalBudgeted)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-gray-900">{fmt(totalSpent)}</td>
                    <td className={`py-3 pr-3 text-right tabular-nums ${totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(totalBudgeted - totalSpent)}
                    </td>
                    <td className="py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden space-y-2">
              {lineItems.map((item) => {
                const budgeted = item.budgeted_amount || 0;
                const spent = spentByLine.get(item.line_number) || 0;
                const remaining = budgeted - spent;
                const pctUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                const overBudget = remaining < 0;

                return (
                  <div
                    key={item.line_number}
                    className={`rounded-lg border p-3 ${overBudget ? "border-red-200 bg-red-50/30" : "border-gray-100"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        <span className="text-gray-400 mr-1.5">#{item.line_number}</span>
                        {item.description}
                      </span>
                    </div>
                    {editing ? (
                      <div className="mt-2">
                        <label className="text-[10px] font-medium text-gray-500 uppercase">Budget Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={editAmounts[item.line_number] || ""}
                          onChange={(e) => setEditAmounts((prev) => ({ ...prev, [item.line_number]: e.target.value }))}
                          placeholder="0.00"
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 mt-1"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-500">Budget: {budgeted > 0 ? fmt(budgeted) : "--"}</span>
                          <span className="text-gray-500">Spent: {spent > 0 ? fmt(spent) : "--"}</span>
                          <span className={`font-semibold ${overBudget ? "text-red-600" : "text-green-600"}`}>
                            {budgeted > 0 || spent > 0 ? fmt(remaining) : ""}
                          </span>
                        </div>
                        {budgeted > 0 && (
                          <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pctUsed > 100 ? "bg-red-500" : pctUsed > 90 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(pctUsed, 100)}%` }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {/* Mobile totals */}
              {!editing && (
                <div className="rounded-lg border-2 border-gray-300 p-3 mt-3">
                  <p className="text-sm font-bold text-gray-900 mb-1">TOTALS</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Budget: {fmt(totalBudgeted)}</span>
                    <span className="text-gray-600">Spent: {fmt(totalSpent)}</span>
                    <span className={`font-bold ${totalBudgeted - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {fmt(totalBudgeted - totalSpent)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom save buttons when editing */}
            {editing && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={saveBudget}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                  style={{ minHeight: 44 }}
                >
                  {saving ? "Saving..." : "Save Budget"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  style={{ minHeight: 44 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </>
        )}
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
