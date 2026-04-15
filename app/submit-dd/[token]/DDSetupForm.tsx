"use client";

import { useState } from "react";
import Image from "next/image";
import { NACHA_AUTHORIZATION_TEXT } from "@/lib/quickbooks/dd-email";
import { CheckCircle2, Lock, AlertTriangle } from "lucide-react";

type AccountType = "checking" | "savings";

interface Props {
  token: string;
  contractorName: string;
  companyName: string;
  preview?: boolean;
}

/** ABA routing number checksum (mod-10 weighted sum) */
function validateRouting(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  const d = routing.split("").map(Number);
  const sum =
    3 * (d[0] + d[3] + d[6]) +
    7 * (d[1] + d[4] + d[7]) +
    1 * (d[2] + d[5] + d[8]);
  return sum !== 0 && sum % 10 === 0;
}

export default function DDSetupForm({ token, contractorName, companyName, preview = false }: Props) {
  const [form, setForm] = useState({
    accountHolderName: preview ? contractorName : "",
    routingNumber: preview ? "021000021" : "",
    accountNumber: preview ? "123456789" : "",
    confirmAccountNumber: preview ? "123456789" : "",
    accountType: "checking" as AccountType,
  });
  const [authorized, setAuthorized] = useState(preview);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);

  const firstName = contractorName.split(" ")[0];

  function handleRoutingBlur() {
    if (form.routingNumber && !validateRouting(form.routingNumber)) {
      setRoutingError("Invalid routing number — please check and try again.");
    } else {
      setRoutingError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (preview) return; // no-op in preview

    if (!validateRouting(form.routingNumber)) {
      setRoutingError("Invalid routing number — please check and try again.");
      return;
    }

    if (form.accountNumber !== form.confirmAccountNumber) {
      setError("Account numbers do not match.");
      return;
    }

    if (!authorized) {
      setError("Please read and accept the authorization to continue.");
      return;
    }

    if (preview) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/submit-dd/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountHolderName: form.accountHolderName.trim(),
          routingNumber: form.routingNumber.trim(),
          accountNumber: form.accountNumber.trim(),
          accountType: form.accountType,
          authorized,
          authorizationText: NACHA_AUTHORIZATION_TEXT,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed. Please try again or contact your project manager.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gray-900 px-8 py-6 text-center">
              <Image src="/logo-transparent.png" alt="Jones Legacy Creations" width={160} height={48} className="mx-auto h-12 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
            <div className="px-8 py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">You&apos;re all set!</h1>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Your bank account information has been securely submitted to {companyName}.
                Your future payments will be deposited directly into your account.
              </p>
              <p className="text-xs text-gray-400">You may close this window.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">

          {/* Header */}
          <div className="bg-gray-900 px-8 py-6">
            <Image src="/logo-transparent.png" alt="Jones Legacy Creations" width={160} height={48} className="h-12 w-auto mb-4" style={{ filter: "brightness(0) invert(1)" }} />
            <h1 className="text-white font-bold text-xl">Direct Deposit Setup</h1>
            <p className="text-gray-400 text-sm mt-1">
              {companyName} would like to pay you via ACH direct deposit
            </p>
          </div>

          {/* Greeting */}
          <div className="px-8 pt-7 pb-1">
            <p className="text-gray-700 text-sm leading-relaxed">
              Hi <strong>{firstName}</strong>, please enter your bank account details below.
              Your information is encrypted and will not be stored — it is sent directly to
              QuickBooks for payment processing.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

            {/* Account holder name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoComplete="name"
                value={form.accountHolderName}
                onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                placeholder="Full name as it appears on your bank account"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            {/* Account type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {(["checking", "savings"] as AccountType[]).map((type) => (
                  <label
                    key={type}
                    className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2.5 cursor-pointer text-sm font-medium transition-colors ${
                      form.accountType === type
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      value={type}
                      checked={form.accountType === type}
                      onChange={() => setForm({ ...form, accountType: type })}
                      className="sr-only"
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Routing number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Routing Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={9}
                value={form.routingNumber}
                onChange={(e) => setForm({ ...form, routingNumber: e.target.value.replace(/\D/g, "") })}
                onBlur={handleRoutingBlur}
                placeholder="9-digit ABA routing number"
                className={`w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono ${
                  routingError ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {routingError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {routingError}
                </p>
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                Found on the bottom-left of a check, or in your bank&apos;s app under account details.
              </p>
            </div>

            {/* Account number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })}
                placeholder="Your bank account number"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
              />
            </div>

            {/* Confirm account number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={form.confirmAccountNumber}
                onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value.replace(/\D/g, "") })}
                placeholder="Re-enter account number"
                className={`w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono ${
                  form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber
                    ? "border-red-400 bg-red-50"
                    : "border-gray-300"
                }`}
              />
              {form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Account numbers do not match.
                </p>
              )}
            </div>

            {/* NACHA Authorization */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                ACH Authorization
              </p>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">
                {NACHA_AUTHORIZATION_TEXT}
              </p>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="mt-0.5 accent-gray-900"
                  required
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  I have read and agree to the ACH authorization above. I confirm this is
                  my bank account and I am authorized to set up direct deposit.
                </span>
              </label>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2.5 text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
              <span>
                Your information is encrypted with TLS 1.2+ and sent directly to QuickBooks.
                It is <strong>never stored</strong> in this application.
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !authorized || !!routingError}
              className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              {submitting ? "Submitting securely…" : "Submit Bank Information"}
            </button>

            {preview && (
              <p className="text-center text-xs text-amber-600 font-medium">
                Preview mode — submission will not send real data
              </p>
            )}

          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          This link expires 24 hours after it was sent and can only be used once.
        </p>
      </div>
    </div>
  );
}
