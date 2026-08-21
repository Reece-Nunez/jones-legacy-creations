"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Check, X, Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { evaluatePassword, isPasswordValid } from "@/lib/auth/passwordPolicy";

/** One live requirement indicator. Grey until touched, then green or red. */
function Requirement({ met, label, dim }: { met: boolean; label: string; dim: boolean }) {
  const tone = dim ? "text-gray-400" : met ? "text-green-700" : "text-gray-500";
  return (
    <li className={`flex items-center gap-2 text-xs transition-colors ${tone}`}>
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
          dim ? "bg-gray-200" : met ? "bg-green-600" : "bg-gray-300"
        }`}
        aria-hidden="true"
      >
        {met && !dim ? (
          <Check className="h-3 w-3 text-white" />
        ) : (
          <X className="h-3 w-3 text-white" />
        )}
      </span>
      <span>{label}</span>
      {/* Screen readers get the state in words, not just colour. */}
      <span className="sr-only">{met ? " — met" : " — not met"}</span>
    </li>
  );
}

export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const rules = evaluatePassword(password);
  const untouched = password.length === 0;
  const strong = isPasswordValid(password);
  const matches = confirm.length > 0 && password === confirm;
  const canSubmit = strong && matches && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Could not update password");
      }
      setPassword("");
      setConfirm("");
      setShow(false);
      toast.success("Password updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-700">
            New password
          </label>
          <div className="relative">
            <Input
              id="new-password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 transition-colors hover:text-gray-700"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-700">
            Re-enter new password
          </label>
          <Input
            id="confirm-password"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            error={confirm.length > 0 && !matches ? "Passwords do not match" : undefined}
          />
          {matches && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-green-700">
              <Check className="h-3.5 w-3.5" />
              Passwords match
            </p>
          )}
        </div>
      </div>

      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <Requirement key={rule.id} met={rule.met} label={rule.label} dim={untouched} />
        ))}
      </ul>

      <div className="flex items-center gap-3">
        <Button onClick={submit} isLoading={saving} disabled={!canSubmit}>
          <KeyRound className="mr-1.5 h-4 w-4" />
          Update Password
        </Button>
        {!untouched && !canSubmit && !saving && (
          <span className="text-xs text-gray-500">
            {strong ? "Re-enter the password to confirm." : "Meet every requirement to continue."}
          </span>
        )}
      </div>
    </div>
  );
}
