"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import toast from "react-hot-toast";
import type { JobTypeSlug } from "@/lib/types/quotes";
import { JOB_TYPE_LABELS } from "@/lib/types/quotes";
import { JOB_TYPE_CONFIGS } from "@/lib/quote-builder/templates";
import { JobTypeSelector } from "@/components/admin/quotes/JobTypeSelector";
import { DynamicSectionRenderer } from "@/components/admin/quotes/DynamicSectionRenderer";
import { SimpleQuoteEditor, type SimpleQuoteItem } from "@/components/admin/quotes/SimpleQuoteEditor";

// Sections to exclude from Job Details per job type
const EXCLUDED_SECTIONS: Record<string, string[]> = {
  new_construction: ["compliance", "fire_suppression_compliance"],
  takeover: [],
  addition: [],
  remodel: [],
  shop_storage: [],
  repair_punch: [],
};

// Fields to exclude from Job Details
const EXCLUDED_FIELDS = new Set(["slope_grading_difficulty"]);

const STEPS = [
  { number: 1, label: "Job Type" },
  { number: 2, label: "Project Info" },
  { number: 3, label: "Job Details" },
  { number: 4, label: "Pricing" },
  { number: 5, label: "Review & Save" },
];

// Universal intake fields for Project Info step
const PROJECT_INFO_FIELDS = [
  { key: "client_name", label: "Client Name", type: "text" as const, required: true, placeholder: "Full name" },
  { key: "client_email", label: "Client Email", type: "text" as const, placeholder: "email@example.com" },
  { key: "client_phone", label: "Client Phone", type: "text" as const, placeholder: "(801) 555-0100" },
  { key: "project_name", label: "Project Name", type: "text" as const, required: true, placeholder: "e.g. Smith Residence" },
  { key: "address", label: "Street Address", type: "text" as const, placeholder: "123 Main St" },
  { key: "city", label: "City", type: "text" as const, placeholder: "Provo" },
  { key: "county", label: "County", type: "text" as const, placeholder: "Utah County" },
  { key: "zip", label: "ZIP Code", type: "text" as const, placeholder: "84601" },
  { key: "parcel_lot_info", label: "Parcel / Lot Info", type: "text" as const, placeholder: "Lot #, parcel ID, subdivision" },
];

const SITE_CONDITIONS_FIELDS = [
  {
    key: "occupied_or_vacant", label: "Occupied or Vacant", type: "select" as const,
    options: [
      { value: "occupied", label: "Occupied" },
      { value: "vacant", label: "Vacant" },
      { value: "partially_occupied", label: "Partially Occupied" },
    ],
  },
  { key: "financing_required", label: "Financing / Draw Schedule Required", type: "boolean" as const, helpText: "Does the client need a construction loan draw schedule?" },
  {
    key: "plans_available", label: "Plans Available", type: "select" as const,
    options: [
      { value: "yes", label: "Yes — full plan set" },
      { value: "partial", label: "Partial plans" },
      { value: "no", label: "No plans" },
    ],
  },
  {
    key: "engineering_available", label: "Engineering Available", type: "select" as const,
    options: [
      { value: "yes", label: "Yes — stamped" },
      { value: "partial", label: "Partial / unsigned" },
      { value: "no", label: "No engineering" },
    ],
  },
  {
    key: "permit_status", label: "Permit Status", type: "select" as const,
    options: [
      { value: "not_applied", label: "Not Applied" },
      { value: "applied", label: "Applied — pending" },
      { value: "approved", label: "Approved" },
      { value: "expired", label: "Expired" },
      { value: "unknown", label: "Unknown" },
    ],
  },
  {
    key: "utilities_status", label: "Utilities Status", type: "select" as const,
    options: [
      { value: "available", label: "Available at site" },
      { value: "needs_hookup", label: "Needs hookup / extension" },
      { value: "none", label: "No utilities" },
      { value: "unknown", label: "Unknown" },
    ],
  },
];

