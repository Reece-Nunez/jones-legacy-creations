"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import type {
  Quote,
  QuoteSection,
  QuoteItem,
  QuoteExclusion,
  QuoteAllowance,
} from "@/lib/types/quotes";
import {
  JOB_TYPE_LABELS,
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
}

interface ClientProposalProps {
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

// ── Component ────────────────────────────────────────────────────────────────

export function ClientProposal({ quoteId, initialQuote }: ClientProposalProps) {
  const [quote, setQuote] = useState<FullQuote | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuote(data);
    } catch {
      toast.error("Failed to load quote data");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

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
        Proposal could not be loaded.
      </div>
    );
  }

  const clientSections = quote.sections.filter((s) => s.is_visible_to_client);
  const today = new Date().toLocaleDateString();

  return (
    <>
      {/* Print button - hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-6 py-3 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors shadow-lg"
        >
          Print Proposal
        </button>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      <div className="max-w-[800px] mx-auto bg-white px-10 py-12 print:px-0 print:py-0 print:max-w-none">
        {/* Company Header */}
        <div className="border-b-2 border-gray-900 pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight">
                Jones Legacy Creations
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Quality Construction &amp; Renovation
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Proposal</p>
              <p className="font-medium text-gray-900 text-lg">
                {quote.quote_number}
              </p>
              <p className="mt-1">Date: {today}</p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Prepared For
            </h2>
            <p className="text-base font-medium text-gray-900">
              {quote.client_name}
            </p>
            {(quote.address || quote.city) && (
              <p className="text-sm text-gray-600 mt-1">
                {[quote.address, quote.city, quote.state, quote.zip]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {quote.client_email && (
              <p className="text-sm text-gray-500 mt-1">
                {quote.client_email}
              </p>
            )}
            {quote.client_phone && (
              <p className="text-sm text-gray-500">{quote.client_phone}</p>
            )}
          </div>
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Project Details
            </h2>
            <p className="text-base font-medium text-gray-900">
              {quote.project_name}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Type: {JOB_TYPE_LABELS[quote.job_type_slug]}
            </p>
            {quote.target_start_date && (
              <p className="text-sm text-gray-500 mt-1">
                Est. Start: {fmtDate(quote.target_start_date)}
              </p>
            )}
            {quote.desired_completion_date && (
              <p className="text-sm text-gray-500">
                Est. Completion: {fmtDate(quote.desired_completion_date)}
              </p>
            )}
          </div>
        </div>

        {/* Scope of Work */}
        {quote.included_scope && (
          <div className="mb-10">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Scope of Work
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {quote.included_scope}
            </p>
          </div>
        )}

        {quote.scope_summary && !quote.included_scope && (
          <div className="mb-10">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Scope of Work
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {quote.scope_summary}
            </p>
          </div>
        )}

        {/* Pricing Table - Category level only */}
        <div className="mb-10">
          <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            Cost Summary
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="py-2 font-semibold text-gray-700">Category</th>
                <th className="py-2 font-semibold text-gray-700 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientSections.map((section) => (
                <tr key={section.id}>
                  <td className="py-2 text-gray-700">{section.name}</td>
                  <td className="py-2 text-right text-gray-900 font-medium">
                    {fmt(section.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Allowances */}
        {quote.allowances.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Allowances
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              Allowance items are budgeted amounts. Final cost may vary based on
              selections made by the owner.
            </p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {quote.allowances.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 text-gray-700">
                      <span className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-xs font-medium mr-2">
                        ALLOWANCE
                      </span>
                      {a.description}
                      <span className="text-gray-400 text-xs ml-1">
                        ({ALLOWANCE_CATEGORY_LABELS[a.category]})
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-900 font-medium">
                      {fmt(a.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Exclusions */}
        {quote.exclusions.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Exclusions
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              The following items are NOT included in this proposal:
            </p>
            <ol className="list-decimal list-inside space-y-1">
              {quote.exclusions.map((e) => (
                <li key={e.id} className="text-sm text-gray-700">
                  {e.exclusion_text}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="mb-10 page-break">
          <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            Proposal Summary
          </h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-gray-600">Subtotal</td>
                <td className="py-2 text-right font-medium text-gray-900">
                  {fmt(quote.subtotal)}
                </td>
              </tr>
              {quote.overhead_amount > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">General Conditions</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {fmt(quote.overhead_amount)}
                  </td>
                </tr>
              )}
              {quote.profit_amount > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">&nbsp;</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    &nbsp;
                  </td>
                </tr>
              )}
              {quote.contingency_amount > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Contingency</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {fmt(quote.contingency_amount)}
                  </td>
                </tr>
              )}
              {quote.tax_amount > 0 && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-600">Sales Tax</td>
                  <td className="py-2 text-right font-medium text-gray-900">
                    {fmt(quote.tax_amount)}
                  </td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-900">
                <td className="py-3 text-lg font-serif font-bold text-gray-900">
                  Total
                </td>
                <td className="py-3 text-right text-lg font-bold text-gray-900">
                  {fmt(quote.grand_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Schedule */}
        {quote.payment_schedule && quote.payment_schedule.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Payment Schedule
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 text-left">
                  <th className="py-2 font-semibold text-gray-700">
                    Milestone
                  </th>
                  <th className="py-2 font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="py-2 font-semibold text-gray-700 text-right">
                    %
                  </th>
                  <th className="py-2 font-semibold text-gray-700 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quote.payment_schedule.map((ps, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-700">{ps.milestone}</td>
                    <td className="py-2 text-gray-600">{ps.description}</td>
                    <td className="py-2 text-right text-gray-700">
                      {ps.percentage}%
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {fmt(
                        ps.amount ?? (quote.grand_total * ps.percentage) / 100
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Valid Through */}
        {quote.valid_through_date && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700">
              <strong>This proposal is valid through:</strong>{" "}
              {fmtDate(quote.valid_through_date)}
            </p>
          </div>
        )}

        {/* Change Order Language */}
        {quote.change_order_language && (
          <div className="mb-10">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Change Orders
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {quote.change_order_language}
            </p>
          </div>
        )}

        {/* Terms and Conditions */}
        <div className="mb-10">
          <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            Terms &amp; Conditions
          </h2>
          <div className="text-xs text-gray-600 leading-relaxed space-y-2">
            <p>
              1. This proposal is based on the scope described above. Any
              changes or additions to the scope of work will be documented via a
              written change order and may affect the contract price and
              schedule.
            </p>
            <p>
              2. Owner is responsible for obtaining and paying for all necessary
              permits unless otherwise stated.
            </p>
            <p>
              3. Contractor shall maintain liability and workers compensation
              insurance for the duration of the project.
            </p>
            <p>
              4. Any unforeseen conditions discovered during construction
              (including but not limited to mold, asbestos, structural
              deficiencies, or code violations) will be addressed via change
              order.
            </p>
            <p>
              5. Payment terms are as outlined above. Late payments may result
              in work stoppage and/or applicable late fees.
            </p>
            <p>
              6. This agreement may be terminated by either party with 10 days
              written notice. Owner shall pay for all work completed to date.
            </p>
          </div>
        </div>

        {/* Signature Block */}
        <div className="mt-16 grid grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-8">
              Owner / Client
            </p>
            <div className="border-b border-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Signature</p>
            <div className="mt-6 border-b border-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Printed Name</p>
            <div className="mt-6 border-b border-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Date</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-8">
              Contractor
            </p>
            <div className="border-b border-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Signature</p>
            <div className="mt-6 border-b border-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Printed Name</p>
            <div className="mt-6 border-b border-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Date</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>
            Jones Legacy Creations &middot; {quote.quote_number} &middot;
            Revision {quote.revision_number}
          </p>
        </div>
      </div>
    </>
  );
}
