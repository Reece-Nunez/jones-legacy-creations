"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Copy, Send, Trash2, FileCheck2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import { DEFAULT_SELECTION_DISCLAIMER } from "@/lib/legal/approvalText";

export interface Selection {
  id: string;
  title: string;
  selection_name: string | null;
  description: string | null;
  location: string | null;
  cost_impact: number | null;
  image_url: string | null;
  disclaimer_text: string | null;
  status: "draft" | "sent" | "approved" | "declined";
  token: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  decision: "approved" | "declined" | null;
  decider_name: string | null;
  decline_reason: string | null;
  document?: { file_url: string; name: string } | null;
  created_at: string;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const STATUS_STYLES: Record<Selection["status"], string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

const EMPTY_FORM = {
  title: "",
  selection_name: "",
  description: "",
  location: "",
  cost_impact: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  disclaimer_text: DEFAULT_SELECTION_DISCLAIMER,
};

export function SelectionsTab({
  projectId,
  selections,
}: {
  projectId: string;
  selections: Selection[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const base = `/api/admin/projects/${projectId}/selections`;

  async function createSelection(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("selection_name", form.selection_name.trim());
      fd.append("description", form.description.trim());
      fd.append("location", form.location.trim());
      if (form.cost_impact) fd.append("cost_impact", form.cost_impact);
      fd.append("client_name", form.client_name.trim());
      fd.append("client_email", form.client_email.trim());
      fd.append("client_phone", form.client_phone.trim());
      fd.append("disclaimer_text", form.disclaimer_text);
      if (image) fd.append("image", image);

      const res = await fetch(base, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to create");
      toast.success("Selection created");
      setForm({ ...EMPTY_FORM });
      setImage(null);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setBusy(false);
    }
  }

  function copyLink(sel: Selection) {
    if (!sel.token) return;
    const link = `${window.location.origin}/review-selection/${sel.token}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success("Review link copied"),
      () => toast.error("Couldn't copy link")
    );
  }

  async function sendEmail(sel: Selection) {
    if (!sel.client_email) {
      toast.error("No client email on this selection.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${base}/${sel.id}/send`, {
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

  async function deleteSelection(sel: Selection) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${sel.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to delete");
      toast.success("Deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  const decided = (s: Selection) => s.status === "approved" || s.status === "declined";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Selections</h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Selection
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={createSelection} className="space-y-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <Input
            label="Title"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Kitchen countertop"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Selection"
              value={form.selection_name}
              onChange={(e) => setForm({ ...form, selection_name: e.target.value })}
              placeholder="e.g. Quartz — Calacatta"
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Kitchen"
            />
          </div>
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Cost impact ($)"
            type="number"
            step="0.01"
            value={form.cost_impact}
            onChange={(e) => setForm({ ...form, cost_impact: e.target.value })}
            placeholder="Optional"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo of the selection</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-white hover:file:bg-gray-800"
            />
            {image && <p className="mt-1 text-xs text-gray-500">{image.name}</p>}
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
            label="Disclosure the client agrees to"
            value={form.disclaimer_text}
            onChange={(e) => setForm({ ...form, disclaimer_text: e.target.value })}
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
                setForm({ ...EMPTY_FORM });
                setImage(null);
                setShowForm(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {selections.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 py-8 text-center">No selections yet.</p>
      ) : (
        <div className="space-y-3">
          {selections.map((sel) => (
            <div key={sel.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                {sel.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- stored Supabase URL, previewed via signed download redirect
                  <img
                    src={fileDownloadUrl(sel.image_url)}
                    alt={sel.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{sel.title}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[sel.status]}`}
                    >
                      {sel.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {sel.selection_name || "—"}
                    {sel.cost_impact != null && sel.cost_impact !== 0 && ` · ${usd.format(sel.cost_impact)}`}
                    {decided(sel) && sel.decider_name && ` · by ${sel.decider_name}`}
                  </p>
                  {sel.status === "declined" && sel.decline_reason && (
                    <p className="text-sm text-red-600 mt-1">Reason: {sel.decline_reason}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {!decided(sel) && (
                  <>
                    <button
                      onClick={() => copyLink(sel)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy link
                    </button>
                    <button
                      onClick={() => sendEmail(sel)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> {sel.status === "sent" ? "Resend email" : "Send email"}
                    </button>
                  </>
                )}
                {sel.document?.file_url && (
                  <a
                    href={fileDownloadUrl(sel.document.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" /> View PDF
                  </a>
                )}
                <button
                  onClick={() => deleteSelection(sel)}
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
