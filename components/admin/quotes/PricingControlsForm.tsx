"use client";

import { DynamicSectionRenderer } from "@/components/admin/quotes/DynamicSectionRenderer";
import { PRICING_CONTROLS_SECTION } from "@/lib/quote-builder/templates";

interface PricingControlsFormProps {
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function toNum(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PricingControlsForm({
  formData,
  onChange,
}: PricingControlsFormProps) {
  const overheadPct = toNum(formData.overhead_pct);
  const profitPct = toNum(formData.profit_pct);
  const contingencyPct = toNum(formData.contingency_pct);
  const salesTaxPct = toNum(formData.sales_tax_pct);

  // Placeholder subtotal for preview - real calculation happens on the backend
  const subtotal = 0;
  const overhead = subtotal * (overheadPct / 100);
  const profit = subtotal * (profitPct / 100);
  const contingency = subtotal * (contingencyPct / 100);
  const preTotal = subtotal + overhead + profit + contingency;
  const tax = preTotal * (salesTaxPct / 100);
  const estimatedTotal = preTotal + tax;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <DynamicSectionRenderer
          section={PRICING_CONTROLS_SECTION}
          formData={formData}
          onChange={onChange}
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Calculation Preview
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900 font-medium">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              + Overhead ({overheadPct}%)
            </span>
            <span className="text-gray-900">{formatCurrency(overhead)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              + Profit ({profitPct}%)
            </span>
            <span className="text-gray-900">{formatCurrency(profit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              + Contingency ({contingencyPct}%)
            </span>
            <span className="text-gray-900">
              {formatCurrency(contingency)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              + Tax ({salesTaxPct}%)
            </span>
            <span className="text-gray-900">{formatCurrency(tax)}</span>
          </div>
          <div className="border-t border-gray-200 pt-3 flex justify-between">
            <span className="text-sm font-semibold text-gray-900">
              = Estimated Total
            </span>
            <span className="text-base font-bold text-gray-900">
              {formatCurrency(estimatedTotal)}
            </span>
          </div>
          <p className="text-xs text-gray-400 pt-1">
            Subtotal will update once line items are added. This preview reflects
            the current markup percentages only.
          </p>
        </div>
      </div>
    </div>
  );
}
