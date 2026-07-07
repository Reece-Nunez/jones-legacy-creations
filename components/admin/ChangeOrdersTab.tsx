"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Copy, Send, Trash2, Ban, FileCheck2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import { DEFAULT_CHANGE_ORDER_CONSENT } from "@/lib/legal/approvalText";

export interface ChangeOrder {
  id: string;
  title: string;
  description: string | null;
  reason: string | null;
  cost_delta: number;
  schedule_impact_days: number;
  status: "draft" | "sent" | "signed" | "void";
  token: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  consent_text: string | null;
  signed_at: string | null;
  signer_name: string | null;
  document?: { file_url: string; name: string } | null;
  created_at: string;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatDelta(amount: number): string {
  return `${amount >= 0 ? "+" : "−"}${usd.format(Math.abs(amount))}`;
}

const STATUS_STYLES: Record<ChangeOrder["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  signed: "bg-green-100 text-green-700",
  void: "bg-red-50 text-red-600 line-through",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  reason: "",
  cost_delta: "",
  schedule_impact_days: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  consent_text: DEFAULT_CHANGE_ORDER_CONSENT,
};

export function ChangeOrdersTab({
  projectId,
  changeOrders,
  defaultClient,
}: {
  projectId: string;
  changeOrders: ChangeOrder[];
  /** Project client contact — pre-fills the form but stays editable. */
  defaultClient?: { name?: string | null; email?: string | null; phone?: string | null };
}) {
  const router = useRouter();
  const initialForm = () => ({
    ...EMPTY_FORM,
    client_name: defaultClient?.name ?? "",
    client_email: defaultClient?.email ?? "",
    client_phone: defaultClient?.phone ?? "",
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);

  const base = `/api/admin/projects/${projectId}/change-orders`;

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          reason: form.reason.trim() || null,
          cost_delta: form.cost_delta ? Number(form.cost_delta) : 0,
          schedule_impact_days: form.schedule_impact_days ? Number(form.schedule_impact_days) : 0,
          client_name: form.client_name.trim() || null,
          client_email: form.client_email.trim() || null,
          client_phone: form.client_phone.trim() || null,
          consent_text: form.consent_text,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to create");
      toast.success("Change order created");
      setForm(initialForm());
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  function copyLink(co: ChangeOrder) {
    if (!co.token) return;
    const link = `${window.location.origin}/sign-change-order/${co.token}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success("Signing link copied"),
      () => toast.error("Couldn't copy link")
    );
  }

  async function sendEmail(co: ChangeOrder) {
    if (!co.client_email) {
      toast.error("Add a client email first (edit not available — recreate with email).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${base}/${co.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(data.emailed ? "Emailed to client" : "Marked as sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  async function voidOrder(co: ChangeOrder) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${co.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "void" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to void");
      toast.success("Change order voided");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void");
    } finally {
      setBusy(false);
    }
  }

  async function deleteOrder(co: ChangeOrder) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${co.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to delete");
      toast.success("Deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Change Orders</h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Change Order
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createOrder} className="space-y-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Upgrade kitchen countertops to quartz"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What is changing and what it includes"
          />
          <Textarea
            label="Reason"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Why this change is needed"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Change to price ($)"
              type="number"
              step="0.01"
              value={form.cost_delta}
              onChange={(e) => setForm({ ...form, cost_delta: e.target.value })}
              placeholder="e.g. 2500 or -800"
            />
            <Input
              label="Schedule impact (days)"
              type="number"
              step="1"
              value={form.schedule_impact_days}
              onChange={(e) => setForm({ ...form, schedule_impact_days: e.target.value })}
              placeholder="e.g. 3"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Client name"
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            />
            <Input
              label="Client email"
              type="email"
              value={form.client_email}
              onChange={(e) => setForm({ ...form, client_email: e.target.value })}
            />
            <Input
              label="Client phone"
              value={form.client_phone}
              onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
            />
          </div>
          <Textarea
            label="Agreement text the client signs"
            value={form.consent_text}
            onChange={(e) => setForm({ ...form, consent_text: e.target.value })}
          />
          <p className="text-xs text-gray-400">
            This wording is boilerplate — have an attorney review it before relying on it.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm" isLoading={busy}>
              Create
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setForm(initialForm());
                setShowForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {changeOrders.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 py-8 text-center">No change orders yet.</p>
      ) : (
        <div className="space-y-3">
          {changeOrders.map((co) => (
            <div key={co.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{co.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[co.status]}`}
                    >
                      {co.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatDelta(co.cost_delta)}
                    {co.schedule_impact_days !== 0 &&
                      ` · ${co.schedule_impact_days > 0 ? "+" : "−"}${Math.abs(co.schedule_impact_days)} day${
                        Math.abs(co.schedule_impact_days) === 1 ? "" : "s"
                      }`}
                    {co.status === "signed" && co.signer_name && ` · signed by ${co.signer_name}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {co.status !== "signed" && co.status !== "void" && (
                  <>
                    <button
                      onClick={() => copyLink(co)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy link
                    </button>
                    <button
                      onClick={() => sendEmail(co)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> {co.status === "sent" ? "Resend email" : "Send email"}
                    </button>
                    <button
                      onClick={() => voidOrder(co)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" /> Void
                    </button>
                  </>
                )}
                {co.document?.file_url && (
                  <a
                    href={fileDownloadUrl(co.document.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" /> View signed PDF
                  </a>
                )}
                <button
                  onClick={() => deleteOrder(co)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
