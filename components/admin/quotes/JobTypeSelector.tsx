"use client";

import { cn } from "@/lib/utils";
import {
  Building2,
  AlertTriangle,
  PlusSquare,
  Hammer,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { JobTypeSlug } from "@/lib/types/quotes";
import { JOB_TYPE_LABELS } from "@/lib/types/quotes";
import type { LucideIcon } from "lucide-react";

interface JobTypeSelectorProps {
  selected: JobTypeSlug | null;
  onSelect: (slug: JobTypeSlug) => void;
}

const JOB_TYPE_ICON_MAP: Record<JobTypeSlug, LucideIcon> = {
  new_construction: Building2,
  takeover: AlertTriangle,
  addition: PlusSquare,
  remodel: Hammer,
  shop_storage: Warehouse,
  repair_punch: Wrench,
};

const JOB_TYPE_DESCRIPTIONS: Record<JobTypeSlug, string> = {
  new_construction: "Ground-up build from raw land through final finishes",
  takeover: "Resume a project started by another builder",
  addition: "Expand an existing structure with new square footage",
  remodel: "Renovate or reconfigure existing interior/exterior spaces",
  shop_storage: "Detached shop, garage, or storage building",
  repair_punch: "Small repairs, punch lists, or finish-out work",
};

const JOB_TYPES: JobTypeSlug[] = [
  "new_construction",
  "takeover",
  "addition",
  "remodel",
  "shop_storage",
  "repair_punch",
];

export function JobTypeSelector({ selected, onSelect }: JobTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {JOB_TYPES.map((slug) => {
        const Icon = JOB_TYPE_ICON_MAP[slug];
        const isSelected = selected === slug;

        return (
          <button
            key={slug}
            type="button"
            onClick={() => onSelect(slug)}
            className={cn(
              "bg-white rounded-lg border p-6 text-left transition-all hover:shadow-md cursor-pointer",
              isSelected
                ? "border-black ring-2 ring-black shadow-sm"
                : "border-gray-200 shadow-sm hover:border-gray-400"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  isSelected
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">
                  {JOB_TYPE_LABELS[slug]}
                </h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {JOB_TYPE_DESCRIPTIONS[slug]}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
