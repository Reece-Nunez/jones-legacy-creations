"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  ArrowRightCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  type Estimate,
  type EstimateStatus,
  ESTIMATE_STATUS_COLORS,
  PROJECT_TYPE_OPTIONS,
} from "@/lib/types/database";

function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{message}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { toast.dismiss(t.id); resolve(true); }}
              className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
            >
              Yes, Continue
            </button>
            <button
              onClick={() => { toast.dismiss(t.id); resolve(false); }}
              className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 10000 }
    );
  });
}

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const STATUS_LABELS: Record<EstimateStatus, string> = {
  new: "New Lead",
  reviewed: "Contacted",
  converted: "Converted to Project",
  declined: "Declined",
};

const STATUS_BORDER_COLORS: Record<EstimateStatus, string> = {
  new: "border-l-blue-500",
  reviewed: "border-l-yellow-500",
  converted: "border-l-green-500",
  declined: "border-l-gray-400",
};

/** Returns a human-readable relative time string */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface EstimateCardProps {
  estimate: Estimate;
  onUpdate: () => void;
}

export default function EstimateCard({ estimate, onUpdate }: EstimateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(estimate.notes || "");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [convertedSuccess, setConvertedSuccess] = useState(false);
  const [convertedProjectId, setConvertedProjectId] = useState<string | null>(null);

  const projectTypeLabel =
    PROJECT_TYPE_OPTIONS.find((o) => o.value === estimate.project_type)?.label ||
    estimate.project_type;

  async function patchEstimate(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/estimates/${estimate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update");
    return res.json();
  }

  async function handleMarkReviewed() {
    setActionLoading("reviewed");
    try {
      await patchEstimate({ status: "reviewed" });
      onUpdate();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline() {
    if (!(await confirmAction("Decline this estimate?"))) return;
    setActionLoading("declined");
    try {
      await patchEstimate({ status: "declined" });
      onUpdate();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConvert() {
    setActionLoading("convert");
    try {
      // Create a project from the estimate data — pre-fill as many fields as possible
      const projectData = {
        name: `${projectTypeLabel} - ${estimate.client_name}`,
        client_name: estimate.client_name,
        client_email: estimate.client_email,
        client_phone: estimate.client_phone,
        address: estimate.address,
        city: estimate.city,
        state: estimate.state,
        zip: estimate.zip,
        status: "lead",
        project_type: mapEstimateToProjectType(estimate.project_type),
        description: estimate.description,
        estimated_value: estimate.ai_estimate_max || estimate.estimated_max || null,
      };

      const projectRes = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (!projectRes.ok) throw new Error("Failed to create project");
      const project = await projectRes.json();

      // Update estimate with project_id and status
      await patchEstimate({
        project_id: project.id,
        status: "converted",
      });

      setConvertedProjectId(project.id);
      setConvertedSuccess(true);
      toast.success(
        <span>
          Converted to project!{" "}
          <a href={`/admin/projects/${project.id}`} className="underline font-semibold">
            View Project
          </a>
        </span>,
        { duration: 6000 }
      );
      setTimeout(() => setConvertedSuccess(false), 6000);
      onUpdate();
    } catch {
      toast.error("Failed to convert estimate to project");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await patchEstimate({ notes });
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!(await confirmAction("Permanently delete this estimate?"))) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/admin/estimates/${estimate.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onUpdate();
    } catch {
      toast.error("Failed to delete estimate");
    } finally {
      setActionLoading(null);
    }
  }

  const hasAddress = estimate.address || estimate.city || estimate.state;
  const notesId = `notes-${estimate.id}`;

  // Extract the last line of notes as a preview
  const lastNote = estimate.notes
    ? estimate.notes.trim().split("\n").filter(Boolean).pop() || ""
    : "";

  return (
    <div className={`rounded-xl bg-white shadow-sm border border-gray-100 border-l-4 ${STATUS_BORDER_COLORS[estimate.status]} overflow-hidden`}>
      {/* Converted success toast */}
      {convertedSuccess && convertedProjectId && (
        <div role="status" className="flex items-center gap-2 bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Successfully converted to project!{" "}
          <a
            href={`/admin/projects/${convertedProjectId}`}
            className="underline font-semibold hover:text-green-800"
          >
            View Project
          </a>
        </div>
      )}
      {convertedSuccess && !convertedProjectId && (
        <div role="status" className="flex items-center gap-2 bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Successfully converted to project!
        </div>
      )}

      {/* Quick Contact Bar - always visible */}
      {estimate.status !== "converted" && estimate.status !== "declined" && (
        <div className="flex items-center gap-2 px-5 pt-4 sm:px-6">
          {estimate.client_phone && (
            <a
              href={`tel:${estimate.client_phone}`}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Call {estimate.client_name.split(" ")[0]}
            </a>
          )}
          <a
            href={`mailto:${estimate.client_email}`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
          {estimate.client_phone && (
            <span className="ml-auto text-sm text-gray-500">{estimate.client_phone}</span>
          )}
        </div>
      )}

      {/* Main Row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full text-left p-5 sm:p-6 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900">
                {estimate.client_name}
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${
                  ESTIMATE_STATUS_COLORS[estimate.status]
                }`}
              >
                {estimate.status === "new" && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                  </span>
                )}
                {STATUS_LABELS[estimate.status]}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-600">{projectTypeLabel}</p>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <a
                href={`mailto:${estimate.client_email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-blue-600 transition-colors underline-offset-2 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                {estimate.client_email}
              </a>
              {estimate.client_phone && (
                <a
                  href={`tel:${estimate.client_phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors underline-offset-2 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {estimate.client_phone}
                </a>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              {estimate.square_footage && (
                <span className="text-gray-500">
                  {estimate.square_footage.toLocaleString()} sq ft
                </span>
              )}
              {estimate.budget_range && (
                <span className="text-gray-500">{estimate.budget_range}</span>
              )}
              {estimate.timeline && (
                <span className="text-gray-500">{estimate.timeline}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {estimate.estimated_min != null && estimate.estimated_max != null ? (
              <p className="text-lg font-bold text-gray-900">
                {fmt(estimate.estimated_min)} &ndash; {fmt(estimate.estimated_max)}
              </p>
            ) : estimate.budget_range ? (
              <p className="text-base font-semibold text-gray-700">
                {estimate.budget_range}
              </p>
            ) : null}
            <p
              className="text-xs text-gray-400"
              title={fullDate(estimate.created_at)}
            >
              {relativeTime(estimate.created_at)}
            </p>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Last note preview (collapsed) */}
        {!expanded && lastNote && (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-1.5 line-clamp-1">
            <span className="font-medium">Note:</span> {lastNote}
          </p>
        )}

        {/* Description preview (collapsed) */}
        {!expanded && estimate.description && !lastNote && (
          <p className="mt-3 text-sm text-gray-500 line-clamp-2">
            {estimate.description}
          </p>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 pb-5 sm:px-6 sm:pb-6">
          {/* Full Description */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Description
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {estimate.description}
            </p>
          </div>

          {/* Address */}
          {hasAddress && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Location
              </h4>
              <p className="flex items-center gap-1.5 text-sm text-gray-700">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {[estimate.address, estimate.city, estimate.state, estimate.zip]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="mt-4">
            <label
              htmlFor={notesId}
              className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
            >
              Internal Notes
            </label>
            <textarea
              id={notesId}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes... e.g. &quot;Called 3/27, scheduling site visit Friday&quot;"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={saving}
              aria-label="Save internal notes"
              className="mt-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            {estimate.status !== "converted" && estimate.status !== "declined" && (
              <>
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={actionLoading !== null}
                  aria-label="Convert estimate to project"
                  className="flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "convert" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRightCircle className="h-4 w-4" />
                  )}
                  Convert to Project
                </button>

                {estimate.status === "new" && (
                  <button
                    type="button"
                    onClick={handleMarkReviewed}
                    disabled={actionLoading !== null}
                    aria-label="Mark estimate as contacted"
                    className="flex min-h-[44px] items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2.5 text-sm font-semibold text-yellow-800 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "reviewed" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark Contacted
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={actionLoading !== null}
                  aria-label="Decline this estimate"
                  className="flex min-h-[44px] items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {actionLoading === "declined" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Decline
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleDelete}
              disabled={actionLoading !== null}
              aria-label="Delete this estimate permanently"
              className="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
            >
              {actionLoading === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Map estimate project_type values to the Project.project_type enum */
function mapEstimateToProjectType(
  estimateType: string
): "residential" | "commercial" | "renovation" | "interior_design" | "other" {
  const map: Record<string, "residential" | "commercial" | "renovation" | "interior_design" | "other"> = {
    new_home: "residential",
    kitchen_remodel: "renovation",
    bathroom_remodel: "renovation",
    addition: "residential",
    deck_patio: "residential",
    garage: "residential",
    commercial_buildout: "commercial",
    interior_design: "interior_design",
    whole_home_renovation: "renovation",
    other: "other",
  };
  return map[estimateType] || "other";
}
