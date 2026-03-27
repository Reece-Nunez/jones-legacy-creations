"use client";

import { useState } from "react";
import {
  Home,
  PlusSquare,
  Fence,
  Warehouse,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  PROJECT_TYPE_OPTIONS,
  BUDGET_RANGES,
  TIMELINE_OPTIONS,
} from "@/lib/types/database";
import { formatPhoneNumber, formatNumber, unformatNumber } from "@/lib/formatters";

// ── Icon map for project types ──────────────────────────────
const PROJECT_TYPE_ICONS: Record<string, React.ElementType> = {
  new_home: Home,
  addition: PlusSquare,
  deck_patio: Fence,
  garage: Warehouse,
  other: HelpCircle,
};

const STEP_LABELS = ["Project Type", "Details", "Contact", "Your Estimate"];

const BEDROOM_OPTIONS = ["1", "2", "3", "4", "5+"];
const BATHROOM_OPTIONS = ["1", "1.5", "2", "2.5", "3", "3.5", "4+"];

const FINISH_LEVELS = [
  { value: "Budget", description: "Basic materials, cost-effective" },
  { value: "Standard", description: "Quality materials, typical finishes" },
  { value: "Mid-Range", description: "Upgraded materials, nicer finishes" },
  { value: "High-End", description: "Premium materials, custom details" },
];

const FLOORING_OPTIONS = ["No preference", "Carpet", "LVP/Vinyl", "Tile", "Hardwood"];
const COUNTERTOP_OPTIONS = ["No preference", "Laminate", "Quartz", "Granite", "Marble"];
const CABINET_OPTIONS = ["No preference", "Stock", "Semi-Custom", "Custom"];

