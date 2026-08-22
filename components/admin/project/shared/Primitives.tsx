"use client";

import { Plus } from "lucide-react";
import { useCanEditProject } from "./EditContext";

/** Small presentational pieces shared across the project detail tabs. */

export function AddButton({
  label,
  onClick,
  alwaysShow = false,
}: {
  label: string;
  onClick: () => void;
  /** Keep visible even in read-only mode (e.g. the contractor doc upload). */
  alwaysShow?: boolean;
}) {
  const canEdit = useCanEditProject();
  if (!canEdit && !alwaysShow) return null;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-black cursor-pointer min-h-[44px] px-2 transition-colors"
    >
      <Plus className="w-4 h-4" /> {label}
    </button>
  );
}

/**
 * Empty state for a tab with no rows.
 *
 * `hint` exists because several of these features are new and have no data
 * yet: Tasks, Selections and Bid Requests are all at zero. "No tasks yet"
 * tells someone the table is empty, which they can already see; it doesn't
 * tell them what the feature is for or why they'd start using it. Pass a hint
 * wherever the answer isn't obvious from the tab name alone.
 *
 * `icon` is a component, so it can only be passed from another client
 * component. That fails at runtime rather than at build time; every
 * current caller is a client component.
 */
export function EmptyState({
  label,
  icon: Icon,
  hint,
}: {
  label: string;
  icon?: React.ElementType;
  hint?: string;
}) {
  if (!hint && !Icon) {
    return <p className="text-sm text-gray-500 text-center py-8">{label}</p>;
  }
  return (
    <div className="text-center py-10 px-6">
      {Icon && <Icon className="w-8 h-8 text-gray-300 mx-auto mb-3" />}
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {hint && (
        <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
