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
import {
  type Estimate,
  type EstimateStatus,
  ESTIMATE_STATUS_COLORS,
  PROJECT_TYPE_OPTIONS,
} from "@/lib/types/database";

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const STATUS_LABELS: Record<EstimateStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  converted: "Converted",
  declined: "Declined",
};

interface EstimateCardProps {
  estimate: Estimate;
  onUpdate: () => void;
}

export default function EstimateCard({ estimate, onUpdate }: EstimateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(estimate.notes || "");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
      alert("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDecline() {
    setActionLoading("declined");
    try {
      await patchEstimate({ status: "declined" });
      onUpdate();
    } catch {
      alert("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConvert() {
    setActionLoading("convert");
    try {
      // Create a project from the estimate data
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
        estimated_value: estimate.estimated_max || null,
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

      onUpdate();
    } catch {
      alert("Failed to convert estimate to project");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await patchEstimate({ notes });
    } catch {
      alert("Failed to save notes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this estimate?")) return;
    setActionLoading("delete");
    try {
      const res = await fetch(`/api/admin/estimates/${estimate.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      onUpdate();
    } catch {
      alert("Failed to delete estimate");
    } finally {
      setActionLoading(null);
    }
  }

  const hasAddress = estimate.address || estimate.city || estimate.state;

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
      {/* Main Row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 sm:p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {estimate.client_name}
              </h3>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  ESTIMATE_STATUS_COLORS[estimate.status]
                }`}
              >
                {STATUS_LABELS[estimate.status]}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-600">{projectTypeLabel}</p>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <a
                href={`mailto:${estimate.client_email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 hover:text-gray-900 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                {estimate.client_email}
              </a>
              {estimate.client_phone && (
                <a
                  href={`tel:${estimate.client_phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 hover:text-gray-900 transition-colors"
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
              <p className="text-sm font-semibold text-gray-900">
                {fmt(estimate.estimated_min)} &ndash; {fmt(estimate.estimated_max)}
              </p>
            ) : estimate.budget_range ? (
              <p className="text-sm font-medium text-gray-700">
                {estimate.budget_range}
              </p>
            ) : null}
            <p className="text-xs text-gray-400">
              {new Date(estimate.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* Description preview (collapsed) */}
        {!expanded && estimate.description && (
          <p className="mt-3 text-sm text-gray-500 line-clamp-2">
            {estimate.description}
          </p>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 sm:px-6 sm:pb-6">
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
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Internal Notes
            </h4>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this estimate..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            {estimate.status !== "converted" && estimate.status !== "declined" && (
              <>
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                    className="flex items-center gap-2 rounded-lg bg-yellow-100 px-4 py-2.5 text-sm font-semibold text-yellow-800 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === "reviewed" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Mark Reviewed
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={actionLoading !== null}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
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
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 ml-auto"
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
