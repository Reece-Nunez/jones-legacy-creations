"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
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
  FileText,
  Palette,
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
  ChevronDown,
  ChevronUp,
  Landmark,
  Building,
  Percent,
  Wallet,
  Camera,
  Globe,
  Lock,
  Gavel,
} from "lucide-react";
import type {
  Project,
  ContractorPayment,
  Contractor,
  Permit,
  Document,
  Task,
  BudgetLineItem,
  DrawRequest,
  ActivityLogEntry,
  ProjectStatus,
  DrawLineItem,
  ProjectMiscCharge,
  LoanLedgerEntry,
  ProjectSettlement,
} from "@/lib/types/database";
import { ChangeOrdersTab, type ChangeOrder } from "@/components/admin/ChangeOrdersTab";
import { SelectionsTab, type Selection } from "@/components/admin/SelectionsTab";
import { BidRequestsTab, type BidRequest } from "@/components/admin/BidRequestsTab";

type ProgressItem = DrawLineItem & { completed: boolean };
type CashProgressItem = {
  line_number: string;
  description: string;
  budgeted_amount: number;
  completed: boolean;
  source: "invoice" | "owner_purchased" | null;
};
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  FINISH_LEVEL_LABELS,
} from "@/lib/types/database";
import type { FinishLevel } from "@/lib/types/database";
import toast from "react-hot-toast";
import {
  formatCurrency as fmt,
  formatCurrencyWhole,
} from "@/lib/formatters";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import { visibleTabs, groupTabs } from "@/lib/projects/tabs";
import { fmtDate } from "@/components/admin/project/shared/format";
import { ProjectEditContext, EditOnly } from "@/components/admin/project/shared/EditContext";
import { EmptyState } from "@/components/admin/project/shared/Primitives";
import { DrawsTab } from "@/components/admin/project/tabs/DrawsTab";
import { ProjectTabNav } from "@/components/admin/project/ProjectTabNav";
import { PaymentsTab } from "@/components/admin/project/tabs/PaymentsTab";
import { BudgetTab } from "@/components/admin/project/tabs/BudgetTab";
import { PROPERTY_FIELD_LABELS, PROPERTY_FIELDS } from "@/components/admin/project/shared/propertyFields";
import { PermitsTab } from "@/components/admin/project/tabs/PermitsTab";
import { MiscChargesSection } from "@/components/admin/project/tabs/MiscChargesSection";
import { TasksTab } from "@/components/admin/project/tabs/TasksTab";
import { DocumentsTab } from "@/components/admin/project/tabs/DocumentsTab";
import { confirmAction } from "@/lib/confirmAction";
import {
  Card as ShadCard,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { computeProjectFinancials } from "@/lib/finance/project-financials";
import LoanLedgerTab from "@/components/admin/LoanLedgerTab";
import SettlementsSection from "@/components/admin/SettlementsSection";
import CashFlowTab from "@/components/admin/CashFlowTab";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
const ALL_TABS = [
  // Grouped for the two-level nav (lib/projects/tabs.ts). Panel keys are
  // unchanged so existing ?tab= links keep working.
  { key: "overview",   group: "overview", label: "Summary",     icon: LayoutDashboard, cashJob: true,  onlyCashJob: false },
  { key: "activity",   group: "overview", label: "Activity",    icon: Clock,           cashJob: true,  onlyCashJob: false },

  { key: "budget",     group: "money",    label: "Budget",      icon: Wallet,          cashJob: true,  onlyCashJob: false },
  // Payments is NOT cash-job-only. Financed jobs pay subs directly and then
  // roll those payments into a draw: 24 of Peach Springs' 31 payments are
  // draw-linked and 7 are standalone. Hiding the tab there left 86% of all
  // contractor payments without a dedicated list.
  { key: "payments",   group: "money",    label: "Payments",    icon: CreditCard,      cashJob: true,  onlyCashJob: false },
  { key: "draws",      group: "money",    label: "Draws",       icon: Banknote,        cashJob: false, onlyCashJob: false },
  { key: "loan",       group: "money",    label: "Loan",        icon: Landmark,        cashJob: false, onlyCashJob: false },
  { key: "cashflow",   group: "money",    label: "Cash Flow",   icon: TrendingUp,      cashJob: true,  onlyCashJob: false },

  { key: "tasks",      group: "work",     label: "Tasks",       icon: CheckSquare,     cashJob: true,  onlyCashJob: false },
  { key: "permits",    group: "work",     label: "Permits",     icon: ClipboardList,   cashJob: true,  onlyCashJob: false },
  { key: "bidrequests", group: "work",    label: "Bid Requests", icon: Gavel,          cashJob: true,  onlyCashJob: false, staffOnly: true },

  { key: "selections", group: "client",   label: "Selections",  icon: Palette,         cashJob: true,  onlyCashJob: false, staffOnly: true },
  { key: "changeorders", group: "client", label: "Change Orders", icon: FileText,      cashJob: true,  onlyCashJob: false, staffOnly: true },

  { key: "documents",  group: "files",    label: "Documents",   icon: FolderOpen,      cashJob: true,  onlyCashJob: false },
  { key: "photos",     group: "files",    label: "Photos",      icon: Camera,          cashJob: true,  onlyCashJob: false },
] as const;

type TabKey = (typeof ALL_TABS)[number]["key"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  /** Contractor view: hide staff mutation controls (RLS also enforces this). */
  readOnly?: boolean;
  project: Project;
  payments: ContractorPayment[];
  permits: Permit[];
  documents: Document[];
  tasks: Task[];
  budgetLineItems: BudgetLineItem[];
  drawRequests: DrawRequest[];
  activityLog: ActivityLogEntry[];
  contractors: Contractor[];
  miscCharges: ProjectMiscCharge[];
  loanLedger: LoanLedgerEntry[];
  settlements: ProjectSettlement[];
  changeOrders?: ChangeOrder[];
  selections?: Selection[];
  bidRequests?: BidRequest[];
}

// ---------------------------------------------------------------------------
// Tab scroll row with arrow buttons
// ---------------------------------------------------------------------------

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
  readOnly = false,
  project,
  payments,
  permits,
  documents,
  tasks,
  budgetLineItems,
  drawRequests,
  activityLog,
  contractors,
  miscCharges,
  loanLedger,
  settlements,
  changeOrders = [],
  selections = [],
  bidRequests = [],
}: Props) {
  const canEdit = !readOnly;
  const router = useRouter();
  const searchParams = useSearchParams();
  const TABS = visibleTabs(ALL_TABS, project.is_cash_job).filter(
    (t) => !("staffOnly" in t && t.staffOnly && readOnly)
  );
  const TAB_GROUPS = groupTabs(TABS);
  const initialTab = TABS.some((t) => t.key === searchParams.get("tab"))
    ? (searchParams.get("tab") as TabKey)
    : "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [cashProgressItems, setCashProgressItems] = useState<CashProgressItem[]>([]);
  const [completionPercent, setCompletionPercent] = useState(0);

  // Refetch progress when the project's document/budget COUNTS change.
  // Depending on the array identities re-fires this effect on every parent
  // re-render (since they're props recreated each render), causing a loop.
  useEffect(() => {
    fetch(`/api/admin/projects/${project.id}/progress`)
      .then(r => r.json())
      .then(data => {
        if (typeof data.percent === "number") setCompletionPercent(data.percent);
        if (data.cashJob) {
          if (Array.isArray(data.items)) setCashProgressItems(data.items);
        } else {
          if (Array.isArray(data.items)) setProgressItems(data.items);
        }
      })
      .catch((err) => {
        console.warn("Failed to load project progress", err);
      });
  }, [project.id, documents.length, budgetLineItems.length]);

  // ---- financial calculations -------------------------------------------
  // ---- loan / profit calculations ----------------------------------------
  // Everything below comes from the canonical helper. Do NOT reintroduce
  // local math here — the financials page, the dashboard, and this page
  // must all agree, and that only happens when they share one calculator.
  // See lib/finance/project-financials.ts for the formula + rationale.
  const hasLoanFields = !!(project.sale_price && project.loan_amount);

  const pf = computeProjectFinancials(project, payments, drawRequests, miscCharges, new Date(), loanLedger, settlements);
  const {
    salePrice,
    loanAmount,
    downPayment,
    drawsFunded,
    originationFeePercent,
    originationFee,
    interestRate,
    accruedInterest,
    saleClosingCosts,
    hasSaleSettlement,
    miscCharges: miscChargesTotal,
    hasLoanLedger,
    projectedProfit,
    totalCosts,
    allInCosts,
  } = pf;
  const profitMargin = pf.profitMargin * 100;

  const contractValue = project.contract_value ?? project.estimated_value ?? 0;

  // ---- cash job markup ---------------------------------------------------
  const markupPercent = project.markup_percent ?? 0;
  const totalBudgetedForMarkup = budgetLineItems.reduce((s, i) => s + (i.budgeted_amount || 0), 0);
  const markupAmount = totalBudgetedForMarkup * (markupPercent / 100);
  const cashJobContractPrice = totalBudgetedForMarkup + markupAmount;

  // ---- cash job accurate spent -------------------------------------------
  // Mirrors the BudgetTab spentByLine logic so financial cards stay in sync.
  // See BudgetTab below for the full source-priority rationale. Cascade:
  //   0. payment.budget_line_number — explicit assignment
  //   1. document.line_item_number — legacy doc link
  //   2. invoice filename regex     — legacy naming convention
  //   3. unmatched payments         — still included in the total (was the
  //                                   silent-drop bug pre-2026-05-27)
  // Plus: owner-purchased budget items count at their budgeted amount even
  // when there's no invoice.
  const cashTotalSpent = (() => {
    if (!project.is_cash_job) return allInCosts;
    const spentByLine = new Map<string, number>();
    const counted = new Set<string>();

    const parseNum = (filename: string | null): string | null => {
      if (!filename) return null;
      const m = filename.match(/^(\d+[a-z]?)\s*[_ ]/i);
      return m ? m[1].toLowerCase() : null;
    };
    const numericPart = (s: string) => s.replace(/[a-z]/gi, "");
    const resolveLine = (parsed: string): string => {
      const lower = parsed.toLowerCase();
      if (budgetLineItems.some(b => b.line_number.toLowerCase() === lower)) return lower;
      const num = numericPart(lower);
      const fb = budgetLineItems.find(b => numericPart(b.line_number) === num);
      return fb ? fb.line_number : lower;
    };

    // Source 0: explicit budget_line_number assignment
    for (const payment of payments) {
      if (!payment.budget_line_number) continue;
      const key = resolveLine(payment.budget_line_number);
      spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
      counted.add(payment.id);
    }
    // Source 1: document-linked payments
    for (const doc of documents) {
      if (doc.line_item_number == null) continue;
      const payment = payments.find(p => p.invoice_file_url === doc.file_url);
      if (payment && !counted.has(payment.id)) {
        const key = resolveLine(doc.line_item_number);
        spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
        counted.add(payment.id);
      }
    }
    // Source 2: filename-parsed payments
    for (const payment of payments) {
      if (counted.has(payment.id)) continue;
      const parsed = parseNum(payment.invoice_file_name ?? null);
      if (!parsed) continue;
      const key = resolveLine(parsed);
      spentByLine.set(key, (spentByLine.get(key) || 0) + Number(payment.amount));
      counted.add(payment.id);
    }
    // Source 3: anything still unmatched contributes to the total
    const unmatchedTotal = payments
      .filter((p) => !counted.has(p.id))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    // Owner-purchased items (no invoice needed)
    for (const item of budgetLineItems) {
      if (item.owner_purchased && !spentByLine.has(item.line_number)) {
        spentByLine.set(item.line_number, item.budgeted_amount || 0);
      }
    }

    // Job costs sit outside the budget lines entirely — no invoice, no line
    // number — so none of the sources above can see them. Added here for the
    // same reason allInCosts exists on the financed side.
    return (
      Array.from(spentByLine.values()).reduce((s, v) => s + v, 0) +
      unmatchedTotal +
      miscChargesTotal
    );
  })();

  // ---- generic mutation helper -------------------------------------------
  async function mutate(
    url: string,
    method: string,
    body?: Record<string, unknown> | FormData,
  ) {
    // Read-only (contractor) backstop: refuse staff writes even if a control
    // slips through the UI gating. The two contractor-allowed actions —
    // uploading a document and updating a task's status — are let through; RLS
    // scopes both to the granted project server-side.
    if (readOnly) {
      const m = method.toUpperCase();
      const isDocUpload = m === "POST" && /\/documents$/.test(url);
      const isTaskUpdate = m === "PATCH" && /\/tasks\//.test(url);
      if (!isDocUpload && !isTaskUpdate) {
        toast.error("You have view-only access to this project.");
        return undefined;
      }
    }
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
    <ProjectEditContext.Provider value={canEdit}>
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
        {!project.is_cash_job && hasLoanFields ? (
          <FinancialSummary
            salePrice={salePrice}
            totalCosts={totalCosts}
            drawsFunded={drawsFunded}
            downPayment={downPayment}
            loanAmount={loanAmount}
            lenderName={project.lender_name}
            originationFee={originationFee}
            originationFeePercent={originationFeePercent}
            accruedInterest={accruedInterest}
            interestRate={interestRate}
            saleClosingCosts={saleClosingCosts}
            miscCharges={miscChargesTotal}
            hasLoanLedger={hasLoanLedger}
            hasSaleSettlement={hasSaleSettlement}
            projectedProfit={projectedProfit}
            profitMargin={profitMargin}
          />
        ) : project.is_cash_job ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <FinancialCard
              icon={<Wallet className="w-4 h-4 text-blue-500" />}
              label="Total Budget"
              value={totalBudgetedForMarkup}
            />
            <FinancialCard
              icon={<Percent className="w-4 h-4 text-indigo-500" />}
              label={`Markup (${markupPercent}%)`}
              value={markupAmount}
            />
            <FinancialCard
              icon={<Receipt className="w-4 h-4 text-emerald-500" />}
              label="Client Price"
              value={cashJobContractPrice}
            />
            <FinancialCard
              icon={<CreditCard className="w-4 h-4 text-orange-500" />}
              label="Costs So Far"
              value={cashTotalSpent}
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
            <FinancialCard
              icon={<Receipt className="w-4 h-4 text-blue-500" />}
              label="Contract Value"
              value={contractValue}
            />
            {/* allInCosts, not totalCosts: this branch is the only view of
               *  a project with no lender fields, so contractor payments and
               *  job costs have to land in one number, or a logged expense
               *  changes nothing on screen. */}
            <FinancialCard
              icon={<CreditCard className="w-4 h-4 text-orange-500" />}
              label="Costs"
              value={allInCosts}
            />
            {/* Once there's a sale price we can compute the real, financed
               *  figure, so show exactly what the Financial Summary shows.
               *  Before that, projectedProfit is just costs-so-far negated,
               *  which is alarming and useless — fall back to the gross number
               *  and label it honestly. Never two numbers called "Profit". */}
            {salePrice > 0 ? (
              <FinancialCard
                icon={
                  projectedProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )
                }
                label="Projected Profit"
                value={projectedProfit}
                caption="After financing and closing costs"
                colored
              />
            ) : (
              <FinancialCard
                icon={
                  contractValue - allInCosts >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )
                }
                label="Gross Profit"
                value={contractValue - allInCosts}
                caption="Before financing costs"
                colored
              />
            )}
          </div>
        )}

        {/* Job costs — spend with no contractor and no budget line: fuel,
         *  equipment rental, dump fees, and the one-off lender items this
         *  started out holding. The sum is subtracted from projected_profit
         *  in the helper.
         *
         *  Shown on every project. This used to require sale_price AND
         *  loan_amount, which meant a client build with no construction loan
         *  had nowhere to record a tank of fuel — and the table was still
         *  empty months later because the only jobs that could reach it were
         *  the ones the framing didn't fit. Financing decides how a job is
         *  paid for, not whether it burns diesel. */}
        <MiscChargesSection
          projectId={project.id}
          charges={miscCharges}
          mutate={mutate}
          loading={loading}
        />

        {/* Settlements — ALTA closing statements. Upload the PDF, Claude
         *  extracts the line items. When a sale settlement exists the
         *  helper derives sale_closing_costs from it automatically. */}
        {!project.is_cash_job && (
          <SettlementsSection
            projectId={project.id}
            settlements={settlements}
          />
        )}

        {/* Edit is a real action; the Task / Change Order / Selection / Bid
            Request buttons that used to sit here only switched tabs while
            reading as create actions. The grouped nav reaches them directly. */}
        <EditOnly>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/admin/projects/${project.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm cursor-pointer transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Project
            </Link>
          </div>
        </EditOnly>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabKey)}
          className="mt-6"
        >
          <ProjectTabNav
            groups={TAB_GROUPS}
            activePanel={activeTab}
            onSelectPanel={(key) => setActiveTab(key as TabKey)}
          />

          <TabsContent value="overview">
            <OverviewTab
              project={project}
              mutate={mutate}
              progressItems={progressItems}
              cashProgressItems={cashProgressItems}
              completionPercent={completionPercent}
            />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetTab
              projectId={project.id}
              budgetLineItems={budgetLineItems}
              payments={payments}
              documents={documents}
            />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab
              projectId={project.id}
              projectName={project.name}
              payments={payments}
              contractors={contractors}
              drawRequests={drawRequests}
              budgetLineItems={budgetLineItems}
              mutate={mutate}
              loading={loading}
              onPreview={(url, name) => setPreviewFile({ url, name })}
            />
          </TabsContent>
          <TabsContent value="draws">
            <DrawsTab
              projectId={project.id}
              projectName={project.name}
              project={project}
              payments={payments}
              draws={drawRequests}
              documents={documents}
              contractors={contractors}
              budgetLineItems={budgetLineItems}
              mutate={mutate}
              loading={loading}
              onPreview={(url, name) => setPreviewFile({ url, name })}
            />
          </TabsContent>
          <TabsContent value="loan">
            <LoanLedgerTab
              projectId={project.id}
              entries={loanLedger}
              draws={drawRequests}
            />
          </TabsContent>
          <TabsContent value="cashflow">
            <CashFlowTab
              projectId={project.id}
              projectName={project.name}
              payments={payments}
              loanLedger={loanLedger}
              settlements={settlements}
              miscCharges={miscCharges}
            />
          </TabsContent>
          <TabsContent value="permits">
            <PermitsTab
              projectId={project.id}
              permits={permits}
              mutate={mutate}
              loading={loading}
              onPreview={(url, name) => setPreviewFile({ url, name })}
            />
          </TabsContent>
          <TabsContent value="changeorders">
            <ChangeOrdersTab
              projectId={project.id}
              changeOrders={changeOrders}
              defaultClient={{
                name: project.client_name,
                email: project.client_email,
                phone: project.client_phone,
              }}
            />
          </TabsContent>
          <TabsContent value="selections">
            <SelectionsTab
              projectId={project.id}
              selections={selections}
              defaultClient={{
                name: project.client_name,
                email: project.client_email,
                phone: project.client_phone,
              }}
            />
          </TabsContent>
          <TabsContent value="bidrequests">
            <BidRequestsTab
              projectId={project.id}
              bidRequests={bidRequests}
              contractors={contractors}
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
    </ProjectEditContext.Provider>
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
  caption,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colored?: boolean;
  /** One line under the number saying what is and isn't included. */
  caption?: string;
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
        {caption && <p className="mt-0.5 text-[11px] text-gray-500">{caption}</p>}
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Job Costs
// ===========================================================================
// Spend with no contractor and no budget line: fuel, equipment rental, dump
// fees, plus the one-off lender items this started out holding (buyer rate
// buy-downs, late fees). Sum is subtracted from projected_profit and folded
// into allInCosts (see lib/finance/project-financials.ts).
// Kept inline in ProjectDetail.tsx so the section can share the mutate()
// helper and refresh state on edits.

