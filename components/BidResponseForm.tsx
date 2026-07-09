"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface BidResponseFormProps {
  token: string;
  projectName: string;
  title: string;
  scopeDescription?: string | null;
  customMessage?: string | null;
  termsText: string;
  contractorName?: string | null;
}

export function BidResponseForm({
  token,
  projectName,
  title,
  scopeDescription,
  customMessage,
  termsText,
  contractorName,
}: BidResponseFormProps) {
  const [responderName, setResponderName] = useState(contractorName ?? "");
  const [bidAmount, setBidAmount] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [mode, setMode] = useState<"bid" | "passing">("bid");
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<"submitted" | "passed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(decision: "submitted" | "passed") {
    setError(null);
    if (!responderName.trim()) {
      setError("Please type your full name.");
      return;
    }
    if (decision === "submitted" && !agreed) {
      setError("Please check the box to submit your bid.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bid-requests/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          decision,
          responder_name: responderName.trim(),
          consent: decision === "submitted" ? true : undefined,
          bid_amount: decision === "submitted" && bidAmount ? Number(bidAmount) : undefined,
          bid_note: decision === "submitted" ? bidNote.trim() || null : undefined,
          decline_reason: decision === "passed" ? declineReason.trim() || null : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setResult(decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    const submitted = result === "submitted";
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              submitted ? "bg-green-100" : "bg-gray-100"
            }`}
          >
            {submitted ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-gray-500" />
            )}
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {submitted ? "Bid submitted!" : "Response recorded"}
          </h2>
          <p className="text-gray-500">
            {submitted
              ? "Thank you — Jones Legacy Creations will review your bid and get back to you."
              : "Thank you for letting us know. No further action is needed."}
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
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Bid Request</h1>
          <p className="text-sm text-gray-500">
            For: <span className="font-medium text-gray-700">{projectName}</span>
          </p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scope</p>
            <p className="text-lg font-semibold text-gray-900">{title}</p>
          </div>
          {scopeDescription?.trim() && (
            <p className="text-gray-700 whitespace-pre-line">{scopeDescription}</p>
          )}
          {customMessage?.trim() && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Message from Jones Legacy Creations
              </p>
              <p className="text-gray-700 whitespace-pre-line">{customMessage}</p>
            </div>
          )}
        </div>

        {/* Response */}
        <div className="p-6 space-y-5">
          <div>
            <label htmlFor="responderName" className="block text-sm font-medium text-gray-700 mb-2">
              Type your full name <span className="text-red-500">*</span>
            </label>
            <input
              id="responderName"
              type="text"
              value={responderName}
              onChange={(e) => setResponderName(e.target.value)}
              placeholder="e.g. Sam Rivera"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-base"
            />
          </div>

          {mode === "bid" ? (
            <>
              <div>
                <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Your bid amount <span className="text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    id="bidAmount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="e.g. 12500"
                    className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-base"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bidNote" className="block text-sm font-medium text-gray-700 mb-2">
                  Note <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="bidNote"
                  value={bidNote}
                  onChange={(e) => setBidNote(e.target.value)}
                  rows={2}
                  placeholder="Anything Jones Legacy Creations should know"
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
                <span>{termsText}</span>
              </label>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => submit("submitted")}
                disabled={isSubmitting || !responderName.trim() || !agreed}
                className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
              >
                {isSubmitting ? "Submitting…" : "Submit Bid"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("passing");
                }}
                disabled={isSubmitting}
                className="w-full bg-white text-gray-600 font-medium py-3 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                I can&apos;t take this one
              </button>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  id="declineReason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Booked through next month"
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
                type="button"
                onClick={() => submit("passed")}
                disabled={isSubmitting || !responderName.trim()}
                className="w-full bg-gray-800 text-white font-semibold py-4 rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base"
              >
                {isSubmitting ? "Submitting…" : "Pass on this bid"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode("bid");
                }}
                disabled={isSubmitting}
                className="w-full bg-white text-gray-600 font-medium py-3 rounded-xl border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm"
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
