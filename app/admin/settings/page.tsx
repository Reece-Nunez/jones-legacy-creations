"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import Link from "next/link";
import {
  Building2,
  Mail,
  FileText,
  Bell,
  Save,
  Loader2,
  Users,
  ChevronRight,
  Plug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import toast from "react-hot-toast";

interface CompanySettings {
  id: string;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_city: string | null;
  company_state: string;
  company_zip: string | null;
  license_number: string | null;
  logo_url: string | null;
  website: string | null;
  default_valid_days: number;
  default_payment_terms: string | null;
  email_reply_to: string | null;
  email_footer_text: string | null;
  notify_new_estimate: boolean;
  notify_quote_accepted: boolean;
  notify_draw_submitted: boolean;
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100">
            <Icon className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 sm:items-start">
      <label className="text-sm font-medium text-gray-700 sm:pt-2">
        {label}
        {hint && <span className="block text-xs text-gray-400 font-normal">{hint}</span>}
      </label>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-black" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

interface QBOStatus {
  connected: boolean;
  realm_id?: string;
  refresh_token_expires_at?: string;
}

interface SyncHealth {
  failedPayments: { count: number; items: Array<{ id: string; contractor_name: string; amount: number; qbo_sync_error: string }> };
  recentWebhookErrors: Array<{ id: string; entity_type: string; entity_id: string; operation: string; error: string; processed_at: string }>;
}

function SettingsPageInner() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [qboStatus, setQboStatus] = useState<QBOStatus | null>(null);
  const [qboDisconnecting, setQboDisconnecting] = useState(false);
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null);
  type SyncPhase = "vendors" | "w9s" | "payments";
  interface SyncResult { succeeded: number; failed: number; skipped?: number; }
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<SyncPhase | null>(null);
  const [syncDone, setSyncDone] = useState(false);
  const [syncResults, setSyncResults] = useState<Partial<Record<SyncPhase, SyncResult>>>({});

  // MFA state
  const [mfaEnrolled, setMfaEnrolled] = useState<boolean | null>(null);
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaRemoving, setMfaRemoving] = useState(false);

  const searchParams = useSearchParams();

  // ── MFA helpers ──────────────────────────────────────────────────────────────
  const checkMfaStatus = useCallback(async () => {
    const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createBrowserClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setMfaEnrolled((data?.totp?.length ?? 0) > 0);
  }, []);

  async function handleMfaEnroll() {
    setMfaEnrolling(true);
    setMfaError(null);
    const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", issuer: "Jones Legacy Creations" });
    if (error || !data) {
      setMfaError("Failed to start MFA enrollment. Please try again.");
      setMfaEnrolling(false);
      return;
    }
    setMfaQr(data.totp.qr_code);
    setMfaFactorId(data.id);
    setMfaEnrolling(false);
  }

  async function handleMfaConfirm() {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    setMfaError(null);
    const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: mfaFactorId, code: mfaCode });
    if (error) {
      setMfaError("Invalid code. Please check your authenticator app.");
      setMfaCode("");
      return;
    }
    setMfaQr(null);
    setMfaFactorId(null);
    setMfaCode("");
    setMfaEnrolled(true);
    toast.success("Two-factor authentication enabled");
  }

  async function handleMfaRemove() {
    if (!mfaFactorId) {
      // Need to get the factor ID first
      const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.[0];
      if (!totp) return;
      setMfaRemoving(true);
      await supabase.auth.mfa.unenroll({ factorId: totp.id });
      setMfaEnrolled(false);
      setMfaRemoving(false);
      toast.success("Two-factor authentication removed");
      return;
    }
    setMfaRemoving(true);
    const { createClient: createBrowserClient } = await import("@/lib/supabase/client");
    const supabase = createBrowserClient();
    await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
    setMfaQr(null);
    setMfaFactorId(null);
    setMfaEnrolled(false);
    setMfaRemoving(false);
    toast.success("Two-factor authentication removed");
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchQboStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/quickbooks/status");
      const data = await res.json();
      setQboStatus(data);
      if (data.connected) {
        fetch("/api/quickbooks/sync-health")
          .then((r) => r.json())
          .then(setSyncHealth)
          .catch(() => {});
      }
    } catch {
      setQboStatus({ connected: false });
    }
  }, []);

  async function handleSyncAll() {
    setSyncing(true);
    setSyncDone(false);
    setSyncResults({});

    const results: Partial<Record<SyncPhase, SyncResult>> = {};

    // Step 1: Vendors
    setSyncPhase("vendors");
    try {
      const res = await fetch("/api/quickbooks/sync/all-vendors", { method: "POST" });
      const data = await res.json();
      results.vendors = { succeeded: data.succeeded ?? 0, failed: data.failed ?? 0 };
    } catch {
      results.vendors = { succeeded: 0, failed: 1 };
    }
    setSyncResults({ ...results });

    // Step 2: W9s
    setSyncPhase("w9s");
    try {
      const res = await fetch("/api/quickbooks/sync/all-w9s", { method: "POST" });
      const data = await res.json();
      results.w9s = { succeeded: data.succeeded ?? 0, failed: data.failed ?? 0, skipped: data.skipped ?? 0 };
    } catch {
      results.w9s = { succeeded: 0, failed: 1 };
    }
    setSyncResults({ ...results });

    // Step 3: Payments
    setSyncPhase("payments");
    try {
      const res = await fetch("/api/quickbooks/sync/all-payments", { method: "POST" });
      const data = await res.json();
      results.payments = { succeeded: data.succeeded ?? 0, failed: data.failed ?? 0, skipped: data.skipped ?? 0 };
    } catch {
      results.payments = { succeeded: 0, failed: 1 };
    }
    setSyncResults({ ...results });

    setSyncPhase(null);
    setSyncing(false);
    setSyncDone(true);
    fetch("/api/quickbooks/sync-health").then((r) => r.json()).then(setSyncHealth).catch(() => {});

    const totalFailed = (results.vendors?.failed ?? 0) + (results.w9s?.failed ?? 0) + (results.payments?.failed ?? 0);
    if (totalFailed > 0) {
      toast.error(`Sync complete with ${totalFailed} error${totalFailed !== 1 ? "s" : ""} — check details below`);
    } else {
      toast.success("All data synced to QuickBooks successfully");
    }
  }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load settings");
        setLoading(false);
      });

    fetchQboStatus();
    checkMfaStatus();
  }, [fetchQboStatus, checkMfaStatus]);

  // Handle QB OAuth callback result in URL
  useEffect(() => {
    if (searchParams.get("qbo_connected") === "1") {
      toast.success("QuickBooks connected successfully");
      fetchQboStatus();
    }
    const qboError = searchParams.get("qbo_error");
    if (qboError) {
      const messages: Record<string, string> = {
        invalid_state: "Connection failed: security check failed. Try again.",
        missing_params: "Connection failed: missing parameters from QuickBooks.",
        token_exchange_failed: "Could not exchange authorization code. Try again.",
      };
      toast.error(messages[qboError] ?? `QuickBooks error: ${qboError}`);
    }
  }, [searchParams, fetchQboStatus]);

  const handleQboDisconnect = async () => {
    setQboDisconnecting(true);
    try {
      const res = await fetch("/api/quickbooks/disconnect", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setQboStatus({ connected: false });
      toast.success("QuickBooks disconnected");
    } catch {
      toast.error("Failed to disconnect QuickBooks");
    } finally {
      setQboDisconnecting(false);
    }
  };

  const update = (key: keyof CompanySettings, value: unknown) => {
    setSettings((prev) => prev ? { ...prev, [key]: value } as CompanySettings : prev);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
      setDirty(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-20 text-gray-500">
        Unable to load settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your company information and preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={saving}
          disabled={!dirty}
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save Changes
        </Button>
      </div>

      {/* Team Management Link */}
      <Link
        href="/admin/settings/team"
        className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 shadow-sm p-5 hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Team Members</h3>
          <p className="text-xs text-gray-500">Manage users, roles, and permissions</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </Link>

      {/* Company Info */}
      <SectionCard
        icon={Building2}
        title="Company Information"
        description="Your business details shown on quotes and proposals"
      >
        <FieldRow label="Company Name">
          <Input
            value={settings.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            placeholder="Jones Legacy Creations"
          />
        </FieldRow>
        <FieldRow label="Phone">
          <Input
            value={settings.company_phone ?? ""}
            onChange={(e) => update("company_phone", e.target.value)}
            placeholder="(801) 555-0100"
          />
        </FieldRow>
        <FieldRow label="Email">
          <Input
            value={settings.company_email ?? ""}
            onChange={(e) => update("company_email", e.target.value)}
            placeholder="info@joneslegacy.com"
          />
        </FieldRow>
        <FieldRow label="Website">
          <Input
            value={settings.website ?? ""}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://joneslegacycreations.com"
          />
        </FieldRow>
        <FieldRow label="Street Address">
          <Input
            value={settings.company_address ?? ""}
            onChange={(e) => update("company_address", e.target.value)}
            placeholder="123 Main St"
          />
        </FieldRow>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <Input
              value={settings.company_city ?? ""}
              onChange={(e) => update("company_city", e.target.value)}
              placeholder="Provo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <Input value="UT" disabled className="bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
            <Input
              value={settings.company_zip ?? ""}
              onChange={(e) => update("company_zip", e.target.value)}
              placeholder="84601"
            />
          </div>
        </div>
        <FieldRow label="License Number" hint="Contractor license / registration">
          <Input
            value={settings.license_number ?? ""}
            onChange={(e) => update("license_number", e.target.value)}
            placeholder="e.g. UT-12345678"
          />
        </FieldRow>
      </SectionCard>

      {/* Quote Defaults */}
      <SectionCard
        icon={FileText}
        title="Quote Defaults"
        description="Default values applied to new quotes"
      >
        <FieldRow label="Valid For (days)" hint="How long quotes stay valid">
          <Input
            type="number"
            min={1}
            max={365}
            value={settings.default_valid_days}
            onChange={(e) => update("default_valid_days", parseInt(e.target.value) || 30)}
            className="w-24"
          />
        </FieldRow>
        <FieldRow label="Payment Terms">
          <Textarea
            value={settings.default_payment_terms ?? ""}
            onChange={(e) => update("default_payment_terms", e.target.value)}
            placeholder="e.g. 50% deposit, balance due at completion"
            rows={2}
          />
        </FieldRow>
      </SectionCard>

      {/* Email Settings */}
      <SectionCard
        icon={Mail}
        title="Email Settings"
        description="Configure how outgoing emails appear"
      >
        <FieldRow label="Reply-To Address" hint="Clients reply to this address">
          <Input
            value={settings.email_reply_to ?? ""}
            onChange={(e) => update("email_reply_to", e.target.value)}
            placeholder="blake@joneslegacy.com"
          />
        </FieldRow>
        <FieldRow label="Email Footer Text" hint="Appended to all outgoing emails">
          <Textarea
            value={settings.email_footer_text ?? ""}
            onChange={(e) => update("email_footer_text", e.target.value)}
            placeholder="Jones Legacy Creations | Licensed & Insured | Utah"
            rows={2}
          />
        </FieldRow>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Control which events trigger notifications"
      >
        <Toggle
          checked={settings.notify_new_estimate}
          onChange={(v) => update("notify_new_estimate", v)}
          label="New estimate request received"
        />
        <Toggle
          checked={settings.notify_quote_accepted}
          onChange={(v) => update("notify_quote_accepted", v)}
          label="Quote accepted by client"
        />
        <Toggle
          checked={settings.notify_draw_submitted}
          onChange={(v) => update("notify_draw_submitted", v)}
          label="Draw request submitted"
        />
      </SectionCard>

      {/* QuickBooks Integration */}
      <SectionCard
        icon={Plug}
        title="QuickBooks Integration"
        description="Sync invoices, customers, and contractor payments with QuickBooks Online"
      >
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            {qboStatus === null ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            ) : qboStatus.connected ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-300 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {qboStatus?.connected ? "Connected" : "Not connected"}
              </p>
              {qboStatus?.connected && qboStatus.realm_id && (
                <p className="text-xs text-gray-400">
                  Company ID: {qboStatus.realm_id}
                </p>
              )}
              {qboStatus?.connected && qboStatus.refresh_token_expires_at && (
                <p className="text-xs text-gray-400">
                  Token valid until{" "}
                  {new Date(qboStatus.refresh_token_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {qboStatus?.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleQboDisconnect}
              isLoading={qboDisconnecting}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Disconnect
            </Button>
          ) : (
            <a href="/api/quickbooks/connect">
              <Button size="sm">Connect QuickBooks</Button>
            </a>
          )}
        </div>

        {qboStatus?.connected && (
          <div className="mt-2 pt-4 border-t border-gray-100 space-y-4">
            {/* Capabilities */}
            <div className="flex flex-wrap gap-2">
              {["Customers", "Invoices", "Vendors / Contractors", "Bills (contractor payments)"].map((cap) => (
                <span key={cap} className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-100">
                  <CheckCircle2 className="w-3 h-3" /> {cap}
                </span>
              ))}
            </div>

            {/* Sync Health */}
            {syncHealth && (syncHealth.failedPayments.count > 0 || syncHealth.recentWebhookErrors.length > 0) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Sync Issues Detected
                </p>
                {syncHealth.failedPayments.count > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-700 mb-1">
                      {syncHealth.failedPayments.count} payment{syncHealth.failedPayments.count !== 1 ? "s" : ""} failed to sync to QuickBooks
                    </p>
                    <ul className="space-y-1">
                      {syncHealth.failedPayments.items.map((p) => (
                        <li key={p.id} className="text-xs text-red-600 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">•</span>
                          <span>
                            <span className="font-medium">{p.contractor_name}</span>
                            {" — "}${Number(p.amount).toLocaleString()}
                            {" — "}
                            <span className="text-red-500">{p.qbo_sync_error}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {syncHealth.recentWebhookErrors.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-700 mb-1">Recent webhook processing errors</p>
                    <ul className="space-y-1">
                      {syncHealth.recentWebhookErrors.slice(0, 3).map((e) => (
                        <li key={e.id} className="text-xs text-red-600 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">•</span>
                          <span>
                            <span className="font-medium">{e.entity_type} {e.operation}</span>
                            {" — "}
                            <span className="text-red-500">{e.error}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {syncHealth && syncHealth.failedPayments.count === 0 && syncHealth.recentWebhookErrors.length === 0 && (
              <p className="text-xs text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> All syncs healthy — no errors detected
              </p>
            )}

            {/* Global Sync */}
            <div className="space-y-3">
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {syncing ? "Syncing…" : "Sync Data to QuickBooks"}
              </button>

              {/* Progress bar — shown while syncing or after done */}
              {(syncing || syncDone) && (() => {
                const steps: { key: SyncPhase; label: string }[] = [
                  { key: "vendors", label: "Vendors" },
                  { key: "w9s", label: "W9 Data" },
                  { key: "payments", label: "Payments" },
                ];
                const currentIndex = syncPhase ? steps.findIndex((s) => s.key === syncPhase) : (syncDone ? 3 : -1);
                const pct = Math.round((currentIndex / 3) * 100);

                return (
                  <div className="space-y-2">
                    {/* Bar */}
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-500"
                        style={{ width: `${syncDone ? 100 : pct}%` }}
                      />
                    </div>

                    {/* Step indicators */}
                    <div className="flex gap-4">
                      {steps.map((step, i) => {
                        const done = syncResults[step.key] !== undefined;
                        const active = syncPhase === step.key;
                        const result = syncResults[step.key];
                        return (
                          <div key={step.key} className="flex items-center gap-1.5 text-xs">
                            {done ? (
                              result?.failed ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              )
                            ) : active ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500 shrink-0" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 shrink-0" />
                            )}
                            <span className={done ? (result?.failed ? "text-red-600" : "text-green-700") : active ? "text-gray-700 font-medium" : "text-gray-400"}>
                              {step.label}
                              {done && result && ` (${result.succeeded} synced${result.failed ? `, ${result.failed} failed` : ""})`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-gray-400">Syncs vendors, W9 tax data, and payments in order. Safe to run anytime — won&apos;t create duplicates.</p>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Two-Factor Authentication */}
      <SectionCard
        icon={ShieldCheck}
        title="Two-Factor Authentication"
        description="Add an extra layer of security to your account"
      >
        {mfaEnrolled === null ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking MFA status…
          </div>
        ) : mfaEnrolled && !mfaQr ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">MFA enabled</p>
                <p className="text-xs text-gray-500">Your account is protected with an authenticator app</p>
              </div>
            </div>
            <button
              onClick={handleMfaRemove}
              disabled={mfaRemoving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {mfaRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
              Remove MFA
            </button>
          </div>
        ) : mfaQr ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code below to confirm.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mfaQr} alt="MFA QR code" className="w-40 h-40 border rounded-lg" />
            {mfaError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {mfaError}
              </p>
            )}
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-center font-mono tracking-widest text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={handleMfaConfirm}
                disabled={mfaCode.length !== 6}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" /> Confirm &amp; Enable
              </button>
              <button onClick={handleMfaRemove} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldOff className="w-5 h-5 text-gray-300" />
              <div>
                <p className="text-sm font-medium text-gray-900">MFA not enabled</p>
                <p className="text-xs text-gray-500">Protect your account with an authenticator app</p>
              </div>
            </div>
            <button
              onClick={handleMfaEnroll}
              disabled={mfaEnrolling}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {mfaEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Enable MFA
            </button>
          </div>
        )}
      </SectionCard>

      {/* Support */}
      <SectionCard
        icon={Mail}
        title="Support"
        description="Get help with the platform or report an issue"
      >
        <p className="text-sm text-gray-600 mb-3">
          Need help? Contact us and we&apos;ll get back to you as soon as possible.
        </p>
        <a
          href="mailto:office@joneslegacycreations.com?subject=Jones Legacy Creations Platform Support"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          <Mail className="w-4 h-4" />
          office@joneslegacycreations.com
        </a>
      </SectionCard>

      {/* Sticky save bar when dirty */}
      {dirty && (
        <div className="fixed bottom-[52px] lg:bottom-0 left-0 right-0 lg:left-64 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 px-6 py-3 flex items-center justify-between shadow-lg">
          <p className="text-sm text-gray-600">You have unsaved changes</p>
          <Button onClick={handleSave} isLoading={saving}>
            <Save className="w-4 h-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}
