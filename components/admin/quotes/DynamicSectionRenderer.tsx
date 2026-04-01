"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { FormSectionConfig, FormFieldConfig } from "@/lib/quote-builder/templates";

interface DynamicSectionRendererProps {
  section: FormSectionConfig;
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function evaluateCondition(
  condition: FormFieldConfig["conditional"],
  formData: Record<string, unknown>
): boolean {
  if (!condition) return true;

  const currentValue = formData[condition.field];
  const operator = condition.operator ?? "eq";

  switch (operator) {
    case "eq":
      return currentValue === condition.value;
    case "neq":
      return currentValue !== condition.value;
    case "gt":
      return typeof currentValue === "number" && currentValue > (condition.value as number);
    case "lt":
      return typeof currentValue === "number" && currentValue < (condition.value as number);
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(currentValue);
    default:
      return true;
  }
}

function FieldRenderer({
  field,
  value,
  onChange,
}: {
  field: FormFieldConfig;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}) {
  const strValue = typeof value === "string" ? value : value != null ? String(value) : "";
  const numValue = typeof value === "number" ? value : undefined;
  const boolValue = typeof value === "boolean" ? value : false;

  switch (field.type) {
    case "text":
      return (
        <Input
          label={field.label}
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
        />
      );

    case "number":
      return (
        <Input
          label={field.label}
          type="number"
          value={numValue ?? ""}
          onChange={(e) =>
            onChange(field.key, e.target.value === "" ? undefined : Number(e.target.value))
          }
          placeholder={field.placeholder}
          required={field.required}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );

    case "date":
      return (
        <Input
          label={field.label}
          type="date"
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          required={field.required}
        />
      );

    case "select":
      return (
        <Select
          label={field.label}
          value={strValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          options={field.options ?? []}
          required={field.required}
        />
      );

    case "boolean":
      return (
        <div className="w-full">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={boolValue}
              onChange={(e) => onChange(field.key, e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-black focus:ring-2 focus:ring-black focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </label>
          {field.helpText && (
            <p className="mt-1 ml-8 text-xs text-gray-500">{field.helpText}</p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div className="col-span-full">
          <Textarea
            label={field.label}
            value={strValue}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        </div>
      );

    case "currency":
      return (
        <div className="w-full">
          {field.label && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              $
            </span>
            <input
              type="number"
              value={numValue ?? ""}
              onChange={(e) =>
                onChange(field.key, e.target.value === "" ? undefined : Number(e.target.value))
              }
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:border-transparent transition-all placeholder:text-gray-400"
            />
          </div>
          {field.helpText && (
            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
          )}
        </div>
      );

    case "percentage":
      return (
        <div className="w-full">
          {field.label && (
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          )}
          <div className="relative">
            <input
              type="number"
              value={numValue ?? ""}
              onChange={(e) =>
                onChange(field.key, e.target.value === "" ? undefined : Number(e.target.value))
              }
              min={field.min}
              max={field.max}
              step={field.step ?? 0.5}
              placeholder="0"
              className="w-full px-4 py-3 pr-10 text-base text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:border-transparent transition-all placeholder:text-gray-400"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              %
            </span>
          </div>
          {field.helpText && (
            <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
          )}
        </div>
      );

    case "phase_audit":
      return (
        <div className="col-span-full">
          <p className="text-sm font-medium text-gray-700 mb-2">{field.label}</p>
          <p className="text-xs text-gray-500 mb-3">
            Phase audit grid will be rendered here for takeover projects.
          </p>
        </div>
      );

    default:
      return null;
  }
}

export function DynamicSectionRenderer({
  section,
  formData,
  onChange,
}: DynamicSectionRendererProps) {
  // Check section-level conditional
  if (section.conditional && !evaluateCondition(section.conditional, formData)) {
    return null;
  }

  const visibleFields = section.fields.filter((field) =>
    evaluateCondition(field.conditional, formData)
  );

  if (visibleFields.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{section.title}</h3>
        {section.description && (
          <p className="text-sm text-gray-500 mt-1">{section.description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFields.map((field) => {
          const isFullWidth =
            field.type === "textarea" || field.type === "phase_audit";

          return (
            <div
              key={field.key}
              className={cn(isFullWidth && "col-span-full")}
            >
              <FieldRenderer
                field={field}
                value={formData[field.key]}
                onChange={onChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
