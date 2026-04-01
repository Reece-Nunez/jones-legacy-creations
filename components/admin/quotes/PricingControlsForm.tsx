"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { DynamicSectionRenderer } from "@/components/admin/quotes/DynamicSectionRenderer";
import { PRICING_CONTROLS_SECTION } from "@/lib/quote-builder/templates";
import { cn } from "@/lib/utils";

interface PricingControlsFormProps {
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function toNum(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function fmtPct(value: unknown): string {
  const n = toNum(value);
  return n % 1 === 0 ? `${n}%` : `${n.toFixed(1)}%`;
}

function fmtCurrency(amount: number): string {
  if (amount === 0) return "--";
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
  const [showMarkups, setShowMarkups] = useState(false);
  const [showAllowances, setShowAllowances] = useState(false);

  const overheadPct = toNum(formData.overhead_pct);
  const profitPct = toNum(formData.profit_pct);
  const contingencyPct = toNum(formData.contingency_pct);
  const salesTaxPct = toNum(formData.sales_tax_pct);
  const laborBurdenPct = toNum(formData.labor_burden_pct);

  const permitAllowance = toNum(formData.permit_allowance);
  const dumpsterAllowance = toNum(formData.dumpster_allowance);
  const equipmentAllowance = toNum(formData.equipment_allowance);
  const cleanupAllowance = toNum(formData.cleanup_allowance);
  const totalAllowances = permitAllowance + dumpsterAllowance + equipmentAllowance + cleanupAllowance;

  // Markup fields from the template
  const markupFields = PRICING_CONTROLS_SECTION.fields.filter(
    (f) => f.type === "percentage"
  );
  const allowanceFields = PRICING_CONTROLS_SECTION.fields.filter(
    (f) => f.type === "currency"
  );

  return (
    <div className="space-y-4">
      {/* Summary card — always visible */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Pricing Summary</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500">Overhead</span>{" "}
            <span className="font-medium text-gray-900">{fmtPct(overheadPct)}</span>
          </div>
          <div>
            <span className="text-gray-500">Profit</span>{" "}
            <span className="font-medium text-gray-900">{fmtPct(profitPct)}</span>
          </div>
          <div>
            <span className="text-gray-500">Contingency</span>{" "}
            <span className="font-medium text-gray-900">{fmtPct(contingencyPct)}</span>
          </div>
          {salesTaxPct > 0 && (
            <div>
              <span className="text-gray-500">Tax</span>{" "}
              <span className="font-medium text-gray-900">{fmtPct(salesTaxPct)}</span>
            </div>
          )}
          {laborBurdenPct > 0 && (
            <div>
              <span className="text-gray-500">Labor Burden</span>{" "}
              <span className="font-medium text-gray-900">{fmtPct(laborBurdenPct)}</span>
            </div>
          )}
          {totalAllowances > 0 && (
            <div>
              <span className="text-gray-500">Allowances</span>{" "}
              <span className="font-medium text-gray-900">{fmtCurrency(totalAllowances)}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          These are Blake&apos;s standard rates. Tap below to adjust for this quote.
        </p>
      </div>

      {/* Markup percentages — collapsed by default */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMarkups(!showMarkups)}
          className="flex items-center justify-between w-full px-5 py-3.5 text-left min-h-[44px] hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Adjust Markups &amp; Tax</span>
          </div>
          {showMarkups ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            showMarkups ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-5 pb-5 pt-1">
            <DynamicSectionRenderer
              section={{ ...PRICING_CONTROLS_SECTION, id: "markups", title: "", fields: markupFields }}
              formData={formData}
              onChange={onChange}
            />
          </div>
        </div>
      </div>

      {/* Allowances — collapsed by default */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAllowances(!showAllowances)}
          className="flex items-center justify-between w-full px-5 py-3.5 text-left min-h-[44px] hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Adjust Allowances</span>
            {totalAllowances > 0 && (
              <span className="text-xs text-gray-400">({fmtCurrency(totalAllowances)})</span>
            )}
          </div>
          {showAllowances ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            showAllowances ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-5 pb-5 pt-1">
            <DynamicSectionRenderer
              section={{ ...PRICING_CONTROLS_SECTION, id: "allowances", title: "", fields: allowanceFields }}
              formData={formData}
              onChange={onChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