const SHOWS_BEDROOMS_BATHROOMS = ["new_home", "addition"];

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

  // Step 2 — new fields
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [finishLevel, setFinishLevel] = useState("");
  const [flooringPref, setFlooringPref] = useState("");
  const [countertopPref, setCountertopPref] = useState("");
  const [cabinetPref, setCabinetPref] = useState("");
  const [showMaterials, setShowMaterials] = useState(false);

  // Step 3
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // AI estimate results
  const [aiEstimate, setAiEstimate] = useState<{
    min: number;
    max: number;
    breakdown: string;
  } | null>(null);

  // Validation
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [emailTouched, setEmailTouched] = useState(false);

  function validateEmail(email: string): string | null {
    if (!email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email";
    return null;
  }

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
      const emailError = validateEmail(clientEmail);
      if (emailError) errors.clientEmail = emailError;
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
          square_footage: squareFootage ? parseInt(unformatNumber(squareFootage)) || null : null,
          budget_range: budgetRange || null,
          timeline: timeline || null,
          bedrooms: bedrooms || null,
          bathrooms: bathrooms || null,
          finish_level: finishLevel || null,
          flooring_preference: flooringPref || null,
          countertop_preference: countertopPref || null,
          cabinet_preference: cabinetPref || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setAiEstimate({
        min: data.ai_estimate_min || data.estimated_min,
        max: data.ai_estimate_max || data.estimated_max,
        breakdown: data.ai_breakdown || "",
      });
      setSubmitted(true);
    } catch {
      setError("Unable to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Inline email validation on change
  function handleEmailChange(value: string) {
    setClientEmail(value);
    if (emailTouched) {
      const emailError = validateEmail(value);
      if (emailError && value.trim()) {
        setStepErrors((prev) => ({ ...prev, clientEmail: emailError }));
      } else {
        const next = { ...stepErrors };
        delete next.clientEmail;
        setStepErrors(next);
      }
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
        <p className="text-lg text-gray-700 mb-8">
          Thank you, {clientName}. We&apos;ve received your estimate request and
          will follow up within 1-2 business days with a detailed quote.
        </p>
        {aiEstimate && aiEstimate.min > 0 && aiEstimate.max > 0 && (
          <>
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 border border-blue-200 p-8 mb-4 shadow-lg">
              <p className="text-sm font-medium text-blue-700 uppercase tracking-wide mb-2">
                Rough Estimated Range
              </p>
              <p className="text-4xl font-bold text-gray-900">
                {fmt(aiEstimate.min)} &mdash; {fmt(aiEstimate.max)}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-5 py-3 mb-6 text-left">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Important:</strong> This is a rough estimate generated by AI based on the information you provided and current Southern Utah market data. Actual project costs can vary significantly depending on site conditions, material selections, design complexity, permitting requirements, and other factors. This estimate is not a quote or commitment. A member of our team will follow up with a detailed, personalized quote.
              </p>
            </div>
            {aiEstimate.breakdown && (
              <div className="rounded-xl bg-white border border-gray-200 p-6 mb-8 shadow-sm text-left">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Estimate Breakdown
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {aiEstimate.breakdown}
                </p>
              </div>
            )}
          </>
        )}
        <a
          href="/"
          className="inline-block rounded-full bg-black px-8 py-3.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Back to Home
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* ── Progress Bar ─────────────────────────────────────── */}
      <div className="mb-10" role="navigation" aria-label="Estimate form progress">
        <div className="flex items-center justify-between mb-3">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isComplete = step > stepNum;
            return (
              <div
                key={label}
                className="flex flex-col items-center flex-1"
                aria-label={`Step ${stepNum} of 4: ${label}`}
                aria-current={isActive ? "step" : undefined}
              >
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
                    isActive ? "text-gray-900" : "text-gray-500"
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
            className="absolute left-0 top-0 h-full rounded-full bg-black transition-all duration-500 ease-in-out"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* ── Step container with fade transition ──────────────── */}
      <div className="transition-opacity duration-300 ease-in-out">

      {/* ── Step 1: Project Type ─────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            What type of project?
          </h2>
          <p className="text-gray-600 mb-8">
            Select the option that best describes your project.
          </p>

          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
            role="radiogroup"
            aria-label="Project type selection"
          >
            {PROJECT_TYPE_OPTIONS.map((opt) => {
              const Icon = PROJECT_TYPE_ICONS[opt.value] || HelpCircle;
              const selected = projectType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setProjectType(opt.value);
                    setStepErrors({});
                  }}
                  className={`group flex flex-col items-center gap-3 rounded-xl p-6 min-h-[80px] text-center transition-all ${
                    selected
                      ? "border-2 border-blue-600 bg-blue-50 shadow-md"
                      : "border-2 border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                      selected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <span
                    className={`text-sm font-medium leading-tight ${
                      selected ? "text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {stepErrors.projectType && (
            <p className="mt-4 text-sm text-red-600" role="alert">{stepErrors.projectType}</p>
          )}
        </div>
      )}

      {/* ── Step 2: Project Details ──────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tell us about your project
          </h2>
          <p className="text-gray-600 mb-8">
            The more detail you provide, the more accurate your estimate will be.
          </p>

          <div className="space-y-6">
            {/* Square Footage */}
            <div>
              <label htmlFor="squareFootage" className="block text-sm font-medium text-gray-700 mb-1.5">
                Approximate Square Footage
              </label>
              <input
                id="squareFootage"
                type="text"
                inputMode="numeric"
                value={squareFootage ? formatNumber(squareFootage) : ""}
                onChange={(e) => setSquareFootage(unformatNumber(e.target.value))}
                placeholder="e.g. 2,500"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                Used to calculate your cost estimate. Leave blank if unsure.
              </p>
            </div>

            {/* Bedrooms & Bathrooms — only for applicable project types */}
            {SHOWS_BEDROOMS_BATHROOMS.includes(projectType) && (
              <>
                <div>
                  <label id="bedroomsLabel" className="block text-sm font-medium text-gray-700 mb-3">
                    Bedrooms
                  </label>
                  <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-labelledby="bedroomsLabel"
                  >
                    {BEDROOM_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={bedrooms === opt}
                        onClick={() => setBedrooms(opt)}
                        className={`rounded-lg border min-h-[44px] min-w-[52px] px-4 py-3 text-sm font-medium transition-all ${
                          bedrooms === opt
                            ? "border-2 border-blue-600 bg-blue-50 text-gray-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label id="bathroomsLabel" className="block text-sm font-medium text-gray-700 mb-3">
                    Bathrooms
                  </label>
                  <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-labelledby="bathroomsLabel"
                  >
                    {BATHROOM_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={bathrooms === opt}
                        onClick={() => setBathrooms(opt)}
                        className={`rounded-lg border min-h-[44px] min-w-[52px] px-4 py-3 text-sm font-medium transition-all ${
                          bathrooms === opt
                            ? "border-2 border-blue-600 bg-blue-50 text-gray-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Finish Level */}
            <div>
              <label id="finishLevelLabel" className="block text-sm font-medium text-gray-700 mb-3">
                Finish Level
              </label>
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                role="radiogroup"
                aria-labelledby="finishLevelLabel"
              >
                {FINISH_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    role="radio"
                    aria-checked={finishLevel === level.value}
                    onClick={() => setFinishLevel(level.value)}
                    className={`rounded-lg border min-h-[44px] px-4 py-3 text-left transition-all ${
                      finishLevel === level.value
                        ? "border-2 border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <span className={`block text-sm font-medium ${
                      finishLevel === level.value ? "text-gray-900" : "text-gray-700"
                    }`}>
                      {level.value}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {level.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                Project Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="city" className="sr-only">City</label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="sr-only">State</label>
                  <input
                    id="state"
                    type="text"
                    value="UT"
                    readOnly
                    disabled
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label htmlFor="zip" className="sr-only">ZIP Code</label>
                  <input
                    id="zip"
                    type="text"
                    inputMode="numeric"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="ZIP"
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            </div>

            {/* Budget Range */}
            <div>
              <label id="budgetRangeLabel" className="block text-sm font-medium text-gray-700 mb-3">
                Budget Range
              </label>
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-labelledby="budgetRangeLabel"
              >
                {BUDGET_RANGES.map((range) => (
                  <button
                    key={range}
                    type="button"
                    role="radio"
                    aria-checked={budgetRange === range}
                    onClick={() => setBudgetRange(range)}
                    className={`rounded-lg border min-h-[44px] px-4 py-3 text-sm font-medium transition-all ${
                      budgetRange === range
                        ? "border-2 border-blue-600 bg-blue-50 text-gray-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label id="timelineLabel" className="block text-sm font-medium text-gray-700 mb-3">
                Desired Timeline
              </label>
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-labelledby="timelineLabel"
              >
                {TIMELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={timeline === opt}
                    onClick={() => setTimeline(opt)}
                    className={`rounded-lg border min-h-[44px] px-4 py-3 text-sm font-medium transition-all ${
                      timeline === opt
                        ? "border-2 border-blue-600 bg-blue-50 text-gray-900"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Preferences — collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowMaterials(!showMaterials)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showMaterials ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Customize Materials (optional)
              </button>

              {showMaterials && (
                <div className="mt-4 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div>
                    <label htmlFor="flooringPref" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Flooring
                    </label>
                    <select
                      id="flooringPref"
                      value={flooringPref}
                      onChange={(e) => setFlooringPref(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select...</option>
                      {FLOORING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="countertopPref" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Countertops
                    </label>
                    <select
                      id="countertopPref"
                      value={countertopPref}
                      onChange={(e) => setCountertopPref(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select...</option>
                      {COUNTERTOP_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cabinetPref" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Cabinets
                    </label>
                    <select
                      id="cabinetPref"
                      value={cabinetPref}
                      onChange={(e) => setCabinetPref(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select...</option>
                      {CABINET_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Tell us about your project <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                rows={4}
                aria-required="true"
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
                <p className="mt-1 text-sm text-red-600" role="alert">{stepErrors.description}</p>
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
          <p className="text-gray-600 mb-8">
            We&apos;ll use this to send you a detailed quote.
          </p>

          <div className="space-y-6">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="clientName"
                type="text"
                aria-required="true"
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
                <p className="mt-1 text-sm text-red-600" role="alert">{stepErrors.clientName}</p>
              )}
            </div>

            <div>
              <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="clientEmail"
                type="email"
                inputMode="email"
                aria-required="true"
                value={clientEmail}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="john@example.com"
                className={`w-full rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 ${
                  stepErrors.clientEmail
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
              />
              {stepErrors.clientEmail && (
                <p className="mt-1 text-sm text-red-600" role="alert">{stepErrors.clientEmail}</p>
              )}
            </div>

            <div>
              <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
                <span className="ml-1 text-xs text-gray-500">(recommended)</span>
              </label>
              <input
                id="clientPhone"
                type="text"
                inputMode="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(formatPhoneNumber(e.target.value))}
                placeholder="(435) 555-0100"
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
            Ready to get your AI-powered estimate!
          </h2>
          <p className="text-gray-600 mb-8">
            Review your details below, then submit to receive an instant estimate powered by AI.
          </p>

          {/* Summary */}
          <div className="rounded-xl bg-white border border-gray-200 p-6 mb-8 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Request Summary
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Project Type</dt>
                <dd className="font-medium text-gray-900">
                  {PROJECT_TYPE_OPTIONS.find((o) => o.value === projectType)?.label}
                </dd>
              </div>
              {squareFootage && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Square Footage</dt>
                  <dd className="font-medium text-gray-900">
                    {Number(squareFootage).toLocaleString()} sq ft
                  </dd>
                </div>
              )}
              {bedrooms && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Bedrooms</dt>
                  <dd className="font-medium text-gray-900">{bedrooms}</dd>
                </div>
              )}
              {bathrooms && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Bathrooms</dt>
                  <dd className="font-medium text-gray-900">{bathrooms}</dd>
                </div>
              )}
              {finishLevel && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Finish Level</dt>
                  <dd className="font-medium text-gray-900">{finishLevel}</dd>
                </div>
              )}
              {budgetRange && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Budget</dt>
                  <dd className="font-medium text-gray-900">{budgetRange}</dd>
                </div>
              )}
              {timeline && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Timeline</dt>
                  <dd className="font-medium text-gray-900">{timeline}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">Name</dt>
                <dd className="font-medium text-gray-900">{clientName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Email</dt>
                <dd className="font-medium text-gray-900">{clientEmail}</dd>
              </div>
              {clientPhone && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Phone</dt>
                  <dd className="font-medium text-gray-900">{clientPhone}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 mb-8">
            <p className="text-sm text-amber-800">
              <strong>Please note:</strong> You will receive a rough estimated cost range based on
              current Southern Utah market data. This is not a quote — actual project costs can vary
              significantly based on site conditions, material selections, design complexity, and other factors.
              A member of our team will follow up with a detailed, personalized quote.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6" role="alert">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Our AI is analyzing your project...
              </>
            ) : (
              "Get My AI Estimate"
            )}
          </button>
        </div>
      )}

      </div>{/* end fade transition wrapper */}

      {/* ── Navigation Buttons ───────────────────────────────── */}
      {step < 4 && (
        <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center gap-2 rounded-full border border-gray-300 w-full sm:w-auto px-6 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
            className="flex items-center justify-center gap-2 rounded-full bg-blue-600 w-full sm:w-auto px-8 py-3.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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
