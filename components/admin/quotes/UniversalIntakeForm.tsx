"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DynamicSectionRenderer } from "@/components/admin/quotes/DynamicSectionRenderer";
import { UNIVERSAL_INTAKE_SECTIONS } from "@/lib/quote-builder/templates";

interface UniversalIntakeFormProps {
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function UniversalIntakeForm({
  formData,
  onChange,
}: UniversalIntakeFormProps) {
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  return (
    <div className="space-y-6">
      {UNIVERSAL_INTAKE_SECTIONS.map((section) => {
        const isCollapsed = collapsedSections[section.id] ?? false;

        return (
          <div
            key={section.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <h3 className="text-base font-semibold text-gray-900">
                {section.title}
              </h3>
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <div
              className={cn(
                "px-6 pb-6 transition-all",
                isCollapsed && "hidden"
              )}
            >
              <DynamicSectionRenderer
                section={section}
                formData={formData}
                onChange={onChange}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
