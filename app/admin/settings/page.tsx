"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import {
  Building2,
  Mail,
  FileText,
  Bell,
  Save,
  Loader2,
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

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
  }, []);

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
