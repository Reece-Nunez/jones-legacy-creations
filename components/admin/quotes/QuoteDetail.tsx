"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RiskFlagPanel } from "@/components/admin/quotes/RiskFlagPanel";
import { SimpleQuoteEditor, type SimpleQuoteItem } from "@/components/admin/quotes/SimpleQuoteEditor";
import { SendQuoteModal } from "@/components/admin/quotes/SendQuoteModal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Calculator,
  Save,
  ChevronDown,
  ChevronRight,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Tag,
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
  CostCategorySlug,
  ItemUnit,
  AllowanceCategory,
  ExclusionCategory,
} from "@/lib/types/quotes";
import {
  JOB_TYPE_LABELS,
  ESTIMATE_STAGE_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  COST_CATEGORY_LABELS,
  ITEM_UNIT_LABELS,
  ALLOWANCE_CATEGORY_LABELS,
} from "@/lib/types/quotes";

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
  initialQuote: Quote;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    v
  );

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

const COST_CATEGORY_OPTIONS = Object.entries(COST_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
);

const UNIT_OPTIONS = Object.entries(ITEM_UNIT_LABELS).map(
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

export function QuoteDetail({ quoteId, initialQuote }: QuoteDetailProps) {
  const [quote, setQuote] = useState<FullQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Inline editing
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<Record<string, unknown>>(
    {}
  );

  // Add forms
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
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

  // Delete confirmation
  const [deletingItem, setDeletingItem] = useState<string | null>(null);

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
  const saveItem = async (itemId: string) => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/quotes/${quoteId}/items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingValues),
        }
      );
      if (!res.ok) throw new Error();
      toast.success("Item updated");
      setEditingItem(null);
      setEditingValues({});
      await fetchQuote();
    } catch {
      toast.error("Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const res = await fetch(
        `/api/admin/quotes/${quoteId}/items/${itemId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Item deleted");
      setDeletingItem(null);
      await fetchQuote();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const addItem = async (sectionId: string, form: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, ...form }),
      });
      if (!res.ok) throw new Error();
      toast.success("Item added");
      setShowAddItem(null);
      await fetchQuote();
    } catch {
      toast.error("Failed to add item");
    }
  };

  const addSection = async (form: {
    category_slug: CostCategorySlug;
    name: string;
  }) => {
    try {
      const sortOrder = (quote?.sections?.length ?? 0) + 1;
      const res = await fetch(`/api/admin/quotes/${quoteId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sort_order: sortOrder,
          is_visible_to_client: true,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Section added");
      setShowAddSection(false);
      await fetchQuote();
    } catch {
      toast.error("Failed to add section");
    }
  };

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
    if (!confirm("Create a new project from this quote? This will set the quote status to Accepted and generate budget line items from the cost breakdown.")) {
      return;
    }
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

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditItem = (item: QuoteItem) => {
    setEditingItem(item.id);
    setEditingValues({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      material_cost: item.material_cost,
      labor_cost: item.labor_cost,
      equipment_cost: item.equipment_cost,
      subcontractor_cost: item.subcontractor_cost,
      markup_pct: item.markup_pct,
    });
  };

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
          quoteId={quoteId}
          jobType={quote.job_type_slug}
          initialItems={simpleItems.length > 0 ? simpleItems : undefined}
          onSave={async (items) => {
            setSimpleItems(items);
            // Save items to quote's job_type_inputs as simple_items
            try {
              const res = await fetch(`/api/admin/quotes/${quoteId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  job_type_inputs: {
                    ...(quote.job_type_inputs as Record<string, unknown>),
                    simple_items: items,
                  },
                  grand_total: items.reduce((sum, i) => sum + i.cost, 0),
                  subtotal: items.filter((i) => !i.isOwnerPurchase).reduce((sum, i) => sum + i.cost, 0),
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

// ── Cost Breakdown Tab ───────────────────────────────────────────────────────

function CostBreakdownTab({
  quote,
  expandedSections,
  toggleSection,
  editingItem,
  editingValues,
  setEditingValues,
  startEditItem,
  saveItem,
  cancelEditItem,
  saving,
  deletingItem,
  setDeletingItem,
  deleteItem,
  showAddItem,
  setShowAddItem,
  addItem,
  showAddSection,
  setShowAddSection,
  addSection,
}: {
  quote: FullQuote;
  expandedSections: Set<string>;
  toggleSection: (id: string) => void;
  editingItem: string | null;
  editingValues: Record<string, unknown>;
  setEditingValues: (v: Record<string, unknown>) => void;
  startEditItem: (item: QuoteItem) => void;
  saveItem: (itemId: string) => void;
  cancelEditItem: () => void;
  saving: boolean;
  deletingItem: string | null;
  setDeletingItem: (id: string | null) => void;
  deleteItem: (id: string) => void;
  showAddItem: string | null;
  setShowAddItem: (id: string | null) => void;
  addItem: (sectionId: string, form: Record<string, unknown>) => void;
  showAddSection: boolean;
  setShowAddSection: (v: boolean) => void;
  addSection: (form: { category_slug: CostCategorySlug; name: string }) => void;
}) {
  return (
    <div className="space-y-4">
      {quote.sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        return (
          <Card key={section.id} className="!p-0 overflow-hidden">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-gray-900">
                  {section.name}
                </span>
                {!section.is_visible_to_client && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Internal
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {fmt(section.subtotal)}
              </span>
            </button>

            {/* Items table */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                {section.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2">Unit</th>
                          <th className="px-3 py-2 text-right">Material</th>
                          <th className="px-3 py-2 text-right">Labor</th>
                          <th className="px-3 py-2 text-right">Equip</th>
                          <th className="px-3 py-2 text-right">Sub</th>
                          <th className="px-3 py-2 text-right">Markup%</th>
                          <th className="px-3 py-2 text-right">Tax</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 w-10"></th>
                          <th className="px-3 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {section.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            isEditing={editingItem === item.id}
                            editingValues={editingValues}
                            setEditingValues={setEditingValues}
                            onStartEdit={() => startEditItem(item)}
                            onSave={() => saveItem(item.id)}
                            onCancel={cancelEditItem}
                            saving={saving}
                            isDeleting={deletingItem === item.id}
                            onRequestDelete={() => setDeletingItem(item.id)}
                            onConfirmDelete={() => deleteItem(item.id)}
                            onCancelDelete={() => setDeletingItem(null)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-6 py-4 text-sm text-gray-400">
                    No line items yet.
                  </p>
                )}

                {/* Add item */}
                {showAddItem === section.id ? (
                  <AddItemForm
                    onSubmit={(form) => addItem(section.id, form)}
                    onCancel={() => setShowAddItem(null)}
                  />
                ) : (
                  <div className="px-6 py-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowAddItem(section.id)}
                      className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {/* Add section */}
      {showAddSection ? (
        <AddSectionForm
          onSubmit={addSection}
          onCancel={() => setShowAddSection(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddSection(true)}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Section
        </button>
      )}
    </div>
  );
}

// ── Item Row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  isEditing,
  editingValues,
  setEditingValues,
  onStartEdit,
  onSave,
  onCancel,
  saving,
  isDeleting,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  item: QuoteItem;
  isEditing: boolean;
  editingValues: Record<string, unknown>;
  setEditingValues: (v: Record<string, unknown>) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isDeleting: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const updateField = (field: string, value: unknown) => {
    setEditingValues({ ...editingValues, [field]: value });
  };

  if (isEditing) {
    return (
      <tr className="bg-yellow-50">
        <td className="px-3 py-2">
          <input
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            value={(editingValues.description as string) ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-right"
            value={(editingValues.quantity as number) ?? 0}
            onChange={(e) =>
              updateField("quantity", parseFloat(e.target.value) || 0)
            }
          />
        </td>
        <td className="px-3 py-2">
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={(editingValues.unit as string) ?? "ea"}
            onChange={(e) => updateField("unit", e.target.value)}
          >
            {UNIT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
            value={(editingValues.material_cost as number) ?? 0}
            onChange={(e) =>
              updateField("material_cost", parseFloat(e.target.value) || 0)
            }
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
            value={(editingValues.labor_cost as number) ?? 0}
            onChange={(e) =>
              updateField("labor_cost", parseFloat(e.target.value) || 0)
            }
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
            value={(editingValues.equipment_cost as number) ?? 0}
            onChange={(e) =>
              updateField("equipment_cost", parseFloat(e.target.value) || 0)
            }
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right"
            value={(editingValues.subcontractor_cost as number) ?? 0}
            onChange={(e) =>
              updateField(
                "subcontractor_cost",
                parseFloat(e.target.value) || 0
              )
            }
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-right"
            value={(editingValues.markup_pct as number) ?? 0}
            onChange={(e) =>
              updateField("markup_pct", parseFloat(e.target.value) || 0)
            }
          />
        </td>
        <td className="px-3 py-2 text-right text-gray-400">--</td>
        <td className="px-3 py-2 text-right text-gray-400">--</td>
        <td className="px-3 py-2" />
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={onSave}
              disabled={saving}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer"
      onClick={onStartEdit}
    >
      <td className="px-3 py-2 text-gray-900">
        <div className="flex items-center gap-2">
          {item.description}
          {item.is_internal_only && (
            <span title="Internal only">
              <Lock className="w-3 h-3 text-gray-400" />
            </span>
          )}
          {item.is_allowance && (
            <span title="Allowance">
              <Tag className="w-3 h-3 text-blue-500" />
            </span>
          )}
          {item.is_vendor_quote_required && (
            <span title="Vendor quote required">
              <FileText className="w-3 h-3 text-orange-500" />
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-right">{item.quantity}</td>
      <td className="px-3 py-2">{ITEM_UNIT_LABELS[item.unit]}</td>
      <td className="px-3 py-2 text-right">{fmt(item.material_cost)}</td>
      <td className="px-3 py-2 text-right">{fmt(item.labor_cost)}</td>
      <td className="px-3 py-2 text-right">{fmt(item.equipment_cost)}</td>
      <td className="px-3 py-2 text-right">{fmt(item.subcontractor_cost)}</td>
      <td className="px-3 py-2 text-right">{item.markup_pct}%</td>
      <td className="px-3 py-2 text-right">{fmt(item.tax)}</td>
      <td className="px-3 py-2 text-right font-medium">{fmt(item.total)}</td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2">
        {isDeleting ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onConfirmDelete}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Yes
            </button>
            <button
              onClick={onCancelDelete}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Add Item Form ────────────────────────────────────────────────────────────

function AddItemForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    description: "",
    quantity: 1,
    unit: "ea" as ItemUnit,
    material_cost: 0,
    labor_cost: 0,
    equipment_cost: 0,
    subcontractor_cost: 0,
    markup_pct: 0,
  });

  return (
    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
      <h4 className="text-sm font-medium text-gray-700">Add Line Item</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="!py-2 !text-sm"
        />
        <Input
          label="Qty"
          type="number"
          value={form.quantity}
          onChange={(e) =>
            setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })
          }
          className="!py-2 !text-sm"
        />
        <Select
          label="Unit"
          options={UNIT_OPTIONS}
          value={form.unit}
          onChange={(e) =>
            setForm({ ...form, unit: e.target.value as ItemUnit })
          }
          className="!py-2 !text-sm"
        />
        <Input
          label="Material"
          type="number"
          value={form.material_cost}
          onChange={(e) =>
            setForm({
              ...form,
              material_cost: parseFloat(e.target.value) || 0,
            })
          }
          className="!py-2 !text-sm"
        />
        <Input
          label="Labor"
          type="number"
          value={form.labor_cost}
          onChange={(e) =>
            setForm({
              ...form,
              labor_cost: parseFloat(e.target.value) || 0,
            })
          }
          className="!py-2 !text-sm"
        />
        <Input
          label="Equipment"
          type="number"
          value={form.equipment_cost}
          onChange={(e) =>
            setForm({
              ...form,
              equipment_cost: parseFloat(e.target.value) || 0,
            })
          }
          className="!py-2 !text-sm"
        />
        <Input
          label="Subcontractor"
          type="number"
          value={form.subcontractor_cost}
          onChange={(e) =>
            setForm({
              ...form,
              subcontractor_cost: parseFloat(e.target.value) || 0,
            })
          }
          className="!py-2 !text-sm"
        />
        <Input
          label="Markup %"
          type="number"
          value={form.markup_pct}
          onChange={(e) =>
            setForm({
              ...form,
              markup_pct: parseFloat(e.target.value) || 0,
            })
          }
          className="!py-2 !text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => {
            if (!form.description.trim()) {
              toast.error("Description is required");
              return;
            }
            onSubmit(form);
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

// ── Add Section Form ─────────────────────────────────────────────────────────

function AddSectionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: { category_slug: CostCategorySlug; name: string }) => void;
  onCancel: () => void;
}) {
  const [slug, setSlug] = useState<CostCategorySlug>("sitework");
  const [name, setName] = useState("");

  return (
    <Card title="Add Section">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Category"
          options={COST_CATEGORY_OPTIONS}
          value={slug}
          onChange={(e) => {
            const val = e.target.value as CostCategorySlug;
            setSlug(val);
            if (!name) setName(COST_CATEGORY_LABELS[val]);
          }}
        />
        <Input
          label="Section Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 mt-4">
        <Button
          size="sm"
          onClick={() => {
            if (!name.trim()) {
              toast.error("Section name is required");
              return;
            }
            onSubmit({ category_slug: slug, name });
          }}
        >
          Add Section
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Card>
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

  useEffect(() => {
    fetch(`/api/admin/quotes/${quote.id}/revisions`)
      .then((r) => r.json())
      .then((data) => {
        setRevisions(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
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
