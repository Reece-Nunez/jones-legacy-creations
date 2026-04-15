"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Loader2, Landmark, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";

interface BankAccount {
  Id: string;
  Name: string;
  CurrentBalance: number;
}

interface Props {
  contractorPaymentId: string;
  contractorName: string;
  amount: number;
  onClose: () => void;
  onPaid: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function QBOPayContractorModal({
  contractorPaymentId,
  contractorName,
  amount,
  onClose,
  onPaid,
}: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [paying, setPaying] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch("/api/quickbooks/accounts")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
          if (data.length === 1) setSelectedAccountId(data[0].Id);
        }
      })
      .catch(() => toast.error("Could not load bank accounts from QuickBooks"))
      .finally(() => setLoadingAccounts(false));
  }, []);

  async function handlePay() {
    if (!selectedAccountId || !confirmed) return;
    setPaying(true);
    try {
      const res = await fetch("/api/quickbooks/pay/contractor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorPaymentId,
          bankAccountQboId: selectedAccountId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Payment failed — check QuickBooks for details");
        return;
      }

      toast.success(
        data.note === "Already paid in QuickBooks"
          ? "Already recorded as paid in QuickBooks"
          : `Payment to ${contractorName} submitted in QuickBooks`
      );
      onPaid();
      onClose();
    } catch {
      toast.error("Could not reach QuickBooks — payment was not processed");
    } finally {
      setPaying(false);
    }
  }

  const selectedAccount = accounts.find((a) => a.Id === selectedAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-[#2CA01C]" />
            <h2 className="text-base font-semibold text-gray-900">
              Pay via QuickBooks
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Payment summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Payment</p>
            <p className="text-lg font-bold text-gray-900">{fmt(amount)}</p>
            <p className="text-sm text-gray-600">to {contractorName}</p>
          </div>

          {/* Bank account selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pay from
            </label>
            {loadingAccounts ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading accounts from QuickBooks…
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-red-600">
                No bank accounts found in QuickBooks. Add one in QBO first.
              </p>
            ) : (
              <div className="space-y-2">
                {accounts.map((acct) => (
                  <label
                    key={acct.Id}
                    className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedAccountId === acct.Id
                        ? "border-[#2CA01C] bg-green-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="bank_account"
                        value={acct.Id}
                        checked={selectedAccountId === acct.Id}
                        onChange={() => setSelectedAccountId(acct.Id)}
                        className="accent-[#2CA01C]"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {acct.Name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {fmt(acct.CurrentBalance ?? 0)}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              This will create a payment in QuickBooks and mark this contractor as paid.
              If the contractor has direct deposit set up in QBO, an ACH transfer may be initiated.
              This action cannot be undone from here.
            </p>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-[#2CA01C]"
            />
            <span className="text-sm text-gray-700">
              I understand this payment will be recorded in QuickBooks
              {selectedAccount ? ` from ${selectedAccount.Name}` : ""}
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            disabled={!selectedAccountId || !confirmed || paying || loadingAccounts}
            isLoading={paying}
            className="bg-[#2CA01C] hover:bg-[#1e7a14] text-white border-0"
          >
            {paying ? (
              "Processing…"
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Pay {fmt(amount)}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
