"use client";

import { useState } from "react";
import {
  Home,
  UtensilsCrossed,
  Bath,
  PlusSquare,
  Fence,
  Warehouse,
  Building2,
  Palette,
  Hammer,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  PROJECT_TYPE_OPTIONS,
  BUDGET_RANGES,
  TIMELINE_OPTIONS,
  COST_RANGES,
} from "@/lib/types/database";

// ── Icon map for project types ──────────────────────────────
const PROJECT_TYPE_ICONS: Record<string, React.ElementType> = {
  new_home: Home,
  kitchen_remodel: UtensilsCrossed,
  bathroom_remodel: Bath,
  addition: PlusSquare,
  deck_patio: Fence,
  garage: Warehouse,
  commercial_buildout: Building2,
  interior_design: Palette,
  whole_home_renovation: Hammer,
  other: HelpCircle,
};

const STEP_LABELS = ["Project Type", "Details", "Contact", "Your Estimate"];

const fmt = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export default function EstimateForm() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [projectType, setProjectType] = useState("");

  // Step 2
  const [squareFootage, setSquareFootage] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("UT");
  const [zip, setZip] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [description, setDescription] = useState("");

  // Step 3
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Validation
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  function validateStep(s: number): boolean {
    const errors: Record<string, string> = {};

    if (s === 1) {
      if (!projectType) errors.projectType = "Please select a project type";
    }

    if (s === 2) {
      if (!description.trim()) errors.description = "Please describe your project";
    }

    if (s === 3) {
      if (!clientName.trim()) errors.clientName = "Name is required";
      if (!clientEmail.trim()) {
        errors.clientEmail = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
        errors.clientEmail = "Please enter a valid email";
      }
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 4));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
    setStepErrors({});
  }

  // Estimate calculation
  const sqft = squareFootage ? Number(squareFootage) : null;
  const costRange = COST_RANGES[projectType] || COST_RANGES.other;
  const estimatedMin = sqft && sqft > 0 ? costRange.min * sqft : null;
  const estimatedMax = sqft && sqft > 0 ? costRange.max * sqft : null;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone || null,
          project_type: projectType,
          description,
          address: address || null,
          city: city || null,
          state: state || "UT",
          zip: zip || null,
          square_footage: sqft,
          budget_range: budgetRange || null,
          timeline: timeline || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Unable to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ──────────────────────────────────────────
  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16 px-4">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Request Submitted!
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Thank you, {clientName}. We&apos;ve received your estimate request and
          will follow up within 1-2 business days with a detailed quote.
        </p>
        {(estimatedMin != null && estimatedMax != null) && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-8 mb-8">
            <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide mb-2">
              Your Estimated Range
            </p>
            <p className="text-4xl font-bold text-gray-900">
              {fmt(estimatedMin)} &mdash; {fmt(estimatedMax)}
            </p>
          </div>
        )}
        <a
          href="/"
          className="inline-block rounded-full bg-black px-8 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* ── Progress Bar ─────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isComplete = step > stepNum;
            return (
              <div key={label} className="flex flex-col items-center flex-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    isActive
                      ? "bg-black text-white"
                      : isComplete
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium hidden sm:block ${
                    isActive ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative h-2 rounded-full bg-gray-200">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-black transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Step 1: Project Type ─────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            What type of project?
          </h2>
          <p className="text-gray-500 mb-8">
            Select the option that best describes your project.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            {PROJECT_TYPE_OPTIONS.map((opt) => {
              const Icon = PROJECT_TYPE_ICONS[opt.value] || HelpCircle;
              const selected = projectType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setProjectType(opt.value);
                    setStepErrors({});
                  }}
                  className={`group flex flex-col items-center gap-3 rounded-xl border-2 p-5 sm:p-6 text-center transition-all ${
                    selected
                      ? "border-black bg-gray-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                      selected
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`text-sm font-medium leading-tight ${
                      selected ? "text-gray-900" : "text-gray-600"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {stepErrors.projectType && (
            <p className="mt-4 text-sm text-red-600">{stepErrors.projectType}</p>
          )}
        </div>
      )}

      {/* ── Step 2: Project Details ──────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tell us about your project
          </h2>
          <p className="text-gray-500 mb-8">
            The more detail you provide, the more accurate your estimate will be.
          </p>

          <div className="space-y-6">
            {/* Square Footage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Approximate Square Footage
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={squareFootage}
                onChange={(e) => setSquareFootage(e.target.value)}
                placeholder="e.g. 2500"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-400">
                Used to calculate your cost estimate. Leave blank if unsure.
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Project Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <div className="mt-3 grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP"
                  className="rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            {/* Budget Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Budget Range
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BUDGET_RANGES.map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setBudgetRange(range)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      budgetRange === range
                        ? "border-black bg-gray-50 text-gray-900"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Desired Timeline
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TIMELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTimeline(opt)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-all ${
                      timeline === opt
                        ? "border-black bg-gray-50 text-gray-900"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tell us about your project *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (stepErrors.description) setStepErrors({});
                }}
                placeholder="What are you looking to build or renovate? Include any special requirements, materials preferences, or design ideas..."
                className={`w-full rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                  stepErrors.description
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
              />
              {stepErrors.description && (
                <p className="mt-1 text-sm text-red-600">{stepErrors.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Contact Info ──────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            How can we reach you?
          </h2>
          <p className="text-gray-500 mb-8">
            We&apos;ll use this to send you a detailed quote.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (stepErrors.clientName) {
                    const next = { ...stepErrors };
                    delete next.clientName;
                    setStepErrors(next);
                  }
                }}
                placeholder="John Smith"
                className={`w-full rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                  stepErrors.clientName
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
              />
              {stepErrors.clientName && (
                <p className="mt-1 text-sm text-red-600">{stepErrors.clientName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => {
                  setClientEmail(e.target.value);
                  if (stepErrors.clientEmail) {
                    const next = { ...stepErrors };
                    delete next.clientEmail;
                    setStepErrors(next);
                  }
                }}
                placeholder="john@example.com"
                className={`w-full rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                  stepErrors.clientEmail
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
              />
              {stepErrors.clientEmail && (
                <p className="mt-1 text-sm text-red-600">{stepErrors.clientEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
                <span className="ml-1 text-xs text-gray-400">(recommended)</span>
              </label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(435) 555-0123"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Estimate ─────────────────────────────────── */}
      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Here&apos;s what your project could cost!
          </h2>
          <p className="text-gray-500 mb-8">
            Based on the details you provided, here&apos;s a preliminary estimate.
          </p>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-8 sm:p-10 text-center mb-8">
            <p className="text-sm font-medium text-emerald-700 uppercase tracking-wide mb-3">
              Estimated Project Cost
            </p>
            {estimatedMin != null && estimatedMax != null ? (
              <p className="text-4xl sm:text-5xl font-bold text-gray-900">
                {fmt(estimatedMin)} &mdash; {fmt(estimatedMax)}
              </p>
            ) : budgetRange ? (
              <p className="text-4xl sm:text-5xl font-bold text-gray-900">
                {budgetRange}
              </p>
            ) : (
              <p className="text-2xl font-semibold text-gray-600">
                We&apos;ll provide a custom quote
              </p>
            )}
            {sqft && sqft > 0 && (
              <p className="mt-3 text-sm text-emerald-600">
                Based on {Number(squareFootage).toLocaleString()} sq ft at ${costRange.min}&ndash;${costRange.max}/sq ft
              </p>
            )}
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 mb-8">
            <p className="text-sm text-amber-800">
              <strong>Please note:</strong> This is a rough estimate. Actual costs
              depend on materials, scope, and site conditions. We&apos;ll follow up
              with a detailed quote.
            </p>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-white border border-gray-200 p-6 mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Request Summary
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Project Type</dt>
                <dd className="font-medium text-gray-900">
                  {PROJECT_TYPE_OPTIONS.find((o) => o.value === projectType)?.label}
                </dd>
              </div>
              {squareFootage && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Square Footage</dt>
                  <dd className="font-medium text-gray-900">
                    {Number(squareFootage).toLocaleString()} sq ft
                  </dd>
                </div>
              )}
              {budgetRange && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Budget</dt>
                  <dd className="font-medium text-gray-900">{budgetRange}</dd>
                </div>
              )}
              {timeline && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Timeline</dt>
                  <dd className="font-medium text-gray-900">{timeline}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900">{clientName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900">{clientEmail}</dd>
              </div>
              {clientPhone && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{clientPhone}</dd>
                </div>
              )}
            </dl>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-black px-8 py-4 text-base font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Estimate Request"
            )}
          </button>
        </div>
      )}

      {/* ── Navigation Buttons ───────────────────────────────── */}
      {step < 4 && (
        <div className="mt-10 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 rounded-full bg-black px-8 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleBack}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            &larr; Go back and edit
          </button>
        </div>
      )}
    </div>
  );
}
