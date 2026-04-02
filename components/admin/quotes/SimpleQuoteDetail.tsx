"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { SimpleQuoteEditor, type SimpleQuoteItem } from "@/components/admin/quotes/SimpleQuoteEditor";
import { SendQuoteModal } from "@/components/admin/quotes/SendQuoteModal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Mail,
  Printer,
  FolderPlus,
  FileText,
  Calendar,
  MapPin,
  User,
  Phone,
  AtSign,
} from "lucide-react";
import type { Quote, QuoteStatus } from "@/lib/types/quotes";
import {
  JOB_TYPE_LABELS,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
} from "@/lib/types/quotes";
import type { JobTypeSlug } from "@/lib/types/quotes";

interface SimpleQuoteDetailProps {
  quoteId: string;
  initialQuote: Quote;
}

const STATUS_OPTIONS = Object.entries(QUOTE_STATUS_LABELS).map(
  ([value, label]) => ({ value, label })
);

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

export function SimpleQuoteDetail({ quoteId, initialQuote }: SimpleQuoteDetailProps) {
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [loading, setLoading] = useState(true);
  const [simpleItems, setSimpleItems] = useState<SimpleQuoteItem[]>([]);
  const [convertingToProject, setConvertingToProject] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`);
      if (!res.ok) throw new Error("Failed to fetch quote");
      const data = await res.json();
      setQuote(data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const inputs = quote.job_type_inputs as Record<string, unknown> | null;
  const startDate = fmtDate(quote.target_start_date);
  const completionDate = fmtDate(quote.desired_completion_date);

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
                QUOTE_STATUS_COLORS[quote.status as QuoteStatus]
              )}
            >
              {QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}
            </span>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            {JOB_TYPE_LABELS[quote.job_type_slug as JobTypeSlug]} &middot; {quote.client_name} &middot; {quote.project_name}
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

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Client</h3>
          <dl className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-900">{quote.client_name}</span>
            </div>
            {quote.client_email && (
              <div className="flex items-center gap-2 text-sm">
                <AtSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <a href={`mailto:${quote.client_email}`} className="text-blue-600 hover:underline">
                  {quote.client_email}
                </a>
              </div>
            )}
            {quote.client_phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-900">{quote.client_phone}</span>
              </div>
            )}
          </dl>
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Project</h3>
          <dl className="space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-900">{quote.project_name}</span>
            </div>
            {quote.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">
                  {quote.address}
                  {quote.city && `, ${quote.city}`}
                  {quote.state && `, ${quote.state}`}
                  {quote.zip && ` ${quote.zip}`}
                </span>
              </div>
            )}
            <div className="text-sm text-gray-700">
              <span className="text-gray-500">Type:</span>{" "}
              {JOB_TYPE_LABELS[quote.job_type_slug as JobTypeSlug]}
            </div>
          </dl>
        </div>

        {/* Schedule & Total */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Summary</h3>
          <dl className="space-y-2">
            {(startDate || completionDate) && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-gray-700">
                  {startDate && `Start: ${startDate}`}
                  {startDate && completionDate && " — "}
                  {completionDate && `End: ${completionDate}`}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Trade Costs</span>
                <span className="font-medium text-gray-900">
                  {fmt(simpleItems.filter((i) => !i.isOwnerPurchase).reduce((s, i) => s + i.cost, 0))}
                </span>
              </div>
              {simpleItems.some((i) => i.isOwnerPurchase && i.cost > 0) && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Owner Purchases</span>
                  <span className="font-medium text-gray-900">
                    {fmt(simpleItems.filter((i) => i.isOwnerPurchase).reduce((s, i) => s + i.cost, 0))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{fmt(quote.grand_total)}</span>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{quote.notes}</p>
        </div>
      )}

      {/* Cost Breakdown */}
      <SimpleQuoteEditor
        quoteId={quoteId}
        jobType={quote.job_type_slug as JobTypeSlug}
        initialItems={simpleItems.length > 0 ? simpleItems : undefined}
        onSave={async (items) => {
          setSimpleItems(items);
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
