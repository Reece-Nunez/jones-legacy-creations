"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { Quote, QuoteStatus, JobTypeSlug } from "@/lib/types/quotes";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
  JOB_TYPE_LABELS,
} from "@/lib/types/quotes";

interface QuotesListProps {
  quotes: Quote[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function QuotesList({ quotes }: QuotesListProps) {
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {quotes.map((quote) => (
              <tr
                key={quote.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/admin/quotes/${quote.id}`}
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
                  {formatCurrency(quote.grand_total)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatDate(quote.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
