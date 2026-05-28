"use client";

/**
 * Triage table for /admin/leads.
 *
 * Inline status dropdown PATCHes the row. Click anywhere on the row
 * to expand and see the raw_payload (the original form fields) and
 * attribution data. One-click "Mark spam" for quick triage.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Mail,
  Phone,
  Trash2,
} from "lucide-react";
import { confirmAction } from "@/lib/confirmAction";
import { formatDateTime } from "@/lib/formatters";

interface Lead {
  id: string;
  source: string;
  status: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  raw_payload: Record<string, unknown> | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  user_agent: string | null;
  notes: string | null;
  contacted_at: string | null;
  closed_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  qualified: "bg-purple-100 text-purple-800",
  won: "bg-emerald-100 text-emerald-800",
  lost: "bg-gray-200 text-gray-700",
  spam: "bg-rose-100 text-rose-700",
};

const SOURCE_LABELS: Record<string, string> = {
  contact: "Contact",
  construction: "Construction",
  real_estate: "Real Estate",
  interior_design: "Interior Design",
  newsletter: "Newsletter",
  other: "Other",
};

export default function LeadsTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Mail className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          No leads match this filter yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="divide-y divide-gray-100">
        {leads.map((lead) => (
          <LeadRow key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(lead.status);

  async function updateStatus(newStatus: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Failed to update status");
        return;
      }
      setCurrentStatus(newStatus);
      toast.success(`Marked as ${newStatus}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deleteLead(e: React.MouseEvent) {
    e.stopPropagation();
    if (!(await confirmAction("Delete this lead permanently?"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Failed to delete");
        return;
      }
      toast.success("Lead deleted");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hover:bg-gray-50 transition-colors">
      {/* Row header */}
      <div
        className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <button
          aria-label="Toggle"
          className="self-start text-gray-400 hover:text-gray-700 sm:order-first"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-semibold text-gray-900 truncate">
              {lead.full_name || "(no name)"}
            </span>
            <span className="text-[11px] text-gray-500">
              {SOURCE_LABELS[lead.source] || lead.source}
            </span>
            {lead.subject && (
              <span className="text-xs text-gray-600 truncate">
                {lead.subject}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 hover:text-indigo-600"
              >
                <Mail className="w-3 h-3" />
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 hover:text-indigo-600"
              >
                <Phone className="w-3 h-3" />
                {lead.phone}
              </a>
            )}
            <span>· {formatDateTime(lead.created_at)}</span>
          </div>
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[currentStatus] || "bg-gray-100 text-gray-700"}`}
          >
            {currentStatus}
          </span>
          <select
            value={currentStatus}
            disabled={busy}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer disabled:opacity-50"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="spam">Spam</option>
          </select>
          <button
            onClick={deleteLead}
            disabled={busy}
            className="p-1.5 text-gray-400 hover:text-rose-600 disabled:opacity-50"
            aria-label="Delete lead"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3 space-y-3 text-xs">
          {lead.message && (
            <div>
              <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                Message
              </p>
              <p className="text-gray-800 whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          {/* Raw payload — original form fields the typed columns don't cover */}
          {lead.raw_payload && Object.keys(lead.raw_payload).length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                Form fields
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(lead.raw_payload)
                  .filter(([k]) => !["recaptchaToken", "honeypot"].includes(k))
                  .map(([k, v]) =>
                    v === null || v === undefined || v === "" ? null : (
                      <div key={k} className="flex items-baseline gap-2 min-w-0">
                        <span className="text-gray-500 text-[10px] uppercase shrink-0">
                          {k}
                        </span>
                        <span className="text-gray-800 truncate">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ),
                  )}
              </div>
            </div>
          )}

          {/* Attribution row — UTMs / referrer / user-agent */}
          {(lead.utm_source ||
            lead.utm_medium ||
            lead.utm_campaign ||
            lead.referrer) && (
            <div>
              <p className="font-semibold text-gray-700 uppercase tracking-wide text-[10px] mb-1">
                Attribution
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                {lead.utm_source && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                    src: {lead.utm_source}
                  </span>
                )}
                {lead.utm_medium && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                    med: {lead.utm_medium}
                  </span>
                )}
                {lead.utm_campaign && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-700">
                    camp: {lead.utm_campaign}
                  </span>
                )}
                {lead.referrer && (
                  <a
                    href={lead.referrer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-0.5 text-gray-700 hover:bg-gray-300"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    referrer
                  </a>
                )}
              </div>
            </div>
          )}

          {(lead.contacted_at || lead.closed_at) && (
            <div className="text-[11px] text-gray-500">
              {lead.contacted_at && (
                <span>Contacted: {formatDateTime(lead.contacted_at)}</span>
              )}
              {lead.contacted_at && lead.closed_at && <span> · </span>}
              {lead.closed_at && <span>Closed: {formatDateTime(lead.closed_at)}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
