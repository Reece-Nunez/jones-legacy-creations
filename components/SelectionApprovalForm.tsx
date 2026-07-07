"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

interface SelectionApprovalFormProps {
  token: string;
  projectName: string;
  title: string;
  selectionName?: string | null;
  description?: string | null;
  location?: string | null;
  costImpact?: number | null;
  disclaimerText: string;
  imageUrl?: string | null;
  clientName?: string | null;
}

export function SelectionApprovalForm({
  token,
  projectName,
  title,
  selectionName,
  description,
  location,
  costImpact,
  disclaimerText,
  imageUrl,
  clientName,
}: SelectionApprovalFormProps) {
  const [deciderName, setDeciderName] = useState(clientName ?? "");
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<"idle" | "declining">("idle");
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"approved" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "approved" | "declined") {
    setError(null);
    if (!deciderName.trim()) {
      setError("Please type your full name.");
      return;
    }
    if (decision === "approved" && !agreed) {
      setError("Please check the box to acknowledge the disclosure before approving.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/selections/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          decision,
          decider_name: deciderName.trim(),
          decline_reason: decision === "declined" ? declineReason.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit. Please try again.");
      }
      setResult(decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    const approved = result === "approved";
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              approved ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {approved ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Selection {approved ? "approved" : "declined"}
          </h2>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Selection Approval</h1>
          <p className="text-sm text-gray-500">
            For: <span className="font-medium text-gray-700">{projectName}</span>
          </p>
        </div>

        {/* Photo */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL, not a static asset
          <img
            src={imageUrl}
            alt={title}
            className="w-full max-h-80 object-cover border-b border-gray-100"
          />
        )}

        {/* Details */}
        <div className="p-6 space-y-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selection</p>
            <p className="text-lg font-semibold text-gray-900">{title}</p>
            {selectionName?.trim() && <p className="text-gray-600">{selectionName}</p>}
          </div>
          {location?.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Location</p>
              <p className="text-gray-700">{location}</p>
            </div>
          )}
          {description?.trim() && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Description
              </p>
              <p className="text-gray-700 whitespace-pre-line">{description}</p>
            </div>
          )}
          {costImpact != null && costImpact !== 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Cost impact
              </p>
              <p className="text-gray-900 font-semibold">{usd.format(costImpact)}</p>
            </div>
          )}
        </div>

        {/* Disclosure + decision */}
        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
              Please read
            </p>
            <p className="text-sm text-amber-900">{disclaimerText}</p>
          </div>

          <div>
            <label htmlFor="deciderName" className="block text-sm font-medium text-gray-700 mb-2">
              Your full name <span className="text-red-500">*</span>
            </label>
            <input
              id="deciderName"
              type="text"
              value={deciderName}
              onChange={(e) => setDeciderName(e.target.value)}
              placeholder="e.g. Jordan Smith"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-base"
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0 rounded border-gray-300"
            />
            <span>I have read and understand the disclosure above.</span>
          </label>

          {mode === "declining" && (
            <div>
              <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for declining <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                id="declineReason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="Let us know what you'd prefer instead…"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-base resize-none"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {mode === "idle" ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submit("approved")}
                className="bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setMode("declining");
                }}
                className="bg-white text-gray-900 border border-gray-300 font-semibold py-4 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-base"
              >
                Decline
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError(null);
                  setMode("idle");
                }}
                className="bg-white text-gray-900 border border-gray-300 font-semibold py-4 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-base"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submit("declined")}
                className="bg-red-600 text-white font-semibold py-4 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
              >
                {isSubmitting ? "Submitting…" : "Confirm Decline"}
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center pt-1">
            Your response is recorded and saved to your project file.
          </p>
        </div>
      </div>
    </div>
  );
}