export function EstimateWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({
    state: "UT",
    estimate_stage: "ballpark",
  });
  const [simpleItems, setSimpleItems] = useState<SimpleQuoteItem[]>([]);
  const simpleItemsRef = useRef<SimpleQuoteItem[]>([]);

  const jobType = formData.job_type_slug as JobTypeSlug | undefined;

  const handleChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleJobTypeSelect = (slug: JobTypeSlug) => {
    setFormData((prev) => ({ ...prev, job_type_slug: slug }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!jobType;
      case 2:
        return !!formData.client_name && !!formData.project_name;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length && canProceed()) {
      setCurrentStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const items = simpleItemsRef.current.length > 0 ? simpleItemsRef.current : simpleItems;
      const grandTotal = items.reduce((sum, i) => sum + i.cost, 0);
      const subtotal = items.filter((i) => !i.isOwnerPurchase).reduce((sum, i) => sum + i.cost, 0);

      const payload = {
        ...formData,
        job_type_inputs: {
          ...(formData.job_type_inputs as Record<string, unknown> ?? {}),
          simple_items: items,
        },
        grand_total: grandTotal,
        subtotal,
      };

      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? "Failed to create quote");
      }

      toast.success("Quote created successfully");
      router.push("/admin/quotes");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create quote"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const jobTypeConfig = jobType ? JOB_TYPE_CONFIGS[jobType] : null;

  // Filter job detail sections: remove excluded sections and fields
  const filteredSections = jobTypeConfig
    ? jobTypeConfig.sections
        .filter((section) => {
          const excluded = EXCLUDED_SECTIONS[jobType!] ?? [];
          return !excluded.includes(section.id);
        })
        // Remove site_conditions from new_construction (only show on takeover which uses its own sections)
        .map((section) => ({
          ...section,
          fields: section.fields.filter((f) => !EXCLUDED_FIELDS.has(f.key)),
        }))
    : [];

  const tradeCosts = simpleItems.filter((i) => !i.isOwnerPurchase).reduce((s, i) => s + i.cost, 0);
  const ownerPurchases = simpleItems.filter((i) => i.isOwnerPurchase).reduce((s, i) => s + i.cost, 0);
  const grandTotal = tradeCosts + ownerPurchases;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[280px]">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    currentStep === step.number
                      ? "bg-black text-white"
                      : currentStep > step.number
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium hidden sm:inline",
                    currentStep === step.number
                      ? "text-gray-900"
                      : "text-gray-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-4 sm:w-8 lg:w-16 h-px mx-1 sm:mx-2",
                    currentStep > step.number ? "bg-green-300" : "bg-gray-200"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {/* Step 1: Job Type */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Select Job Type
            </h2>
            <p className="text-sm text-gray-500">
              Choose the type of construction project for this quote.
            </p>
            <JobTypeSelector
              selected={jobType ?? null}
              onSelect={handleJobTypeSelect}
            />
          </div>
        )}

        {/* Step 2: Project Info */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Project Information
            </h2>
            <p className="text-sm text-gray-500">
              Enter client and project details.
            </p>

            {/* Client & Project Info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Project Info
              </h3>
              <DynamicSectionRenderer
                section={{
                  id: "project_info",
                  title: "Project Info",
                  fields: PROJECT_INFO_FIELDS,
                }}
                formData={formData}
                onChange={handleChange}
              />
              {/* Locked state field */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value="Utah (UT)"
                  disabled
                  className="w-full px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Site Conditions - Takeover only */}
            {jobType === "takeover" && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Site Conditions
                </h3>
                <DynamicSectionRenderer
                  section={{
                    id: "site_conditions",
                    title: "Site Conditions",
                    fields: SITE_CONDITIONS_FIELDS,
                  }}
                  formData={formData}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Schedule */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Schedule
              </h3>
              <DynamicSectionRenderer
                section={{
                  id: "schedule",
                  title: "Schedule",
                  fields: [
                    { key: "target_start_date", label: "Target Start Date", type: "date" },
                    { key: "desired_completion_date", label: "Desired Completion Date", type: "date" },
                  ],
                }}
                formData={formData}
                onChange={handleChange}
              />
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Notes
              </h3>
              <DynamicSectionRenderer
                section={{
                  id: "notes",
                  title: "Notes",
                  fields: [
                    { key: "notes", label: "Notes", type: "textarea", placeholder: "Additional notes or special conditions" },
                  ],
                }}
                formData={formData}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {/* Step 3: Job Details */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Job Details
            </h2>
            <p className="text-sm text-gray-500">
              Fill in details specific to this {jobType ? JOB_TYPE_LABELS[jobType].toLowerCase() : "job type"}.
            </p>
            {filteredSections.length > 0 ? (
              <div className="space-y-6">
                {filteredSections.map((section) => (
                  <div
                    key={section.id}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
                  >
                    <DynamicSectionRenderer
                      section={section}
                      formData={formData}
                      onChange={handleChange}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-sm text-gray-500">
                Please select a job type in Step 1 first.
              </div>
            )}
          </div>
        )}

        {/* Step 4: Pricing Summary */}
        {currentStep === 4 && jobType && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pricing Summary
            </h2>
            <p className="text-sm text-gray-500">
              Add your trade costs and pricing. Click Save to lock in your numbers before proceeding.
            </p>
            <SimpleQuoteEditor
              quoteId="new"
              jobType={jobType}
              initialItems={simpleItems.length > 0 ? simpleItems : undefined}
              onSave={async (items) => {
                setSimpleItems(items);
                simpleItemsRef.current = items;
                toast.success("Pricing saved — proceed to review");
              }}
            />
          </div>
        )}

        {/* Step 5: Review & Save */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Review & Save
            </h2>
            <p className="text-sm text-gray-500">
              Review your quote details before saving.
            </p>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Project
                </h4>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Client</dt>
                    <dd className="text-gray-900 font-medium">
                      {(formData.client_name as string) || "--"}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Project</dt>
                    <dd className="text-gray-900 font-medium">
                      {(formData.project_name as string) || "--"}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Address</dt>
                    <dd className="text-gray-900">
                      {(formData.address as string) || "--"}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">State</dt>
                    <dd className="text-gray-900">Utah</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Quote Summary
                </h4>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Job Type</dt>
                    <dd className="text-gray-900 font-medium">
                      {jobType ? JOB_TYPE_LABELS[jobType] : "--"}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Trade Costs</dt>
                    <dd className="text-gray-900 font-medium">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(tradeCosts)}
                    </dd>
                  </div>
                  {ownerPurchases > 0 && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Owner Purchases</dt>
                      <dd className="text-gray-900 font-medium">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(ownerPurchases)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
                    <dt className="text-gray-900 font-bold">Total</dt>
                    <dd className="text-gray-900 font-bold">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(grandTotal)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Line items summary */}
            {simpleItems.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Cost Breakdown
                </h4>
                <div className="divide-y divide-gray-100">
                  {simpleItems.filter((i) => i.cost > 0).map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 text-sm">
                      <span className={cn("text-gray-700", item.isOwnerPurchase && "italic")}>
                        {item.trade}
                        {item.isOwnerPurchase && <span className="ml-2 text-xs text-gray-400">(OP)</span>}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {simpleItems.length === 0 && (
              <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                <p className="text-sm text-yellow-700">
                  No pricing items saved yet. Go back to the Pricing step and click Save to add your costs.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {currentStep > 1 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div>
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={!canProceed()}
            >
              Create Quote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
