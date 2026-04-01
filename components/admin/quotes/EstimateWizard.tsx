"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Check } from "lucide-react";
import toast from "react-hot-toast";
import type { JobTypeSlug, EstimateStage } from "@/lib/types/quotes";
import { JOB_TYPE_LABELS, ESTIMATE_STAGE_LABELS } from "@/lib/types/quotes";
import { JOB_TYPE_CONFIGS, PRICING_CONTROLS_SECTION } from "@/lib/quote-builder/templates";
import { JobTypeSelector } from "@/components/admin/quotes/JobTypeSelector";
import { EstimateStageSelector } from "@/components/admin/quotes/EstimateStageSelector";
import { UniversalIntakeForm } from "@/components/admin/quotes/UniversalIntakeForm";
import { DynamicSectionRenderer } from "@/components/admin/quotes/DynamicSectionRenderer";
import { PricingControlsForm } from "@/components/admin/quotes/PricingControlsForm";
import { RiskFlagPanel } from "@/components/admin/quotes/RiskFlagPanel";
import { evaluateRules } from "@/lib/quote-builder/rules";
import type { Quote } from "@/lib/types/quotes";

const STEPS = [
  { number: 1, label: "Job Type" },
  { number: 2, label: "Estimate Stage" },
  { number: 3, label: "Project Info" },
  { number: 4, label: "Job Details" },
  { number: 5, label: "Pricing" },
  { number: 6, label: "Review & Save" },
];

function getDefaultPricingValues(): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of PRICING_CONTROLS_SECTION.fields) {
    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue;
    }
  }
  return defaults;
}

