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

export function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-gray-500 text-center py-8">{label}</p>
  );
}
