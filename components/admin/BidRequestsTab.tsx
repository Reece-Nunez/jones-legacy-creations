"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Copy,
  Send,
  Trash2,
  Ban,
  FileCheck2,
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { fileDownloadUrl } from "@/lib/fileDownloadUrl";
import { DEFAULT_BID_ACCEPTANCE_TERMS } from "@/lib/legal/approvalText";

export type BidStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "completed"
  | "paid"
  | "void";

export interface BidRequest {
  id: string;
  title: string;
  scope_description: string | null;
  custom_message: string | null;
  contractor_id: string | null;
  contractor_name: string | null;
  contractor_email: string | null;
  contractor_phone: string | null;
  status: BidStatus;
  token: string | null;
  decided_at: string | null;
  responder_name: string | null;
  decline_reason: string | null;
  completed_at: string | null;
  paid_at: string | null;
  document?: { file_url: string; name: string } | null;
  created_at: string;
}

interface ContractorOption {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  trade?: string | null;
}

const STATUS_STYLES: Record<BidStatus, string> = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-indigo-100 text-indigo-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-50 text-red-600",
  completed: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  void: "bg-red-50 text-red-600 line-through",
};

const STATUS_LABEL: Record<BidStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed — pay",
  paid: "Paid",
  void: "Void",
};

export function BidRequestsTab({
  projectId,
  bidRequests,
  contractors,
}: {
  projectId: string;
  bidRequests: BidRequest[];
  /** Blake's contractor rolodex — the recipient picker for a bid blast. */
  contractors: ContractorOption[];
}) {
  const router = useRouter();
  const base = `/api/admin/projects/${projectId}/bid-requests`;

  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [message, setMessage] = useState("");
  const [terms, setTerms] = useState(DEFAULT_BID_ACCEPTANCE_TERMS);
  const [showTerms, setShowTerms] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filteredContractors = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contractors;
    return contractors.filter((c) =>
      [c.name, c.company, c.trade, c.email].some((f) => f?.toLowerCase().includes(q))
    );
  }, [contractors, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetForm() {
    setTitle("");
    setScope("");
    setMessage("");
    setTerms(DEFAULT_BID_ACCEPTANCE_TERMS);
    setShowTerms(false);
    setSearch("");
    setSelected(new Set());
    setShowForm(false);
  }

  async function sendBlast(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Add a title for the bid request");
      return;
    }
    if (selected.size === 0) {
      toast.error("Select at least one contractor");
      return;
    }
    const recipients = contractors
      .filter((c) => selected.has(c.id))
      .map((c) => ({
        contractor_id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
      }));
    const withoutEmail = recipients.filter((r) => !r.email).length;

    setBusy(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scope_description: scope.trim() || null,
          custom_message: message.trim() || null,
          terms_text: terms,
          recipients,
          send: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      const emailed = data.emailed ?? 0;
      toast.success(
        `${data.created} bid request${data.created === 1 ? "" : "s"} sent` +
          (emailed ? ` · ${emailed} emailed` : "") +
          (withoutEmail ? ` · ${withoutEmail} need a link copied` : "")
      );
      resetForm();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  function copyLink(bid: BidRequest) {
    if (!bid.token) return;
    const link = `${window.location.origin}/respond-bid/${bid.token}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success("Response link copied"),
      () => toast.error("Couldn't copy link")
    );
  }

  async function resend(bid: BidRequest) {
    if (!bid.contractor_email) {
      toast.error("No email on file — use Copy link instead");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${base}/${bid.id}/send`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast.success(data.emailed ? "Email resent" : "Marked as sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  async function act(bid: BidRequest, action: "complete" | "paid" | "void") {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${bid.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed");
      toast.success(
        action === "complete" ? "Marked completed" : action === "paid" ? "Marked paid" : "Voided"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(bid: BidRequest) {
    setBusy(true);
    try {
      const res = await fetch(`${base}/${bid.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to delete");
      toast.success("Deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusy(false);
    }
  }

  const awaiting = (s: BidStatus) => s === "draft" || s === "sent" || s === "viewed";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bid Requests</h2>
          <p className="text-sm text-gray-500">
            Send a scope to multiple contractors at once; each gets their own link to accept or
            decline.
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Bid Request
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={sendBlast} className="space-y-3 rounded-xl border border-gray-200 p-4 bg-gray-50">
          <Input
            label="Title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Framing — bid request"
          />
          <Textarea
            label="Scope of work"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Describe the work you're asking them to bid"
          />
          <Textarea
            label="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Plans attached. Please get me a number by Friday."
          />

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Contractors {selected.size > 0 && <span className="text-gray-400">· {selected.size} selected</span>}
              </label>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, company, or trade"
                className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
              {filteredContractors.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-6 text-center">
                  {contractors.length === 0
                    ? "No contractors yet — add them under Contractors first."
                    : "No matches."}
                </p>
              ) : (
                filteredContractors.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                      {c.trade && <span className="text-xs text-gray-500"> · {c.trade}</span>}
                      <span className="block text-xs text-gray-400 truncate">
                        {c.email || "No email — link only"}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Terms (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowTerms((v) => !v)}
              className="text-xs text-gray-500 underline"
            >
              {showTerms ? "Hide" : "Edit"} acceptance terms
            </button>
            {showTerms && (
              <Textarea
                label="Terms the contractor agrees to on acceptance"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="mt-2"
              />
            )}
            <p className="text-xs text-gray-400 mt-1">
              This wording is boilerplate — have an attorney review it before relying on it.
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" isLoading={busy}>
              <Send className="w-4 h-4 mr-1" /> Send{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {bidRequests.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 py-8 text-center">No bid requests yet.</p>
      ) : (
        <div className="space-y-3">
          {bidRequests.map((bid) => (
            <div key={bid.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">
                      {bid.contractor_name || "Unnamed contractor"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[bid.status]}`}
                    >
                      {STATUS_LABEL[bid.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {bid.title}
                    {bid.status === "accepted" && bid.responder_name && ` · accepted by ${bid.responder_name}`}
                    {bid.status === "declined" && bid.decline_reason && ` · "${bid.decline_reason}"`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {awaiting(bid.status) && (
                  <>
                    <button
                      onClick={() => copyLink(bid)}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy link
                    </button>
                    <button
                      onClick={() => resend(bid)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> {bid.status === "draft" ? "Send email" : "Resend"}
                    </button>
                    <button
                      onClick={() => act(bid, "void")}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" /> Void
                    </button>
                  </>
                )}

                {bid.status === "accepted" && (
                  <button
                    onClick={() => act(bid, "complete")}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark completed
                  </button>
                )}

                {bid.status === "completed" && (
                  <button
                    onClick={() => act(bid, "paid")}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Mark paid
                  </button>
                )}

                {bid.document?.file_url && (
                  <a
                    href={fileDownloadUrl(bid.document.file_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" /> Acceptance PDF
                  </a>
                )}

                <button
                  onClick={() => remove(bid)}
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