export function EstimateWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({
    ...getDefaultPricingValues(),
  });

  const jobType = formData.job_type_slug as JobTypeSlug | undefined;
  const estimateStage = formData.estimate_stage as EstimateStage | undefined;

  const handleChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleJobTypeSelect = (slug: JobTypeSlug) => {
    setFormData((prev) => ({ ...prev, job_type_slug: slug }));
  };

  const handleStageSelect = (stage: EstimateStage) => {
    setFormData((prev) => ({ ...prev, estimate_stage: stage }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!jobType;
      case 2:
        return !!estimateStage;
      case 3:
        return !!formData.client_name && !!formData.project_name;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
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
      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

  // Build a partial Quote-like object for rule evaluation on the review step
  const buildPartialQuote = (): Quote => {
    return {
      id: "",
      quote_number: "",
      project_id: null,
      job_type_slug: jobType ?? "new_construction",
      template_id: null,
      estimate_stage: estimateStage ?? "ballpark",
      status: "draft",
      client_name: (formData.client_name as string) ?? "",
      client_email: (formData.client_email as string) ?? null,
      client_phone: (formData.client_phone as string) ?? null,
      project_name: (formData.project_name as string) ?? "",
      address: (formData.address as string) ?? null,
      city: (formData.city as string) ?? null,
      county: (formData.county as string) ?? null,
      state: (formData.state as string) ?? null,
      zip: (formData.zip as string) ?? null,
      parcel_lot_info: (formData.parcel_lot_info as string) ?? null,
      occupied_or_vacant: (formData.occupied_or_vacant as Quote["occupied_or_vacant"]) ?? null,
      financing_required: (formData.financing_required as boolean) ?? null,
      target_start_date: (formData.target_start_date as string) ?? null,
      desired_completion_date: (formData.desired_completion_date as string) ?? null,
      plans_available: (formData.plans_available as Quote["plans_available"]) ?? null,
      engineering_available: (formData.engineering_available as Quote["engineering_available"]) ?? null,
      permit_status: (formData.permit_status as Quote["permit_status"]) ?? null,
      utilities_status: (formData.utilities_status as Quote["utilities_status"]) ?? null,
      owner_supplied_materials: (formData.owner_supplied_materials as string) ?? null,
      scope_summary: (formData.scope_summary as string) ?? null,
      included_scope: (formData.included_scope as string) ?? null,
      excluded_scope: (formData.excluded_scope as string) ?? null,
      notes: (formData.notes as string) ?? null,
      labor_burden_pct: (formData.labor_burden_pct as number) ?? 0,
      overhead_pct: (formData.overhead_pct as number) ?? 10,
      profit_pct: (formData.profit_pct as number) ?? 10,
      contingency_pct: (formData.contingency_pct as number) ?? 5,
      sales_tax_pct: (formData.sales_tax_pct as number) ?? 0,
      permit_allowance: (formData.permit_allowance as number) ?? 0,
      dumpster_allowance: (formData.dumpster_allowance as number) ?? 0,
      equipment_allowance: (formData.equipment_allowance as number) ?? 0,
      cleanup_allowance: (formData.cleanup_allowance as number) ?? 0,
      subtotal: 0,
      total_materials: 0,
      total_labor: 0,
      total_subcontractor: 0,
      total_equipment: 0,
      overhead_amount: 0,
      profit_amount: 0,
      contingency_amount: 0,
      tax_amount: 0,
      grand_total: 0,
      valid_through_date: null,
      payment_schedule: null,
      change_order_language: null,
      job_type_inputs: formData,
      revision_number: 0,
      parent_quote_id: null,
      created_by: null,
      created_at: "",
      updated_at: "",
    };
  };

  const ruleResult = currentStep === 6 ? evaluateRules(buildPartialQuote()) : null;

  const jobTypeConfig = jobType ? JOB_TYPE_CONFIGS[jobType] : null;

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
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Select Job Type
            </h2>
            <p className="text-sm text-gray-500">
              Choose the type of construction project for this estimate.
            </p>
            <JobTypeSelector
              selected={jobType ?? null}
              onSelect={handleJobTypeSelect}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Estimate Stage
            </h2>
            <p className="text-sm text-gray-500">
              Select the level of detail for this estimate.
            </p>
            <EstimateStageSelector
              selected={estimateStage ?? null}
              onSelect={handleStageSelect}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Project Information
            </h2>
            <p className="text-sm text-gray-500">
              Enter client and project details.
            </p>
            <UniversalIntakeForm
              formData={formData}
              onChange={handleChange}
            />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Job-Type Details
            </h2>
            <p className="text-sm text-gray-500">
              Fill in details specific to this job type.
            </p>
            {jobTypeConfig ? (
              <div className="space-y-6">
                {jobTypeConfig.sections.map((section) => (
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

        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pricing Controls
            </h2>
            <p className="text-sm text-gray-500">
              Set markup percentages and allowance amounts.
            </p>
            <PricingControlsForm
              formData={formData}
              onChange={handleChange}
            />
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Review & Save
            </h2>
            <p className="text-sm text-gray-500">
              Review your quote details before saving.
            </p>

            {/* Risk flags */}
            {ruleResult && ruleResult.riskFlags.length > 0 && (
              <RiskFlagPanel flags={ruleResult.riskFlags} />
            )}

            {/* Warnings */}
            {ruleResult && ruleResult.warnings.length > 0 && (
              <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Warnings
                </h4>
                <ul className="space-y-1">
                  {ruleResult.warnings.map((warning, i) => (
                    <li key={i} className="text-sm text-yellow-700">
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                </dl>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Estimate
                </h4>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Job Type</dt>
                    <dd className="text-gray-900 font-medium">
                      {jobType ? JOB_TYPE_LABELS[jobType] : "--"}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Stage</dt>
                    <dd className="text-gray-900 font-medium">
                      {estimateStage
                        ? ESTIMATE_STAGE_LABELS[estimateStage]
                        : "--"}
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Overhead</dt>
                    <dd className="text-gray-900">
                      {String(formData.overhead_pct ?? 0)}%
                    </dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">Profit</dt>
                    <dd className="text-gray-900">
                      {String(formData.profit_pct ?? 0)}%
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
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
