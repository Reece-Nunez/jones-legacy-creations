"use client";

import { cn } from "@/lib/utils";
import { Gauge, ClipboardList, FileCheck } from "lucide-react";
import type { EstimateStage } from "@/lib/types/quotes";
import { ESTIMATE_STAGE_LABELS } from "@/lib/types/quotes";
import type { LucideIcon } from "lucide-react";

interface EstimateStageSelectorProps {
  selected: EstimateStage | null;
  onSelect: (stage: EstimateStage) => void;
}

interface StageConfig {
  slug: EstimateStage;
  icon: LucideIcon;
  description: string;
  accuracy: string;
}

const STAGES: StageConfig[] = [
  {
    slug: "ballpark",
    icon: Gauge,
    description:
      "Rough order of magnitude. Quick turnaround for initial conversations.",
    accuracy: "\u00b130% accuracy",
  },
  {
    slug: "detailed",
    icon: ClipboardList,
    description:
      "Thorough estimate with allowances. Used for budgeting and planning.",
    accuracy: "\u00b115% accuracy",
  },
  {
    slug: "final",
    icon: FileCheck,
    description:
      "Full proposal with firm pricing. Requires all selections and vendor bids resolved.",
    accuracy: "Firm pricing",
  },
];

export function EstimateStageSelector({
  selected,
  onSelect,
}: EstimateStageSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {STAGES.map(({ slug, icon: Icon, description, accuracy }) => {
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
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center mb-4",
                isSelected
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">
              {ESTIMATE_STAGE_LABELS[slug]}
            </h3>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">
              {description}
            </p>
            <span
              className={cn(
                "mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium",
                isSelected
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {accuracy}
            </span>
          </button>
        );
      })}
    </div>
  );
}
