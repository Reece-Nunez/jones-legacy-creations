"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { formatPhoneNumber, formatCurrencyInput, unformatCurrency } from "@/lib/formatters";
import {
  Project,
  ProjectStatus,
  ProjectType,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  FINISH_LEVEL_LABELS,
} from "@/lib/types/database";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  client_name: z.string().min(1, "Client name is required"),
  client_email: z
    .string()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional(),
  client_phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  status: z.string(),
  project_type: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
  estimated_value: z.string().optional(),
  contract_value: z.string().optional(),
  sale_price: z.string().optional(),
  lender_name: z.string().optional(),
  loan_amount: z.string().optional(),
  down_payment: z.string().optional(),
  down_payment_percent: z.string().optional(),
  interest_rate: z.string().optional(),
  origination_fee_percent: z.string().optional(),
  loan_start_date: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  square_footage: z.string().optional(),
  stories: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  garage_spaces: z.string().optional(),
  finish_level: z.string().optional(),
  lot_size: z.string().optional(),
  flooring_preference: z.string().optional(),
  countertop_preference: z.string().optional(),
  cabinet_preference: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  project?: Project;
}

export default function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!project;
  const lastChangedBy = useRef<"loan_amount" | "down_payment" | "down_payment_percent" | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      client_name: project?.client_name ?? "",
      client_email: project?.client_email ?? "",
      client_phone: project?.client_phone ? formatPhoneNumber(project.client_phone) : "",
      address: project?.address ?? "",
      city: project?.city ?? "",
      state: project?.state ?? "UT",
      zip: project?.zip ?? "",
      status: project?.status ?? "lead",
      project_type: project?.project_type ?? "residential",
      description: project?.description ?? "",
      notes: project?.notes ?? "",
      estimated_value: project?.estimated_value ? formatCurrencyInput(String(project.estimated_value)) : "",
      contract_value: project?.contract_value ? formatCurrencyInput(String(project.contract_value)) : "",
      sale_price: project?.sale_price ? formatCurrencyInput(String(project.sale_price)) : "",
      lender_name: project?.lender_name ?? "",
      loan_amount: project?.loan_amount ? formatCurrencyInput(String(project.loan_amount)) : "",
      down_payment: project?.down_payment ? formatCurrencyInput(String(project.down_payment)) : "",
      down_payment_percent: project?.down_payment_percent != null ? String(project.down_payment_percent) : "20",
      interest_rate: project?.interest_rate != null ? String(project.interest_rate) : "8.75",
      origination_fee_percent: project?.origination_fee_percent != null ? String(project.origination_fee_percent) : "2",
      loan_start_date: project?.loan_start_date ?? "",
      start_date: project?.start_date ?? "",
      end_date: project?.end_date ?? "",
      square_footage: project?.square_footage != null ? String(project.square_footage) : "",
      stories: project?.stories != null ? String(project.stories) : "",
      bedrooms: project?.bedrooms != null ? String(project.bedrooms) : "",
      bathrooms: project?.bathrooms != null ? String(project.bathrooms) : "",
      garage_spaces: project?.garage_spaces != null ? String(project.garage_spaces) : "",
      finish_level: project?.finish_level ?? "",
      lot_size: project?.lot_size ?? "",
      flooring_preference: project?.flooring_preference ?? "",
      countertop_preference: project?.countertop_preference ?? "",
      cabinet_preference: project?.cabinet_preference ?? "",
    },
  });

  const phone = watch("client_phone");
  const estimatedValue = watch("estimated_value");
  const contractValue = watch("contract_value");
  const salePrice = watch("sale_price");
  const loanAmount = watch("loan_amount");
  const downPayment = watch("down_payment");
  const downPaymentPercent = watch("down_payment_percent");

  // Auto-calculate down_payment from loan_amount and down_payment_percent
  useEffect(() => {
    if (lastChangedBy.current === "loan_amount" || lastChangedBy.current === "down_payment_percent") {
      const loanNum = loanAmount ? parseFloat(unformatCurrency(loanAmount)) : 0;
      const pct = downPaymentPercent ? parseFloat(downPaymentPercent) : 0;
      if (loanNum > 0 && pct > 0) {
        const totalProject = loanNum / (1 - pct / 100);
        const dp = totalProject * (pct / 100);
        setValue("down_payment", formatCurrencyInput(dp.toFixed(2)));
      }
      lastChangedBy.current = null;
    }
  }, [loanAmount, downPaymentPercent, setValue]);

  // Auto-calculate down_payment_percent from down_payment and loan_amount
  useEffect(() => {
    if (lastChangedBy.current === "down_payment") {
      const loanNum = loanAmount ? parseFloat(unformatCurrency(loanAmount)) : 0;
      const dpNum = downPayment ? parseFloat(unformatCurrency(downPayment)) : 0;
      if (loanNum > 0 && dpNum > 0) {
        const totalProject = loanNum + dpNum;
        const pct = (dpNum / totalProject) * 100;
        setValue("down_payment_percent", pct.toFixed(2));
      }
      lastChangedBy.current = null;
    }
  }, [downPayment, loanAmount, setValue]);

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        ...data,
        client_email: data.client_email || null,
        client_phone: data.client_phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        description: data.description || null,
        notes: data.notes || null,
        estimated_value: data.estimated_value
          ? parseFloat(unformatCurrency(data.estimated_value))
          : null,
        contract_value: data.contract_value
          ? parseFloat(unformatCurrency(data.contract_value))
          : null,
        sale_price: data.sale_price
          ? parseFloat(unformatCurrency(data.sale_price))
          : null,
        lender_name: data.lender_name || null,
        loan_amount: data.loan_amount
          ? parseFloat(unformatCurrency(data.loan_amount))
          : null,
        down_payment: data.down_payment
          ? parseFloat(unformatCurrency(data.down_payment))
          : null,
        down_payment_percent: data.down_payment_percent
          ? parseFloat(data.down_payment_percent)
          : null,
        interest_rate: data.interest_rate
          ? parseFloat(data.interest_rate)
          : null,
        origination_fee_percent: data.origination_fee_percent
          ? parseFloat(data.origination_fee_percent)
          : null,
        loan_start_date: data.loan_start_date || null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        square_footage: data.square_footage ? parseInt(data.square_footage) : null,
        stories: data.stories ? parseInt(data.stories) : null,
        bedrooms: data.bedrooms ? parseInt(data.bedrooms) : null,
        bathrooms: data.bathrooms ? parseFloat(data.bathrooms) : null,
        garage_spaces: data.garage_spaces ? parseInt(data.garage_spaces) : null,
        finish_level: data.finish_level || null,
        lot_size: data.lot_size || null,
        flooring_preference: data.flooring_preference || null,
        countertop_preference: data.countertop_preference || null,
        cabinet_preference: data.cabinet_preference || null,
      };

      const url = isEdit
        ? `/api/admin/projects/${project.id}`
        : "/api/admin/projects";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to save project");
      }

      const result = await res.json();
      toast.success(isEdit ? "Project updated!" : "Project created!");
      router.push(`/admin/projects/${result.id ?? project?.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClassName = "block text-sm font-medium text-gray-700 mb-1";
  const errorClassName = "text-red-500 text-xs mt-1";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          {isEdit ? "Edit Project" : "New Project"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Name */}
          <div>
            <label htmlFor="name" className={labelClassName}>
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className={inputClassName}
              placeholder="e.g. Kitchen Remodel"
            />
            {errors.name && (
              <p className={errorClassName}>{errors.name.message}</p>
            )}
          </div>

          {/* Client Name */}
          <div>
            <label htmlFor="client_name" className={labelClassName}>
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              id="client_name"
              type="text"
              {...register("client_name")}
              className={inputClassName}
              placeholder="e.g. John Smith"
            />
            {errors.client_name && (
              <p className={errorClassName}>{errors.client_name.message}</p>
            )}
          </div>

          {/* Client Email */}
          <div>
            <label htmlFor="client_email" className={labelClassName}>
              Client Email
            </label>
            <input
              id="client_email"
              type="email"
              inputMode="email"
              {...register("client_email")}
              className={inputClassName}
              placeholder="client@example.com"
            />
            {errors.client_email && (
              <p className={errorClassName}>{errors.client_email.message}</p>
            )}
          </div>

          {/* Client Phone */}
          <div>
            <label htmlFor="client_phone" className={labelClassName}>
              Client Phone
            </label>
            <input
              id="client_phone"
              type="text"
              inputMode="tel"
              value={phone || ""}
              onChange={(e) => setValue("client_phone", formatPhoneNumber(e.target.value))}
              className={inputClassName}
              placeholder="(435) 555-0100"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label htmlFor="address" className={labelClassName}>
              Address
            </label>
            <input
              id="address"
              type="text"
              {...register("address")}
              className={inputClassName}
              placeholder="123 Main St"
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className={labelClassName}>
              City
            </label>
            <input
              id="city"
              type="text"
              {...register("city")}
              className={inputClassName}
              placeholder="Salt Lake City"
            />
          </div>

          {/* State */}
          <div>
            <label htmlFor="state" className={labelClassName}>
              State
            </label>
            <input
              id="state"
              type="text"
              {...register("state")}
              className={inputClassName}
              placeholder="UT"
            />
          </div>

          {/* ZIP */}
          <div>
            <label htmlFor="zip" className={labelClassName}>
              ZIP
            </label>
            <input
              id="zip"
              type="text"
              {...register("zip")}
              className={inputClassName}
              placeholder="84101"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className={labelClassName}>
              Status
            </label>
            <select
              id="status"
              {...register("status")}
              className={inputClassName}
            >
              {(
                Object.entries(PROJECT_STATUS_LABELS) as [
                  ProjectStatus,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Project Type */}
          <div>
            <label htmlFor="project_type" className={labelClassName}>
              Project Type
            </label>
            <select
              id="project_type"
              {...register("project_type")}
              className={inputClassName}
            >
              {(
                Object.entries(PROJECT_TYPE_LABELS) as [
                  ProjectType,
                  string,
                ][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Estimated Value */}
          <div>
            <label htmlFor="estimated_value" className={labelClassName}>
              Estimated Value ($)
            </label>
            <input
              id="estimated_value"
              type="text"
              inputMode="decimal"
              value={estimatedValue || ""}
              onChange={(e) => setValue("estimated_value", formatCurrencyInput(e.target.value))}
              className={inputClassName}
              placeholder="$0.00"
            />
          </div>

          {/* Contract Value */}
          <div>
            <label htmlFor="contract_value" className={labelClassName}>
              Contract Value ($)
            </label>
            <input
              id="contract_value"
              type="text"
              inputMode="decimal"
              value={contractValue || ""}
              onChange={(e) => setValue("contract_value", formatCurrencyInput(e.target.value))}
              className={inputClassName}
              placeholder="$0.00"
            />
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className={labelClassName}>
              Start Date
            </label>
            <input
              id="start_date"
              type="date"
              {...register("start_date")}
              className={inputClassName}
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end_date" className={labelClassName}>
              End Date
            </label>
            <input
              id="end_date"
              type="date"
              {...register("end_date")}
              className={inputClassName}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className={labelClassName}>
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register("description")}
              className={inputClassName}
              placeholder="Project description..."
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label htmlFor="notes" className={labelClassName}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              {...register("notes")}
              className={inputClassName}
              placeholder="Internal notes..."
            />
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Property Details
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            These details help the AI estimator provide accurate estimates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Square Footage */}
          <div>
            <label htmlFor="square_footage" className={labelClassName}>
              Square Footage
            </label>
            <input
              id="square_footage"
              type="number"
              min="0"
              {...register("square_footage")}
              className={inputClassName}
              placeholder="2400"
            />
          </div>

          {/* Stories */}
          <div>
            <label htmlFor="stories" className={labelClassName}>
              Stories
            </label>
            <input
              id="stories"
              type="number"
              min="1"
              {...register("stories")}
              className={inputClassName}
              placeholder="2"
            />
          </div>

          {/* Bedrooms */}
          <div>
            <label htmlFor="bedrooms" className={labelClassName}>
              Bedrooms
            </label>
            <input
              id="bedrooms"
              type="number"
              min="0"
              {...register("bedrooms")}
              className={inputClassName}
              placeholder="4"
            />
          </div>

          {/* Bathrooms */}
          <div>
            <label htmlFor="bathrooms" className={labelClassName}>
              Bathrooms
            </label>
            <input
              id="bathrooms"
              type="number"
              min="0"
              step="0.5"
              {...register("bathrooms")}
              className={inputClassName}
              placeholder="2.5"
            />
          </div>

          {/* Garage Spaces */}
          <div>
            <label htmlFor="garage_spaces" className={labelClassName}>
              Garage Spaces
            </label>
            <input
              id="garage_spaces"
              type="number"
              min="0"
              {...register("garage_spaces")}
              className={inputClassName}
              placeholder="2"
            />
          </div>

          {/* Finish Level */}
          <div>
            <label htmlFor="finish_level" className={labelClassName}>
              Finish Level
            </label>
            <select
              id="finish_level"
              {...register("finish_level")}
              className={inputClassName}
            >
              <option value="">Select...</option>
              {Object.entries(FINISH_LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Lot Size */}
          <div>
            <label htmlFor="lot_size" className={labelClassName}>
              Lot Size
            </label>
            <input
              id="lot_size"
              type="text"
              {...register("lot_size")}
              className={inputClassName}
              placeholder="0.25 acres"
            />
          </div>

          {/* Flooring Preference */}
          <div>
            <label htmlFor="flooring_preference" className={labelClassName}>
              Flooring
            </label>
            <input
              id="flooring_preference"
              type="text"
              {...register("flooring_preference")}
              className={inputClassName}
              placeholder="Hardwood, LVP, etc."
            />
          </div>

          {/* Countertop Preference */}
          <div>
            <label htmlFor="countertop_preference" className={labelClassName}>
              Countertops
            </label>
            <input
              id="countertop_preference"
              type="text"
              {...register("countertop_preference")}
              className={inputClassName}
              placeholder="Granite, Quartz, etc."
            />
          </div>

          {/* Cabinet Preference */}
          <div>
            <label htmlFor="cabinet_preference" className={labelClassName}>
              Cabinets
            </label>
            <input
              id="cabinet_preference"
              type="text"
              {...register("cabinet_preference")}
              className={inputClassName}
              placeholder="Stock, Semi-Custom, etc."
            />
          </div>
        </div>
      </div>

      {/* Financing & Loan Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Financing & Loan Details
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sale Price */}
          <div>
            <label htmlFor="sale_price" className={labelClassName}>
              Sale Price ($)
            </label>
            <input
              id="sale_price"
              type="text"
              inputMode="decimal"
              value={salePrice || ""}
              onChange={(e) => setValue("sale_price", formatCurrencyInput(e.target.value))}
              className={inputClassName}
              placeholder="$0.00"
            />
          </div>

          {/* Lender Name */}
          <div>
            <label htmlFor="lender_name" className={labelClassName}>
              Lender Name
            </label>
            <input
              id="lender_name"
              type="text"
              {...register("lender_name")}
              className={inputClassName}
              placeholder="e.g. Mountain West Capital"
            />
          </div>

          {/* Loan Amount */}
          <div>
            <label htmlFor="loan_amount" className={labelClassName}>
              Loan Amount ($)
            </label>
            <input
              id="loan_amount"
              type="text"
              inputMode="decimal"
              value={loanAmount || ""}
              onChange={(e) => {
                lastChangedBy.current = "loan_amount";
                setValue("loan_amount", formatCurrencyInput(e.target.value));
              }}
              className={inputClassName}
              placeholder="$0.00"
            />
          </div>

          {/* Down Payment */}
          <div>
            <label htmlFor="down_payment" className={labelClassName}>
              Down Payment ($)
            </label>
            <input
              id="down_payment"
              type="text"
              inputMode="decimal"
              value={downPayment || ""}
              onChange={(e) => {
                lastChangedBy.current = "down_payment";
                setValue("down_payment", formatCurrencyInput(e.target.value));
              }}
              className={inputClassName}
              placeholder="$0.00"
            />
          </div>

          {/* Down Payment % */}
          <div>
            <label htmlFor="down_payment_percent" className={labelClassName}>
              Down Payment %
            </label>
            <input
              id="down_payment_percent"
              type="number"
              step="0.01"
              {...register("down_payment_percent")}
              onChange={(e) => {
                lastChangedBy.current = "down_payment_percent";
                setValue("down_payment_percent", e.target.value);
              }}
              className={`${inputClassName} max-w-[140px]`}
              placeholder="20"
            />
          </div>

          {/* Interest Rate % */}
          <div>
            <label htmlFor="interest_rate" className={labelClassName}>
              Interest Rate %
            </label>
            <input
              id="interest_rate"
              type="number"
              step="0.01"
              {...register("interest_rate")}
              className={`${inputClassName} max-w-[140px]`}
              placeholder="8.75"
            />
          </div>

          {/* Origination Fee % */}
          <div>
            <label htmlFor="origination_fee_percent" className={labelClassName}>
              Origination Fee %
            </label>
            <input
              id="origination_fee_percent"
              type="number"
              step="0.01"
              {...register("origination_fee_percent")}
              className={`${inputClassName} max-w-[140px]`}
              placeholder="2"
            />
          </div>

          {/* Loan Start Date */}
          <div>
            <label htmlFor="loan_start_date" className={labelClassName}>
              Loan Start Date
            </label>
            <input
              id="loan_start_date"
              type="date"
              {...register("loan_start_date")}
              className={inputClassName}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Update Project"
              : "Create Project"}
        </button>
      </div>
    </form>
  );
}
