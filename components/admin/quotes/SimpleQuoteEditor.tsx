"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOB_TYPE_TRADE_DEFAULTS } from "@/lib/quote-builder/trade-defaults";
import type { JobTypeSlug } from "@/lib/types/quotes";

interface CustomTrade {
  id: string;
  trade_name: string;
  default_cost: number | null;
  category: string | null;
  usage_count: number;
}

export interface SimpleQuoteItem {
  id?: string;
  trade: string;
  cost: number;
  isOwnerPurchase: boolean;
  note: string;
}

interface SimpleQuoteEditorProps {
  quoteId: string;
  jobType: JobTypeSlug;
  initialItems?: SimpleQuoteItem[];
  onSave: (items: SimpleQuoteItem[]) => Promise<void>;
  onChange?: (items: SimpleQuoteItem[]) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function SimpleQuoteEditor({
  quoteId,
  jobType,
  initialItems,
  onSave,
  onChange,
}: SimpleQuoteEditorProps) {
  const defaults = JOB_TYPE_TRADE_DEFAULTS[jobType];

  const buildDefaultItems = useCallback((): SimpleQuoteItem[] => {
    return defaults.trades.map((t) => ({
      trade: t.trade,
      cost: 0,
      isOwnerPurchase: false,
      note: t.note || "",
    }));
  }, [defaults]);

  const [items, setItems] = useState<SimpleQuoteItem[]>(
    initialItems && initialItems.length > 0 ? initialItems : buildDefaultItems()
  );
  const [saving, setSaving] = useState(false);

  // Track raw string values for cost inputs so decimals aren't eaten mid-typing
  const [costInputs, setCostInputs] = useState<Record<number, string>>({});

  // Custom trades library
  const [customTrades, setCustomTrades] = useState<CustomTrade[]>([]);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customSearch, setCustomSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/custom-trades")
      .then((r) => r.ok ? r.json() : [])
      .then(setCustomTrades)
      .catch(() => {});
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!showCustomPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCustomPicker(false);
        setCustomSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustomPicker]);

  const filteredCustomTrades = useMemo(() => {
    if (!customSearch) return customTrades;
    const q = customSearch.toLowerCase();
    return customTrades.filter((t) => t.trade_name.toLowerCase().includes(q));
  }, [customTrades, customSearch]);

  const addCustomTrade = (trade: CustomTrade) => {
    setItems((prev) => {
      const next = [...prev, { trade: trade.trade_name, cost: 0, isOwnerPurchase: false, note: "" }];
      onChange?.(next);
      return next;
    });
    setShowCustomPicker(false);
    setCustomSearch("");
  };

  // Save new custom trades to library when saving the quote
  const saveCustomTradesToLibrary = async (tradeItems: SimpleQuoteItem[]) => {
    // Find trades that aren't in the default list and aren't already in the library
    const defaultTradeNames = new Set(defaults.trades.map((t) => t.trade.toLowerCase()));
    const libraryNames = new Set(customTrades.map((t) => t.trade_name.toLowerCase()));

    const newTrades = tradeItems.filter(
      (item) =>
        item.trade.trim() &&
        item.cost > 0 &&
        !defaultTradeNames.has(item.trade.trim().toLowerCase()) &&
        !libraryNames.has(item.trade.trim().toLowerCase())
    );

    for (const item of newTrades) {
      await fetch("/api/admin/custom-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_name: item.trade.trim() }),
      }).catch(() => {});
    }

    // Also bump usage_count for existing custom trades that were used
    for (const item of tradeItems) {
      if (item.trade.trim() && libraryNames.has(item.trade.trim().toLowerCase())) {
        await fetch("/api/admin/custom-trades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trade_name: item.trade.trim() }),
        }).catch(() => {});
      }
    }
  };

  const updateItem = (index: number, updates: Partial<SimpleQuoteItem>) => {
    setItems((prev) => {
      const next = prev.map((item, i) => (i === index ? { ...item, ...updates } : item));
      onChange?.(next);
      return next;
    });
  };

  const addItem = () => {
    setItems((prev) => {
      const next = [...prev, { trade: "", cost: 0, isOwnerPurchase: false, note: "" }];
      onChange?.(next);
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onChange?.(next);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCustomTradesToLibrary(items);
      await onSave(items);
    } finally {
      setSaving(false);
    }
  };

  const tradeCosts = useMemo(
    () => items.filter((i) => !i.isOwnerPurchase).reduce((s, i) => s + i.cost, 0),
    [items]
  );
  const ownerPurchases = useMemo(
    () => items.filter((i) => i.isOwnerPurchase).reduce((s, i) => s + i.cost, 0),
    [items]
  );
  const totalCombined = tradeCosts + ownerPurchases;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pricing Breakdown</h3>
        {defaults.includeOwnerPurchases && (
          <span className="text-xs text-gray-500">
            Toggle &ldquo;OP&rdquo; for owner-purchased items
          </span>
        )}
      </div>

      {/* Header row */}
      <div className="flex items-center gap-2 px-1 pb-2 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <span className="flex-1">Item</span>
        <span className="w-32 text-right">Cost</span>
        {defaults.includeOwnerPurchases && (
          <span className="w-10 text-center">OP</span>
        )}
        <span className="w-8" />
      </div>

      {/* Item rows */}
      <div className="divide-y divide-gray-100">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "group flex flex-col sm:flex-row sm:items-center gap-2 py-2 px-1",
              item.cost === 0 && "opacity-50"
            )}
          >
            {/* Trade name */}
            <input
              type="text"
              value={item.trade}
              onChange={(e) => updateItem(index, { trade: e.target.value })}
              placeholder="Item name"
              className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent"
            />

            <div className="flex items-center gap-2">
              {/* Cost input with $ prefix */}
              <div className="relative w-32">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={costInputs[index] ?? (item.cost === 0 ? "" : item.cost.toString())}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    setCostInputs((prev) => ({ ...prev, [index]: raw }));
                  }}
                  onBlur={() => {
                    const val = parseCurrency(costInputs[index] ?? item.cost.toString());
                    const rounded = Math.round(val * 100) / 100;
                    updateItem(index, { cost: rounded });
                    setCostInputs((prev) => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                  }}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-1.5 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-transparent"
                />
              </div>

              {/* Owner Purchase checkbox */}
              {defaults.includeOwnerPurchases && (
                <label className="flex items-center justify-center w-10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isOwnerPurchase}
                    onChange={(e) =>
                      updateItem(index, { isOwnerPurchase: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                </label>
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded hover:bg-red-50"
                aria-label={`Remove ${item.trade || "line item"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Trade buttons */}
      <div className="flex items-center gap-3 mt-2 relative">
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
        {customTrades.length > 0 && (
          <div ref={pickerRef} className="relative">
            <button
              type="button"
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              From Library ({customTrades.length})
            </button>
            {showCustomPicker && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    value={customSearch}
                    onChange={(e) => setCustomSearch(e.target.value)}
                    placeholder="Search items..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-black"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCustomTrades.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No matching items</p>
                  ) : (
                    filteredCustomTrades.map((trade) => (
                      <button
                        key={trade.id}
                        type="button"
                        onClick={() => addCustomTrade(trade)}
                        className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-gray-900">{trade.trade_name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="mt-4 pt-3 border-t-2 border-gray-200 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">Item Costs</span>
          <span className="font-semibold">{formatCurrency(tradeCosts)}</span>
        </div>
        {defaults.includeOwnerPurchases && ownerPurchases > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Owner Purchases</span>
            <span className="font-semibold">{formatCurrency(ownerPurchases)}</span>
          </div>
        )}
        <div className="flex justify-between text-base pt-1 border-t border-gray-100">
          <span className="font-bold text-gray-900">
            {defaults.includeOwnerPurchases && ownerPurchases > 0
              ? "Total Combined"
              : "Total"}
          </span>
          <span className="font-bold text-gray-900">
            {formatCurrency(totalCombined)}
          </span>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} isLoading={saving} size="sm">
          Save
        </Button>
      </div>
    </div>
  );
}
