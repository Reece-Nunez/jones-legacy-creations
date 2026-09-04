"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RiskFlagPanel } from "@/components/admin/quotes/RiskFlagPanel";
import { SimpleQuoteEditor, type SimpleQuoteItem } from "@/components/admin/quotes/SimpleQuoteEditor";
import { priceWithProfit } from "@/lib/quotes/profit";
import { SendQuoteModal } from "@/components/admin/quotes/SendQuoteModal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Calculator,
  Save,
  Plus,
  FileText,
  Printer,
  FolderPlus,
  Mail,
} from "lucide-react";
import type {
  Quote,
  QuoteSection,
  QuoteItem,
  QuoteExclusion,
  QuoteAllowance,
  QuoteRiskFlag,
  QuoteVendorQuote,
  QuoteFile,
  QuoteRevision,
  QuoteStatus,
  AllowanceCategory,
  ExclusionCategory,
} from "@/lib/types/quotes";
import {
  JOB_TYPE_LABELS,
  ESTIMATE_STAGE_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  ALLOWANCE_CATEGORY_LABELS,
} from "@/lib/types/quotes";
import { formatCurrency as fmt } from "@/lib/formatters";

// ── Types ────────────────────────────────────────────────────────────────────

interface SectionWithItems extends QuoteSection {
  items: QuoteItem[];
}

interface FullQuote extends Quote {
  sections: SectionWithItems[];
  exclusions: QuoteExclusion[];
  allowances: QuoteAllowance[];
  risk_flags: QuoteRiskFlag[];
  vendor_quotes: QuoteVendorQuote[];
  files: QuoteFile[];
}

