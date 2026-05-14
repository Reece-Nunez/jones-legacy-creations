"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { FileText, Trash2 } from "lucide-react";
import type { Quote, QuoteStatus, JobTypeSlug } from "@/lib/types/quotes";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  JOB_TYPE_LABELS,
} from "@/lib/types/quotes";
import {
  formatCurrencyWhole as formatCurrency,
  formatDate as sharedFormatDate,
} from "@/lib/formatters";

interface QuotesListProps {
  quotes: Quote[];
  detailBasePath?: string;
}

function formatDate(dateStr: string): string {
  return sharedFormatDate(dateStr) ?? "";
}

function getQuoteTotal(quote: Quote): number {
  if (quote.grand_total > 0) return quote.grand_total;
  const inputs = quote.job_type_inputs as Record<string, unknown> | null;
  if (inputs?.simple_items && Array.isArray(inputs.simple_items)) {
    return (inputs.simple_items as Array<{ cost: number }>).reduce(
      (sum, item) => sum + (item.cost || 0),
      0
    );
  }
  return 0;
}

function confirmDelete(quoteNumber: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-2">
          <span>
            Delete quote <strong>{quoteNumber}</strong>? This cannot be undone.
          </span>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
              className="px-3 py-1.5 text-sm rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  });
}

export function QuotesList({ quotes, detailBasePath = "/admin/quotes" }: QuotesListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(quote: Quote, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!(await confirmDelete(quote.quote_number))) return;
    setDeletingId(quote.id);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete quote");
      }
      toast.success(`Quote ${quote.quote_number} deleted`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete quote");
    } finally {
      setDeletingId(null);
    }
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No quotes yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Get started by creating your first construction estimate.
        </p>
        <Link
          href="/admin/quotes/new"
          className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
        >
          New Quote
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`${detailBasePath}/${quote.id}`}
                className="text-base font-semibold text-gray-900 hover:underline"
              >
                {quote.quote_number}
              </Link>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                  QUOTE_STATUS_COLORS[quote.status as QuoteStatus] ??
                    "bg-gray-100 text-gray-700"
                )}
              >
                {QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ?? quote.status}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-1">{quote.project_name}</p>
            <p className="text-sm text-gray-500">{quote.client_name}</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {JOB_TYPE_LABELS[quote.job_type_slug as JobTypeSlug] ??
                  quote.job_type_slug}
                <span className="mx-1.5 text-gray-300">·</span>
                {formatDate(quote.created_at)}
              </span>
              <span className="font-medium text-gray-900">
                {formatCurrency(getQuoteTotal(quote))}
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={(e) => handleDelete(quote, e)}
                disabled={deletingId === quote.id}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                aria-label={`Delete quote ${quote.quote_number}`}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quote #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`${detailBasePath}/${quote.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-black underline-offset-4 hover:underline"
                    >
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {quote.project_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {quote.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {JOB_TYPE_LABELS[quote.job_type_slug as JobTypeSlug] ??
                      quote.job_type_slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        QUOTE_STATUS_COLORS[quote.status as QuoteStatus] ??
                          "bg-gray-100 text-gray-700"
                      )}
                    >
                      {QUOTE_STATUS_LABELS[quote.status as QuoteStatus] ??
                        quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(getQuoteTotal(quote))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatDate(quote.created_at)}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => handleDelete(quote, e)}
                      disabled={deletingId === quote.id}
                      className="h-10 w-10 inline-flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      aria-label={`Delete quote ${quote.quote_number}`}
                      title={`Delete quote ${quote.quote_number}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
