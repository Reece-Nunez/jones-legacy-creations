"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle, AlertCircle } from "lucide-react";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDelta(amount: number): string {
  const sign = amount >= 0 ? "+" : "−";
  return `${sign}${usd.format(Math.abs(amount))}`;
}

interface ChangeOrderSignFormProps {
  token: string;
  projectName: string;
  title: string;
  description?: string | null;
  reason?: string | null;
  costDelta: number;
  scheduleImpactDays: number;
  consentText: string;
  clientName?: string | null;
}

export function ChangeOrderSignForm({
  token,
  projectName,
  title,
  description,
  reason,
  costDelta,
  scheduleImpactDays,
  consentText,
  clientName,
}: ChangeOrderSignFormProps) {
  const [signerName, setSignerName] = useState(clientName ?? "");
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = scheduleImpactDays;
  const scheduleLabel =
    days === 0
      ? "No change"
      : `${days > 0 ? "+" : "−"}${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!signerName.trim()) {
      setError("Please type your full legal name to sign.");
      return;
    }
    if (!agreed) {
      setError("Please check the box to agree before signing.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/change-orders/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signer_name: signerName.trim(), consent: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to sign. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Change order signed!</h2>
          <p className="text-gray-500">
            A copy has been saved to your project file. Thank you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
          <Image
            src="/logo-transparent.png"
            alt="Jones Legacy Creations"
            width={72}
            height={72}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Change Order</h1>
          <p className="text-sm text-gray-500">
            For: <span className="font-medium text-gray-700">{projectName}</span>
          </p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Change</p>
            <p className="text-lg font-semibold text-gray-900">{title}</p>
          </div>
          {description?.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Description
              </p>
              <p className="text-gray-700 whitespace-pre-line">{description}</p>
            </div>
          )}
          {reason?.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</p>
              <p className="text-gray-700 whitespace-pre-line">{reason}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Change to price
              </p>
              <p
                className={`text-lg font-bold ${
                  costDelta >= 0 ? "text-gray-900" : "text-green-700"
                }`}
              >
                {formatDelta(costDelta)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Schedule impact
              </p>
              <p className="text-lg font-bold text-gray-900">{scheduleLabel}</p>
            </div>
          </div>
        </div>

        {/* Signature */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300"
            />
            <span>{consentText}</span>
          </label>

          <div>
            <label htmlFor="signerName" className="block text-sm font-medium text-gray-700 mb-2">
              Type your full legal name to sign <span className="text-red-500">*</span>
            </label>
            <input
              id="signerName"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. Jordan Smith"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-base"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !signerName.trim() || !agreed}
            className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
          >
            {isSubmitting ? "Signing…" : "Sign & Approve"}
          </button>

          <p className="text-xs text-gray-400 text-center pt-1">
            Your electronic signature is legally binding under the U.S. E-SIGN Act.
          </p>
        </form>
      </div>
    </div>
  );
}
