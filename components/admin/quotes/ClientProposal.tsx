"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import type { Quote } from "@/lib/types/quotes";
import { JOB_TYPE_LABELS } from "@/lib/types/quotes";
import type { SimpleQuoteItem } from "@/components/admin/quotes/SimpleQuoteEditor";

interface ClientProposalProps {
  quoteId: string;
  initialQuote: Quote;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(v);

const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

export function ClientProposal({ quoteId, initialQuote }: ClientProposalProps) {
  const [quote, setQuote] = useState<Quote>(initialQuote);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SimpleQuoteItem[]>([]);

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setQuote(data);
      const inputs = data.job_type_inputs as Record<string, unknown> | null;
      if (inputs?.simple_items && Array.isArray(inputs.simple_items)) {
        setItems(inputs.simple_items as SimpleQuoteItem[]);
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

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lineItems = items.filter((i) => !i.isOwnerPurchase && i.cost > 0);
  const ownerItems = items.filter((i) => i.isOwnerPurchase && i.cost > 0);
  const subtotal = lineItems.reduce((sum, i) => sum + i.cost, 0);
  const ownerTotal = ownerItems.reduce((sum, i) => sum + i.cost, 0);
  const grandTotal = subtotal + ownerTotal;

  const addressParts = [quote.address, quote.city, quote.state, quote.zip].filter(Boolean);

  return (
    <>
      {/* Print button */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center px-6 py-3 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors shadow-lg"
        >
          Print / Save PDF
        </button>
      </div>

      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0;
          }
          .print\\:hidden { display: none !important; }
          .page-break { page-break-before: always; }
          .no-break { page-break-inside: avoid; }
        }
        @page {
          margin: 0.75in;
          size: letter;
        }
      `}</style>

      <div className="max-w-[800px] mx-auto bg-white text-gray-900 px-10 py-12 print:px-0 print:py-0 print:max-w-none">

        {/* ── Header ─────────────────────────────────────────────── */}
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
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                Proposal
              </p>
              <p className="font-medium text-gray-900 text-lg mt-0.5">
                {quote.quote_number}
              </p>
              <p className="mt-1">{today}</p>
            </div>
          </div>
        </div>

        {/* ── Client & Project Info ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Prepared For
            </h2>
            <p className="text-base font-medium text-gray-900">
              {quote.client_name}
            </p>
            {addressParts.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {addressParts.join(", ")}
              </p>
            )}
            {quote.client_email && (
              <p className="text-sm text-gray-500 mt-1">{quote.client_email}</p>
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
              {JOB_TYPE_LABELS[quote.job_type_slug]}
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

        {/* ── Notes / Scope ──────────────────────────────────────── */}
        {(quote.notes || quote.scope_summary || quote.included_scope) && (
          <div className="mb-10 no-break">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Scope of Work
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {quote.included_scope || quote.scope_summary || quote.notes}
            </p>
          </div>
        )}

        {/* ── Cost Summary ───────────────────────────────────────── */}
        {lineItems.length > 0 && (
          <div className="mb-10 no-break">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Cost Summary
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-2 text-left font-semibold text-gray-700">
                    Item
                  </th>
                  <th className="py-2 text-right font-semibold text-gray-700">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100"
                  >
                    <td className="py-2.5 text-gray-700">{item.trade}</td>
                    <td className="py-2.5 text-right text-gray-900 font-medium tabular-nums">
                      {fmt(item.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-900">
                  <td className="py-3 text-base font-serif font-bold text-gray-900">
                    {ownerItems.length > 0 ? "Subtotal" : "Total"}
                  </td>
                  <td className="py-3 text-right text-base font-bold text-gray-900 tabular-nums">
                    {fmt(subtotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Owner-Supplied Items ───────────────────────────────── */}
        {ownerItems.length > 0 && (
          <div className="mb-10 no-break">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Owner Purchases
            </h2>
            <p className="text-xs text-gray-500 mb-3">
              The following items will be purchased directly by the owner and are
              not included in the contractor&apos;s scope above.
            </p>
            <table className="w-full text-sm">
              <tbody>
                {ownerItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-2.5 text-gray-700">{item.trade}</td>
                    <td className="py-2.5 text-right text-gray-900 font-medium tabular-nums">
                      {fmt(item.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-2 font-medium text-gray-700">
                    Owner Purchase Total
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900 tabular-nums">
                    {fmt(ownerTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── Grand Total (if owner items exist) ─────────────────── */}
        {ownerItems.length > 0 && (
          <div className="mb-10 no-break bg-gray-50 rounded-lg p-5">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1 text-gray-600">Contractor Costs</td>
                  <td className="py-1 text-right font-medium text-gray-900 tabular-nums">
                    {fmt(subtotal)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1 text-gray-600">Owner Purchases</td>
                  <td className="py-1 text-right font-medium text-gray-900 tabular-nums">
                    {fmt(ownerTotal)}
                  </td>
                </tr>
                <tr className="border-t-2 border-gray-900">
                  <td className="pt-3 text-lg font-serif font-bold text-gray-900">
                    Total Project Cost
                  </td>
                  <td className="pt-3 text-right text-lg font-bold text-gray-900 tabular-nums">
                    {fmt(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── No items fallback ──────────────────────────────────── */}
        {lineItems.length === 0 && ownerItems.length === 0 && (
          <div className="mb-10 p-6 border border-gray-200 rounded-lg text-center">
            <p className="text-sm text-gray-500">
              Pricing details will be provided upon completion of the estimate.
            </p>
            {quote.grand_total > 0 && (
              <p className="mt-3 text-2xl font-bold text-gray-900">
                Estimated Total: {fmt(quote.grand_total)}
              </p>
            )}
          </div>
        )}

        {/* ── Valid Through ──────────────────────────────────────── */}
        {quote.valid_through_date && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200 no-break">
            <p className="text-sm text-gray-700">
              <strong>This proposal is valid through:</strong>{" "}
              {fmtDate(quote.valid_through_date)}
            </p>
          </div>
        )}

        {/* ── Change Order Language ──────────────────────────────── */}
        {quote.change_order_language && (
          <div className="mb-10 no-break">
            <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
              Change Orders
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {quote.change_order_language}
            </p>
          </div>
        )}

        {/* ── Terms & Conditions ─────────────────────────────────── */}
        <div className="mb-10 no-break">
          <h2 className="text-lg font-serif font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-2">
            Terms &amp; Conditions
          </h2>
          <div className="text-xs text-gray-600 leading-relaxed space-y-2">
            <p>
              1. This proposal is based on the scope described above. Any changes
              or additions will be documented via a written change order and may
              affect the contract price and schedule.
            </p>
            <p>
              2. Owner is responsible for obtaining and paying for all necessary
              permits unless otherwise stated.
            </p>
            <p>
              3. Contractor shall maintain liability and workers&apos; compensation
              insurance for the duration of the project.
            </p>
            <p>
              4. Any unforeseen conditions discovered during construction
              (including but not limited to mold, asbestos, structural
              deficiencies, or code violations) will be addressed via change
              order.
            </p>
            <p>
              5. Payment terms are net 30 unless otherwise agreed upon in writing.
              Late payments may result in work stoppage and applicable late fees.
            </p>
            <p>
              6. This agreement may be terminated by either party with 10 days
              written notice. Owner shall pay for all work completed to date.
            </p>
          </div>
        </div>

        {/* ── Signature Block ────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-2 gap-12 no-break">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-10">
              Owner / Client
            </p>
            <div className="border-b border-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500">Signature</p>
            <div className="mt-8 border-b border-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500">Printed Name</p>
            <div className="mt-8 border-b border-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500">Date</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-10">
              Contractor
            </p>
            <div className="border-b border-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500">Signature</p>
            <div className="mt-8 border-b border-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500">Printed Name</p>
            <div className="mt-8 border-b border-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500">Date</p>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
          <p>
            Jones Legacy Creations &middot; {quote.quote_number}
            {quote.revision_number > 0 && (
              <> &middot; Revision {quote.revision_number}</>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
