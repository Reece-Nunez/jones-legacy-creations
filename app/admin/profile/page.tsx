"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  User,
  Shield,
  Bell,
  Palette,
  Save,
  Loader2,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import toast from "react-hot-toast";

interface UserProfile {
  id: string;
  auth_id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  phone: string | null;
  title: string | null;
  theme: "light" | "dark" | "system";
  timezone: string;
  notify_email: boolean;
  notify_in_app: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  project_manager: "Project Manager",
  viewer: "Viewer",
};

const TIMEZONE_OPTIONS = [
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
];

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

function ThemeButton({
  theme,
  currentTheme,
  icon: Icon,
  label,
  onClick,
}: {
  theme: string;
  currentTheme: string;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  const isActive = theme === currentTheme;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
        isActive
          ? "border-black bg-gray-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? "text-black" : "text-gray-400"}`} />
      <span className={`text-xs font-medium ${isActive ? "text-black" : "text-gray-500"}`}>
        {label}
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        if (data.theme) setNextTheme(data.theme);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load profile");
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof UserProfile, value: unknown) => {
    setProfile((prev) => prev ? { ...prev, [key]: value } as UserProfile : prev);
    setDirty(true);
  };

  const { setTheme: setNextTheme } = useTheme();

  const applyTheme = (theme: "light" | "dark" | "system") => {
    update("theme", theme);
    setNextTheme(theme);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: profile.display_name,
          phone: profile.phone,
          title: profile.title,
          theme: profile.theme,
          timezone: profile.timezone,
          notify_email: profile.notify_email,
          notify_in_app: profile.notify_in_app,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profile saved");
      setDirty(false);
    } catch {
      toast.error("Failed to save profile");
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

  if (!profile) {
    return (
      <div className="text-center py-20 text-gray-500">
        Unable to load profile.
      </div>
    );
  }

  const initials = profile.display_name
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account and preferences
          </p>
        </div>
        <Button onClick={handleSave} isLoading={saving} disabled={!dirty}>
          <Save className="w-4 h-4 mr-1.5" />
          Save Changes
        </Button>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-5">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-lg">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {profile.display_name || "Unnamed User"}
            </h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
              {profile.title && (
                <span className="text-xs text-gray-400">{profile.title}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <SectionCard
        icon={User}
        title="Personal Information"
        description="Your name and contact details"
      >
        <FieldRow label="Display Name">
          <Input
            value={profile.display_name}
            onChange={(e) => update("display_name", e.target.value)}
            placeholder="Your name"
          />
        </FieldRow>
        <FieldRow label="Email" hint="Managed by your login provider">
          <Input
            value={profile.email}
            disabled
            className="bg-gray-50 text-gray-500"
          />
        </FieldRow>
        <FieldRow label="Phone">
          <Input
            value={profile.phone ?? ""}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="(801) 555-0100"
          />
        </FieldRow>
        <FieldRow label="Job Title">
          <Input
            value={profile.title ?? ""}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. General Contractor, Project Manager"
          />
        </FieldRow>
        <FieldRow label="Timezone">
          <Select
            options={TIMEZONE_OPTIONS}
            value={profile.timezone}
            onChange={(e) => update("timezone", e.target.value)}
          />
        </FieldRow>
      </SectionCard>

      {/* Role & Access */}
      <SectionCard
        icon={Shield}
        title="Role & Access"
        description="Your permissions in the system"
      >
        <FieldRow label="Role" hint="Contact the account owner to change roles">
          <div className="flex items-center gap-3 py-2">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </span>
          </div>
        </FieldRow>
        <FieldRow label="Account Status">
          <div className="flex items-center gap-2 py-2">
            <span className={`w-2 h-2 rounded-full ${profile.is_active ? "bg-green-500" : "bg-gray-300"}`} />
            <span className="text-sm text-gray-700">
              {profile.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </FieldRow>
        {profile.last_login_at && (
          <FieldRow label="Last Login">
            <p className="text-sm text-gray-500 py-2">
              {new Date(profile.last_login_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </FieldRow>
        )}
      </SectionCard>

      {/* Appearance */}
      <SectionCard
        icon={Palette}
        title="Appearance"
        description="Customize how the app looks"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-3">
            <ThemeButton
              theme="light"
              currentTheme={profile.theme}
              icon={Sun}
              label="Light"
              onClick={() => applyTheme("light")}
            />
            <ThemeButton
              theme="dark"
              currentTheme={profile.theme}
              icon={Moon}
              label="Dark"
              onClick={() => applyTheme("dark")}
            />
            <ThemeButton
              theme="system"
              currentTheme={profile.theme}
              icon={Monitor}
              label="System"
              onClick={() => applyTheme("system")}
            />
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        title="Notification Preferences"
        description="Choose how you want to be notified"
      >
        <Toggle
          checked={profile.notify_email}
          onChange={(v) => update("notify_email", v)}
          label="Email notifications"
        />
        <Toggle
          checked={profile.notify_in_app}
          onChange={(v) => update("notify_in_app", v)}
          label="In-app notifications"
        />
      </SectionCard>

      {/* Sticky save bar */}
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
