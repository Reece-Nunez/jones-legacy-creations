"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { X, Send, Mail } from "lucide-react";
import toast from "react-hot-toast";
import type { Quote } from "@/lib/types/quotes";

interface SendQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
  items: Array<{
    trade: string;
    cost: number;
    isOwnerPurchase: boolean;
    note: string;
  }>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function SendQuoteModal({
  isOpen,
  onClose,
  quote,
  items,
}: SendQuoteModalProps) {
  const [to, setTo] = useState(quote.client_email || "");
  const [cc, setCc] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const tradeItems = items.filter((i) => !i.isOwnerPurchase && i.cost > 0);
  const ownerItems = items.filter((i) => i.isOwnerPurchase && i.cost > 0);
  const tradeCostTotal = tradeItems.reduce((s, i) => s + i.cost, 0);
  const ownerTotal = ownerItems.reduce((s, i) => s + i.cost, 0);
  const grandTotal = tradeCostTotal + ownerTotal;

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error("Recipient email is required");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || undefined,
          items: items.filter((i) => i.cost > 0),
          includeOwnerPurchases: ownerItems.length > 0,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      toast.success("Quote sent successfully!");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send quote");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Send Quote
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Email fields */}
          <Input
            label="To"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="client@email.com"
            required
          />

          <Input
            label="CC (optional)"
            type="email"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="blake@joneslegacycreations.com"
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional message to include in the email..."
              rows={3}
              className="w-full px-4 py-3 text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:border-transparent transition-all placeholder:text-gray-400 resize-none"
            />
          </div>

          {/* Preview */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Preview
              </p>
            </div>
            <div className="p-3 space-y-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">
                  {quote.project_name}
                </span>{" "}
                &mdash; {quote.quote_number}
              </div>

              {/* Trade costs */}
              {tradeItems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Trade Costs
                  </p>
                  <div className="space-y-0.5">
                    {tradeItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-600 truncate mr-2">
                          {item.trade}
                        </span>
                        <span className="text-gray-900 font-medium whitespace-nowrap">
                          {formatCurrency(item.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-gray-100">
                    <span>Subtotal</span>
                    <span>{formatCurrency(tradeCostTotal)}</span>
                  </div>
                </div>
              )}

              {/* Owner purchases */}
              {ownerItems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Owner Purchases
                  </p>
                  <div className="space-y-0.5">
                    {ownerItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-gray-600 truncate mr-2">
                          {item.trade}
                        </span>
                        <span className="text-gray-900 font-medium whitespace-nowrap">
                          {formatCurrency(item.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-gray-100">
                    <span>Subtotal</span>
                    <span>{formatCurrency(ownerTotal)}</span>
                  </div>
                </div>
              )}

              {/* Grand total */}
              <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            isLoading={sending}
            disabled={!to.trim()}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Send Quote
          </Button>
        </div>
      </div>
    </div>
  );
}