interface QuoteDetailProps {
  quoteId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString() : "--";

const TABS = [
  "Overview",
  "Cost Breakdown",
  "Allowances & Exclusions",
  "Files & Vendor Quotes",
  "Revisions",
] as const;

type Tab = (typeof TABS)[number];

const STATUS_OPTIONS = Object.entries(QUOTE_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

const ALLOWANCE_CAT_OPTIONS = Object.entries(ALLOWANCE_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
);

const EXCLUSION_CAT_OPTIONS = [
  { value: "scope", label: "Scope" },
  { value: "conditions", label: "Conditions" },
  { value: "warranty", label: "Warranty" },
  { value: "liability", label: "Liability" },
  { value: "schedule", label: "Schedule" },
  { value: "other", label: "Other" },
];

// ── Main Component ───────────────────────────────────────────────────────────

export function QuoteDetail({ quoteId }: QuoteDetailProps) {
  const [quote, setQuote] = useState<FullQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [recalculating, setRecalculating] = useState(false);

  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [showAddExclusion, setShowAddExclusion] = useState(false);

  // Revision form
  const [revisionSummary, setRevisionSummary] = useState("");
  const [creatingRevision, setCreatingRevision] = useState(false);

  // Convert to project
  const [convertingToProject, setConvertingToProject] = useState(false);

  // Send quote modal
  const [showSendModal, setShowSendModal] = useState(false);
  const [simpleItems, setSimpleItems] = useState<SimpleQuoteItem[]>([]);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`);
      if (!res.ok) throw new Error("Failed to fetch quote");
      const data = await res.json();
      setQuote(data);
      // Load simple_items from job_type_inputs if they exist
      const inputs = data.job_type_inputs as Record<string, unknown> | null;
      if (inputs?.simple_items && Array.isArray(inputs.simple_items)) {
        setSimpleItems(inputs.simple_items as SimpleQuoteItem[]);
      }
    } catch {
      toast.error("Failed to load quote data");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateStatus = async (status: QuoteStatus) => {
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      await fetchQuote();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/calculate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success("Totals recalculated");
      await fetchQuote();
    } catch {
      toast.error("Failed to recalculate");
    } finally {
      setRecalculating(false);
    }
  };

  const saveRevision = async () => {
    setCreatingRevision(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_summary: revisionSummary || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Revision saved");
      setRevisionSummary("");
      await fetchQuote();
    } catch {
      toast.error("Failed to save revision");
    } finally {
      setCreatingRevision(false);
    }
  };

  // Items
  const addAllowance = async (form: {
    category: AllowanceCategory;
    description: string;
    amount: number;
  }) => {
    try {
      const sortOrder = (quote?.allowances?.length ?? 0) + 1;
      const res = await fetch(`/api/admin/quotes/${quoteId}/allowances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sort_order: sortOrder }),
      });
      if (!res.ok) throw new Error();
      toast.success("Allowance added");
      setShowAddAllowance(false);
      await fetchQuote();
    } catch {
      toast.error("Failed to add allowance");
    }
  };

  const addExclusion = async (form: {
    exclusion_text: string;
    category: ExclusionCategory;
  }) => {
    try {
      const sortOrder = (quote?.exclusions?.length ?? 0) + 1;
      const res = await fetch(`/api/admin/quotes/${quoteId}/exclusions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sort_order: sortOrder }),
      });
      if (!res.ok) throw new Error();
      toast.success("Exclusion added");
      setShowAddExclusion(false);
      await fetchQuote();
    } catch {
      toast.error("Failed to add exclusion");
    }
  };

  // Convert quote to project
  const convertToProject = async () => {
    const confirmed = await new Promise<boolean>((resolve) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Create a new project from this quote? This will set the quote status to Accepted and generate budget line items from the cost breakdown.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { toast.dismiss(t.id); resolve(true); }}
                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                Yes, Convert
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
    setConvertingToProject(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/convert-to-project`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to create project");
      }
      const project = await res.json();
      toast.success("Project created successfully");
      window.location.href = `/admin/projects/${project.id}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setConvertingToProject(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-20 text-gray-500">
        Quote data could not be loaded.
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/quotes"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              {quote.quote_number}
            </h1>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                QUOTE_STATUS_COLORS[quote.status]
              )}
            >
              {QUOTE_STATUS_LABELS[quote.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            {JOB_TYPE_LABELS[quote.job_type_slug]} &middot;{" "}
            {ESTIMATE_STAGE_LABELS[quote.estimate_stage]} &middot;{" "}
            {quote.client_name} &middot; {quote.project_name}
          </p>
          {quote.address && (
            <p className="text-sm text-gray-400 ml-8">{quote.address}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-8 sm:ml-0">
          <Select
            options={STATUS_OPTIONS}
            value={quote.status}
            onChange={(e) => updateStatus(e.target.value as QuoteStatus)}
            className="!py-2 !text-sm w-44"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={recalculate}
            isLoading={recalculating}
          >
            <Calculator className="w-4 h-4 mr-1" />
            Recalculate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab("Revisions")}
          >
            <Save className="w-4 h-4 mr-1" />
            Revisions
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSendModal(true)}
          >
            <Mail className="w-4 h-4 mr-1" />
            Send Quote
          </Button>
          <Link href={`/admin/quotes/${quoteId}/proposal`}>
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-1" />
              Proposal
            </Button>
          </Link>
          {!quote.project_id ? (
            <Button
              size="sm"
              onClick={convertToProject}
              isLoading={convertingToProject}
              className="!bg-green-700 hover:!bg-green-800"
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Create Project
            </Button>
          ) : (
            <Link href={`/admin/projects/${quote.project_id}`}>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                View Project
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors -mb-px",
              activeTab === tab
                ? "border-b-2 border-black text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && <OverviewTab quote={quote} />}
      {activeTab === "Cost Breakdown" && (
        <SimpleQuoteEditor
          jobType={quote.job_type_slug}
          initialItems={simpleItems.length > 0 ? simpleItems : undefined}
          initialProfitPct={Number(quote.profit_pct) || 0}
          initialSquareFootage={
            Number((quote.job_type_inputs as Record<string, unknown>)?.square_footage) || 0
          }
          onSave={async (items, meta) => {
            setSimpleItems(items);
            // subtotal is Blake's cost, grand_total is what the client is
            // quoted, and profit_amount is the gap — all three stored so the
            // margin is reportable, not just visible on screen.
            try {
              const priced = priceWithProfit(items, meta.profitPct);
              const res = await fetch(`/api/admin/quotes/${quoteId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_type_inputs: {
                    ...(quote.job_type_inputs as Record<string, unknown>),
                    simple_items: items,
                    square_footage: meta.squareFootage,
                  },
                  profit_pct: meta.profitPct,
                  profit_amount: priced.totalProfit,
                  subtotal: priced.totalCost,
                  grand_total: priced.clientTotal,
                }),
              });
              if (!res.ok) throw new Error();
              toast.success("Quote saved");
              await fetchQuote();
            } catch {
              toast.error("Failed to save quote");
            }
          }}
        />
      )}
      {activeTab === "Allowances & Exclusions" && (
        <AllowancesExclusionsTab
          quote={quote}
          showAddAllowance={showAddAllowance}
          setShowAddAllowance={setShowAddAllowance}
          addAllowance={addAllowance}
          showAddExclusion={showAddExclusion}
          setShowAddExclusion={setShowAddExclusion}
          addExclusion={addExclusion}
        />
      )}
      {activeTab === "Files & Vendor Quotes" && (
        <FilesVendorTab quote={quote} />
      )}
      {activeTab === "Revisions" && (
        <RevisionsTab
          quote={quote}
          revisionSummary={revisionSummary}
          setRevisionSummary={setRevisionSummary}
          saveRevision={saveRevision}
          creatingRevision={creatingRevision}
        />
      )}

      {/* Send Quote Modal */}
      {showSendModal && (
        <SendQuoteModal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          quote={quote}
          items={simpleItems.length > 0 ? simpleItems : (
            ((quote.job_type_inputs as Record<string, unknown>)?.simple_items as SimpleQuoteItem[]) || []
          )}
        />
      )}
    </div>
  );
}