// ===========================================================================
// Financial Summary (Loan / Profit Calculator)
// ===========================================================================

function FinancialSummary({
  salePrice,
  totalCosts,
  drawsFunded,
  downPayment,
  loanAmount,
  lenderName,
  originationFee,
  originationFeePercent,
  accruedInterest,
  interestRate,
  saleClosingCosts,
  miscCharges,
  hasLoanLedger,
  hasSaleSettlement,
  projectedProfit,
  profitMargin,
}: {
  salePrice: number;
  totalCosts: number;
  drawsFunded: number;
  downPayment: number;
  loanAmount: number;
  lenderName: string | null;
  originationFee: number;
  originationFeePercent: number;
  accruedInterest: number;
  interestRate: number;
  saleClosingCosts: number;
  miscCharges: number;
  hasLoanLedger: boolean;
  hasSaleSettlement: boolean;
  projectedProfit: number;
  profitMargin: number;
}) {
  // When down_payment > 0, origination is bundled in (per the user
  // data-entry convention). Showing both would imply double-subtraction.
  const showOriginationTile = downPayment <= 0 && originationFee > 0;
  const [expanded, setExpanded] = useState(true);
  const [mathOpen, setMathOpen] = useState(false);

  // Lender-side loan reality: how much of the loan has actually been
  // drawn. Replaces the static `loan_amount` commitment number which
  // doesn't change after origination and isn't a useful at-a-glance.
  const loanDrawn = drawsFunded + downPayment;
  const loanUtilization =
    loanAmount > 0 ? Math.min(loanDrawn / loanAmount, 1) : 0;

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
          {/* Row 1: Revenue side + loan utilization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <MiniCard
              icon={<DollarSign className="w-3.5 h-3.5 text-blue-500" />}
              label="Sale Price"
              value={fmt(salePrice)}
            />
            <MiniCard
              icon={<CreditCard className="w-3.5 h-3.5 text-orange-500" />}
              label="Total Costs"
              value={fmt(totalCosts)}
            />
            <MiniCard
              icon={<Landmark className="w-3.5 h-3.5 text-indigo-500" />}
              label="Loan Drawn"
              value={fmt(loanDrawn)}
              caption={
                loanAmount > 0
                  ? `${(loanUtilization * 100).toFixed(0)}% of ${fmt(loanAmount)}`
                  : undefined
              }
            />
            <MiniCard
              icon={<Banknote className="w-3.5 h-3.5 text-emerald-500" />}
              label="Down Payment"
              value={fmt(downPayment)}
            />
          </div>

          {/* Row 2: Costs subtracted from projected profit.
             *
             * Formula (lib/finance/project-financials.ts):
             *   profit = sale_price − total_costs − accrued_interest
             *          − sale_closing_costs − down_payment − misc_charges
             *
             * Origination shows only when down_payment is 0 (rare —
             * normally origination is rolled into down_payment per the
             * data-entry convention). Source badges tell Blake whether
             * a number is from lender actuals, the ALTA, or a formula. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {showOriginationTile ? (
              <MiniCard
                icon={<Percent className="w-3.5 h-3.5 text-purple-500" />}
                label={`Origination Fee (${originationFeePercent}%)`}
                value={fmt(originationFee)}
              />
            ) : (
              <MiniCard
                icon={<Building className="w-3.5 h-3.5 text-rose-500" />}
                label="Sale Closing Costs"
                value={fmt(saleClosingCosts)}
                className={saleClosingCosts > 0 ? "text-gray-900" : "text-gray-400"}
                badge={hasSaleSettlement ? "ALTA" : saleClosingCosts > 0 ? "estimate" : undefined}
              />
            )}
            <MiniCard
              icon={<TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
              label={`Accrued Interest (${interestRate}%)`}
              value={fmt(accruedInterest)}
              badge={hasLoanLedger ? "lender" : accruedInterest > 0 ? "formula" : undefined}
            />
            <MiniCard
              icon={<CreditCard className="w-3.5 h-3.5 text-rose-500" />}
              label="Job Costs"
              value={fmt(miscCharges)}
              className={miscCharges > 0 ? "text-gray-900" : "text-gray-400"}
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

          {/* Profit math — collapsible plain-English breakdown of how
           *  the headline number was derived. Useful when a tile reads
           *  different from what Blake expected and he wants to verify
           *  the subtraction. */}
          <button
            onClick={() => setMathOpen((v) => !v)}
            className="w-full flex items-center justify-between text-xs text-gray-600 hover:text-gray-900 cursor-pointer pt-1"
          >
            <span className="font-medium">
              {mathOpen ? "Hide" : "Show"} profit math
            </span>
            {mathOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {mathOpen && (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-1 text-xs tabular-nums">
              <MathRow label="Sale Price" value={salePrice} sign="+" />
              <MathRow label="Total Costs (contractors)" value={totalCosts} sign="−" />
              <MathRow
                label={`Accrued Interest${hasLoanLedger ? " (lender ledger)" : ""}`}
                value={accruedInterest}
                sign="−"
              />
              <MathRow
                label={`Sale Closing Costs${hasSaleSettlement ? " (from ALTA)" : ""}`}
                value={saleClosingCosts}
                sign="−"
              />
              <MathRow label="Down Payment" value={downPayment} sign="−" />
              <MathRow label="Job Costs" value={miscCharges} sign="−" />
              {showOriginationTile && (
                <MathRow
                  label={`Origination Fee (${originationFeePercent}%)`}
                  value={originationFee}
                  sign="−"
                />
              )}
              <div className="border-t border-gray-300 pt-1 mt-1 flex items-center justify-between">
                <span className="font-bold text-gray-900">Projected Profit</span>
                <span className={`font-bold ${profitColor}`}>
                  {fmt(projectedProfit)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </ShadCard>
  );
}

function MathRow({
  label,
  value,
  sign,
}: {
  label: string;
  value: number;
  sign: "+" | "−";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900">
        {sign} {fmt(value)}
      </span>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  value,
  className,
  caption,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
  caption?: string;
  /** Small tag indicating the source of the number — "ALTA",
   *  "lender", "estimate", etc. Color is derived from content. */
  badge?: string;
}) {
  const badgeColor =
    badge === "ALTA" || badge === "lender"
      ? "bg-emerald-100 text-emerald-700"
      : badge === "estimate" || badge === "formula"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-600";
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <span className="text-[11px] text-gray-500 font-medium">{label}</span>
        {badge && (
          <span
            className={`ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badgeColor}`}
          >
            {badge}
          </span>
        )}
      </div>
      <p className={`text-sm font-semibold tabular-nums ${className ?? "text-gray-900"}`}>
        {value}
      </p>
      {caption && (
        <p className="text-[10px] text-gray-400 mt-0.5">{caption}</p>
      )}
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
              <EditOnly>
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
              </EditOnly>
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
  cashItems,
  isCashJob,
  completionPercent,
}: {
  items: ProgressItem[];
  cashItems?: CashProgressItem[];
  isCashJob?: boolean;
  completionPercent: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const fmt = formatCurrencyWhole;

  // ── Cash job mode ────────────────────────────────────────────────────────
  if (isCashJob) {
    const cash = cashItems ?? [];
    const done = cash.filter(i => i.completed);
    const pending = cash.filter(i => !i.completed);
    const totalBudgeted = cash.reduce((s, i) => s + i.budgeted_amount, 0);
    const coveredBudget = done.reduce((s, i) => s + i.budgeted_amount, 0);

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
                {done.length} of {cash.length} items covered · {fmt(coveredBudget)} of {fmt(totalBudgeted)}
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
            {cash.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No budget items yet</p>
            ) : (
              <div className="space-y-3">
                {/* Completed items */}
                {done.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-green-600">Completed</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="space-y-0.5">
                      {done.map((item) => (
                        <div key={item.line_number} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                          item.source === "owner_purchased" ? "bg-amber-50" : "bg-green-50"
                        }`}>
                          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                            item.source === "owner_purchased"
                              ? "bg-amber-500 border-amber-500"
                              : "bg-green-500 border-green-500"
                          }`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <span className={`text-sm flex-1 ${
                            item.source === "owner_purchased" ? "text-amber-700" : "text-green-700"
                          }`}>
                            {item.description}
                          </span>
                          <span className="text-xs text-gray-400 tabular-nums shrink-0">{fmt(item.budgeted_amount)}</span>
                          {item.source === "owner_purchased" && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 shrink-0">Owner</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending items */}
                {pending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Remaining</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="space-y-0.5">
                      {pending.map((item) => (
                        <div key={item.line_number} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                          <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0" />
                          <span className="text-sm flex-1 text-gray-600">{item.description}</span>
                          <span className="text-xs text-gray-400 tabular-nums shrink-0">{fmt(item.budgeted_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </ShadCard>
    );
  }

  // ── Standard NAHB mode ───────────────────────────────────────────────────
  const completedCount = items.filter(i => i.completed).length;

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
  cashProgressItems,
  completionPercent,
}: {
  project: Project;
  mutate: (
    url: string,
    method: string,
    body?: Record<string, unknown>,
  ) => Promise<Response | undefined>;
  progressItems: ProgressItem[];
  cashProgressItems: CashProgressItem[];
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
          cashItems={cashProgressItems}
          isCashJob={project.is_cash_job}
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
              <EditOnly>
                <button
                  onClick={() => startEdit("description")}
                  aria-label="Edit description"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-black cursor-pointer transition-opacity"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </EditOnly>
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
              <EditOnly>
                <button
                  onClick={() => startEdit("notes")}
                  aria-label="Edit notes"
                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-black cursor-pointer transition-opacity"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </EditOnly>
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
            <EditOnly>
              <button
                onClick={startEditing}
                aria-label="Edit property details"
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-black cursor-pointer transition-opacity"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </EditOnly>
          </div>
        )}
      </CardContent>
    </ShadCard>
  );
}

// ===========================================================================
// Payments Tab
// ===========================================================================

// ===========================================================================
// Draws Tab
// ===========================================================================

// ===========================================================================
// Permits Tab
// ===========================================================================

// ===========================================================================
// Permit Extraction Confirmation Modal
// ===========================================================================

// ===========================================================================
// Documents Tab
// ===========================================================================

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
                    <Image
                      src={fileDownloadUrl(doc.file_url)}
                      alt={doc.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      unoptimized
                      className="object-cover"
                    />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200" />
                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditOnly>
                      <button
                        onClick={() => deletePhoto(doc)}
                        className="w-7 h-7 flex items-center justify-center bg-white/90 rounded-full text-red-500 hover:bg-white cursor-pointer"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      </EditOnly>
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

// ===========================================================================
// Budget Tab
// ===========================================================================

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

