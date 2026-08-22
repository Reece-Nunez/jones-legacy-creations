"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { FinishLevel } from "@/lib/types/database";
import { FINISH_LEVEL_LABELS, PROJECT_TYPE_LABELS } from "@/lib/types/database";
import { PROPERTY_FIELD_LABELS } from "@/components/admin/project/shared/propertyFields";

export function PermitExtractionModal({
  extractedData,
  onConfirm,
  onCancel,
}: {
  extractedData: Record<string, unknown>;
  onConfirm: (selected: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(extractedData)) {
      initial[key] = true;
    }
    return initial;
  });

  function handleConfirm() {
    const result: Record<string, unknown> = {};
    for (const [key, checked] of Object.entries(selected)) {
      if (checked) {
        result[key] = extractedData[key];
      }
    }
    onConfirm(result);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              AI Extracted Property Details
            </h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            The following details were extracted from the permit. Uncheck any you don&apos;t want to save.
          </p>
        </div>
        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {Object.entries(extractedData).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected[key] ?? true}
                onChange={(e) =>
                  setSelected({ ...selected, [key]: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {PROPERTY_FIELD_LABELS[key] || key}
                </p>
                <p className="text-sm text-gray-600">
                  {key === "finish_level"
                    ? FINISH_LEVEL_LABELS[value as FinishLevel] ?? String(value)
                    : key === "project_type"
                      ? PROJECT_TYPE_LABELS[value as keyof typeof PROJECT_TYPE_LABELS] ?? String(value)
                      : String(value)}
                </p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-4 py-2 min-h-[44px] rounded-lg hover:bg-indigo-500 cursor-pointer transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Save Selected
          </button>
        </div>
      </div>
    </div>
  );
}