// ── Tab Components ───────────────────────────────────────────────────────────

function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm p-6",
        className
      )}
    >
      {title && (
        <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ quote }: { quote: FullQuote }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Project Info">
        <div className="space-y-0">
          <InfoRow label="Client" value={quote.client_name} />
          <InfoRow label="Project" value={quote.project_name} />
          <InfoRow
            label="Address"
            value={
              [quote.address, quote.city, quote.state, quote.zip]
                .filter(Boolean)
                .join(", ") || "--"
            }
          />
          {quote.county && <InfoRow label="County" value={quote.county} />}
          <InfoRow label="Start Date" value={fmtDate(quote.target_start_date)} />
          <InfoRow
            label="Completion"
            value={fmtDate(quote.desired_completion_date)}
          />
          <InfoRow
            label="Valid Through"
            value={fmtDate(quote.valid_through_date)}
          />
          {quote.scope_summary && (
            <div className="pt-3">
              <p className="text-sm text-gray-500 mb-1">Scope Summary</p>
              <p className="text-sm text-gray-700">{quote.scope_summary}</p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Pricing Summary">
        {(() => {
          const inputs = quote.job_type_inputs as Record<string, unknown> | null;
          const simpleItems = (inputs?.simple_items as Array<{ trade: string; cost: number; isOwnerPurchase: boolean }>) || [];
          if (simpleItems.length === 0) {
            return (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-400">No costs entered yet</p>
                <p className="text-xs text-gray-400 mt-1">Go to the Cost Breakdown tab to add trades and costs</p>
              </div>
            );
          }
          const tradeCosts = simpleItems.filter((i) => !i.isOwnerPurchase).reduce((s, i) => s + (i.cost || 0), 0);
          const ownerCosts = simpleItems.filter((i) => i.isOwnerPurchase).reduce((s, i) => s + (i.cost || 0), 0);
          const filledTrades = simpleItems.filter((i) => !i.isOwnerPurchase && i.cost > 0);
          return (
            <div className="space-y-0">
              {filledTrades.slice(0, 8).map((item, i) => (
                <InfoRow key={i} label={item.trade} value={fmt(item.cost)} />
              ))}
              {filledTrades.length > 8 && (
                <p className="text-xs text-gray-400 py-1">+ {filledTrades.length - 8} more trades</p>
              )}
              <div className="flex justify-between py-3 border-t border-gray-200 mt-2">
                <span className="text-sm font-semibold text-gray-700">Trade Costs</span>
                <span className="text-sm font-semibold">{fmt(tradeCosts)}</span>
              </div>
              {ownerCosts > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-sm font-semibold text-gray-700">Owner Purchases</span>
                  <span className="text-sm font-semibold">{fmt(ownerCosts)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t-2 border-gray-900 mt-1">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-base font-bold text-gray-900">{fmt(tradeCosts + ownerCosts)}</span>
              </div>
            </div>
          );
        })()}
      </Card>

      <Card title="Site Conditions">
        <div className="space-y-0">
          <InfoRow
            label="Occupancy"
            value={quote.occupied_or_vacant ?? "--"}
          />
          <InfoRow
            label="Plans Available"
            value={quote.plans_available ?? "--"}
          />
          <InfoRow
            label="Engineering"
            value={quote.engineering_available ?? "--"}
          />
          <InfoRow
            label="Permit Status"
            value={quote.permit_status ?? "--"}
          />
          <InfoRow
            label="Utilities"
            value={quote.utilities_status ?? "--"}
          />
          <InfoRow
            label="Financing Required"
            value={quote.financing_required ? "Yes" : "No"}
          />
        </div>
      </Card>

      <Card title="Risk Flags">
        {quote.risk_flags.length > 0 ? (
          <RiskFlagPanel flags={quote.risk_flags} />
        ) : (
          <p className="text-sm text-gray-400">No risk flags identified.</p>
        )}
      </Card>
    </div>
  );
}

// ── Allowances & Exclusions Tab ──────────────────────────────────────────────

function AllowancesExclusionsTab({
  quote,
  showAddAllowance,
  setShowAddAllowance,
  addAllowance,
  showAddExclusion,
  setShowAddExclusion,
  addExclusion,
}: {
  quote: FullQuote;
  showAddAllowance: boolean;
  setShowAddAllowance: (v: boolean) => void;
  addAllowance: (form: {
    category: AllowanceCategory;
    description: string;
    amount: number;
  }) => void;
  showAddExclusion: boolean;
  setShowAddExclusion: (v: boolean) => void;
  addExclusion: (form: {
    exclusion_text: string;
    category: ExclusionCategory;
  }) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Allowances */}
      <Card title="Allowances">
        {quote.allowances.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {quote.allowances.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium mr-2">
                    {ALLOWANCE_CATEGORY_LABELS[a.category]}
                  </span>
                  <span className="text-sm text-gray-700">
                    {a.description}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {fmt(a.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No allowances defined.</p>
        )}

        {showAddAllowance ? (
          <AddAllowanceForm
            onSubmit={addAllowance}
            onCancel={() => setShowAddAllowance(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddAllowance(true)}
            className="mt-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Allowance
          </button>
        )}
      </Card>

      {/* Exclusions */}
      <Card title="Exclusions">
        {quote.exclusions.length > 0 ? (
          <ol className="list-decimal list-inside space-y-2">
            {quote.exclusions.map((e) => (
              <li key={e.id} className="text-sm text-gray-700">
                <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium mr-2">
                  {e.category}
                </span>
                {e.exclusion_text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-400">No exclusions defined.</p>
        )}

        {showAddExclusion ? (
          <AddExclusionForm
            onSubmit={addExclusion}
            onCancel={() => setShowAddExclusion(false)}
          />
        ) : (
          <button
            onClick={() => setShowAddExclusion(true)}
            className="mt-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add Exclusion
          </button>
        )}
      </Card>
    </div>
  );
}

function AddAllowanceForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: {
    category: AllowanceCategory;
    description: string;
    amount: number;
  }) => void;
  onCancel: () => void;
}) {
  const [category, setCategory] = useState<AllowanceCategory>("other");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select
          label="Category"
          options={ALLOWANCE_CAT_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value as AllowanceCategory)}
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (!description.trim()) {
              toast.error("Description is required");
              return;
            }
            onSubmit({ category, description, amount });
          }}
        >
          Add
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function AddExclusionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: {
    exclusion_text: string;
    category: ExclusionCategory;
  }) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ExclusionCategory>("scope");

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Exclusion Text"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Select
          label="Category"
          options={EXCLUSION_CAT_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value as ExclusionCategory)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (!text.trim()) {
              toast.error("Exclusion text is required");
              return;
            }
            onSubmit({ exclusion_text: text, category });
          }}
        >
          Add
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Files & Vendor Quotes Tab ────────────────────────────────────────────────

function FilesVendorTab({ quote }: { quote: FullQuote }) {
  const VENDOR_STATUS_COLORS: Record<string, string> = {
    requested: "bg-yellow-100 text-yellow-700",
    received: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
    expired: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="Vendor Quotes">
        {quote.vendor_quotes.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {quote.vendor_quotes.map((vq) => (
              <div key={vq.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">
                    {vq.vendor_name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      VENDOR_STATUS_COLORS[vq.status] ??
                        "bg-gray-100 text-gray-500"
                    )}
                  >
                    {vq.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{vq.scope_description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{fmt(vq.amount)}</span>
                  {vq.received_date && (
                    <span>Received: {fmtDate(vq.received_date)}</span>
                  )}
                  {vq.expiry_date && (
                    <span>Expires: {fmtDate(vq.expiry_date)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No vendor quotes yet.</p>
        )}
        <button
          className="mt-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-not-allowed opacity-50"
          disabled
        >
          <Plus className="w-3 h-3" /> Add Vendor Quote (coming soon)
        </button>
      </Card>

      <Card title="Files">
        {quote.files.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {quote.files.map((f) => (
              <div
                key={f.id}
                className="py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {f.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {f.category} &middot; {fmtDate(f.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No files uploaded.</p>
        )}
        <button
          className="mt-4 text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-not-allowed opacity-50"
          disabled
        >
          <Plus className="w-3 h-3" /> Upload File (coming soon)
        </button>
      </Card>
    </div>
  );
}

// ── Revisions Tab ────────────────────────────────────────────────────────────

function RevisionsTab({
  quote,
  revisionSummary,
  setRevisionSummary,
  saveRevision,
  creatingRevision,
}: {
  quote: FullQuote;
  revisionSummary: string;
  setRevisionSummary: (v: string) => void;
  saveRevision: () => void;
  creatingRevision: boolean;
}) {
  const [revisions, setRevisions] = useState<QuoteRevision[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // The stale error is cleared on the success path rather than synchronously
    // here: setting state in the effect body forces a second render pass, and
    // a reload that fails should keep showing an error rather than blanking it
    // and re-adding it a moment later.
    fetch(`/api/admin/quotes/${quote.id}/revisions`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load revisions");
        }
        return r.json();
      })
      .then((data) => {
        setRevisions(Array.isArray(data) ? data : []);
        setLoadError(null);
        setLoaded(true);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load revisions");
        setLoaded(true);
      });
  }, [quote.id, quote.revision_number]);

  return (
    <div className="space-y-6">
      <Card title="Create Revision Snapshot">
        <p className="text-sm text-gray-500 mb-3">
          Save a snapshot of the current quote state before making changes.
          Current revision: <strong>#{quote.revision_number}</strong>
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Change summary (optional)"
            value={revisionSummary}
            onChange={(e) => setRevisionSummary(e.target.value)}
            className="!py-2 !text-sm flex-1"
          />
          <Button
            size="sm"
            onClick={saveRevision}
            isLoading={creatingRevision}
          >
            <Save className="w-4 h-4 mr-1" /> Save Revision
          </Button>
        </div>
      </Card>

      <Card title="Revision History">
        {!loaded ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : revisions.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {revisions.map((rev) => (
              <div key={rev.id} className="py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    Revision #{rev.revision_number}
                  </span>
                  <span className="text-xs text-gray-400">
                    {fmtDate(rev.created_at)}
                  </span>
                </div>
                {rev.changed_by && (
                  <p className="text-xs text-gray-500">By: {rev.changed_by}</p>
                )}
                {rev.change_summary && (
                  <p className="text-sm text-gray-600">{rev.change_summary}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No revisions saved yet.</p>
        )}
      </Card>
    </div>
  );
}
