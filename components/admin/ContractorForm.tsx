"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Contractor,
  ContractorType,
  TRADES,
  DEFAULT_VENDOR_CATEGORIES,
} from "@/lib/types/database";
import { Save, Loader2, Upload, FileText, X } from "lucide-react";
import { formatPhoneNumber } from "@/lib/formatters";
import { createClient } from "@/lib/supabase/client";

const contractorSchema = z
  .object({
    type: z.enum(["contractor", "vendor"]),
    name: z.string().min(1, "Name is required"),
    company: z.string().optional(),
    email: z
      .string()
      .email("Invalid email address")
      .or(z.literal(""))
      .optional(),
    phone: z.string().optional(),
    trade: z.string().optional(),
    license_number: z.string().optional(),
    vendor_category: z.string().optional(),
    account_number: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "contractor") return !!data.trade;
      return true;
    },
    { message: "Trade is required", path: ["trade"] }
  );

type ContractorFormData = z.infer<typeof contractorSchema>;

interface ContractorFormProps {
  contractor?: Contractor;
  onSuccess?: () => void;
}

export default function ContractorForm({
  contractor,
  onSuccess,
}: ContractorFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!contractor;

  // W9 upload state
  const [w9File, setW9File] = useState<File | null>(null);
  const [w9Uploading, setW9Uploading] = useState(false);
  const [existingW9, setExistingW9] = useState<{
    url: string;
    name: string;
  } | null>(
    contractor?.w9_file_url
      ? { url: contractor.w9_file_url, name: contractor.w9_file_name || "W9" }
      : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom vendor category state
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      type: contractor?.type ?? "contractor",
      name: contractor?.name ?? "",
      company: contractor?.company ?? "",
      email: contractor?.email ?? "",
      phone: contractor?.phone ? formatPhoneNumber(contractor.phone) : "",
      trade: contractor?.trade ?? "",
      license_number: contractor?.license_number ?? "",
      vendor_category: contractor?.vendor_category ?? "",
      account_number: contractor?.account_number ?? "",
      notes: contractor?.notes ?? "",
    },
  });

  const phoneValue = watch("phone");
  const entityType = watch("type");
  const vendorCategory = watch("vendor_category");

  async function uploadW9(contractorId: string): Promise<{
    url: string;
    name: string;
  } | null> {
    if (!w9File) return null;
    setW9Uploading(true);
    try {
      const supabase = createClient();
      const storagePath = `${contractorId}/${Date.now()}-${w9File.name}`;
      const { error: uploadError } = await supabase.storage
        .from("contractor-w9")
        .upload(storagePath, w9File, { contentType: w9File.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("contractor-w9")
        .getPublicUrl(storagePath);

      return { url: urlData.publicUrl, name: w9File.name };
    } catch (err) {
      console.error("W9 upload error:", err);
      toast.error("Failed to upload W9");
      return null;
    } finally {
      setW9Uploading(false);
    }
  }

  async function onSubmit(data: ContractorFormData) {
    setIsSubmitting(true);
    try {
      const url = isEdit
        ? `/api/admin/contractors/${contractor.id}`
        : "/api/admin/contractors";
      const method = isEdit ? "PATCH" : "POST";

      // Clean empty strings to null
      const payload: Record<string, unknown> = { ...data };
      for (const key of Object.keys(payload)) {
        if (payload[key] === "") payload[key] = null;
      }

      // For vendors, clear contractor-specific fields
      if (data.type === "vendor") {
        payload.trade = "Other";
        payload.license_number = null;
      }
      // For contractors, clear vendor-specific fields
      if (data.type === "contractor") {
        payload.vendor_category = null;
        payload.account_number = null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Something went wrong");
      }

      const saved = await res.json();

      // Upload W9 if file selected (contractor type)
      if (w9File && data.type === "contractor") {
        const w9Data = await uploadW9(saved.id);
        if (w9Data) {
          await fetch(`/api/admin/contractors/${saved.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              w9_file_url: w9Data.url,
              w9_file_name: w9Data.name,
            }),
          });
        }
      }

      const label = data.type === "vendor" ? "Vendor" : "Contractor";
      toast.success(isEdit ? `${label} updated` : `${label} created`);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/admin/contractors/${saved.id}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
  const selectClass = `${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat pr-10`;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl bg-white p-6 shadow-sm"
      noValidate
    >
      {/* Type Toggle */}
      <div>
        <label className={labelClass}>Type</label>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(["contractor", "vendor"] as ContractorType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("type", t)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                entityType === t
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              style={{ minHeight: 44 }}
            >
              {t === "contractor" ? "Contractor" : "Vendor"}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          {entityType === "vendor" ? "Contact Name" : "Name"}{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          placeholder={
            entityType === "vendor" ? "Sales Rep Name" : "John Smith"
          }
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          className={inputClass}
          style={{ minHeight: 44 }}
          {...register("name")}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Company */}
      <div>
        <label htmlFor="company" className={labelClass}>
          Company {entityType === "vendor" && <span className="text-red-500">*</span>}
        </label>
        <input
          id="company"
          type="text"
          placeholder={
            entityType === "vendor"
              ? "ABC Lumber Supply"
              : "Smith Plumbing LLC"
          }
          className={inputClass}
          style={{ minHeight: 44 }}
          {...register("company")}
        />
      </div>

      {/* Contractor-specific: Trade(s) */}
      {entityType === "contractor" && (
        <div>
          <label className={labelClass}>
            Trade(s) <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">Select all that apply</p>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            role="group"
            aria-label="Trades"
          >
            {TRADES.map((t) => {
              const currentTrades = (watch("trade") || "").split(", ").filter(Boolean);
              const isSelected = currentTrades.includes(t);
              return (
                <label
                  key={t}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-medium"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{ minHeight: 44 }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      const trades = (watch("trade") || "").split(", ").filter(Boolean);
                      const updated = isSelected
                        ? trades.filter((tr) => tr !== t)
                        : [...trades, t];
                      setValue("trade", updated.join(", "), { shouldValidate: true });
                    }}
                    className="sr-only"
                  />
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                  }`}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {t}
                </label>
              );
            })}
          </div>
          {errors.trade && (
            <p
              id="trade-error"
              className="mt-1 text-sm text-red-600"
              role="alert"
            >
              {errors.trade.message}
            </p>
          )}
        </div>
      )}

      {/* Vendor-specific: Category */}
      {entityType === "vendor" && (
        <div>
          <label htmlFor="vendor_category" className={labelClass}>
            Category
          </label>
          {showCustomCategory ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a custom category..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className={inputClass}
                style={{ minHeight: 44 }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  if (customCategory.trim()) {
                    setValue("vendor_category", customCategory.trim());
                  }
                  setShowCustomCategory(false);
                  setCustomCategory("");
                }}
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                style={{ minHeight: 44 }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomCategory(false);
                  setCustomCategory("");
                }}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                style={{ minHeight: 44 }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                id="vendor_category"
                className={selectClass}
                style={{ minHeight: 44 }}
                value={vendorCategory ?? ""}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setShowCustomCategory(true);
                  } else {
                    setValue("vendor_category", e.target.value);
                  }
                }}
              >
                <option value="">Select a category...</option>
                {DEFAULT_VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {/* Show current value if it's custom and not in defaults */}
                {vendorCategory &&
                  !DEFAULT_VENDOR_CATEGORIES.includes(
                    vendorCategory as (typeof DEFAULT_VENDOR_CATEGORIES)[number]
                  ) && (
                    <option value={vendorCategory}>{vendorCategory}</option>
                  )}
                <option value="__custom__">+ Add Custom Category</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Vendor-specific: Account Number */}
      {entityType === "vendor" && (
        <div>
          <label htmlFor="account_number" className={labelClass}>
            Account Number
          </label>
          <input
            id="account_number"
            type="text"
            placeholder="ACCT-12345"
            className={inputClass}
            style={{ minHeight: 44 }}
            {...register("account_number")}
          />
        </div>
      )}

      {/* Email & Phone */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={
              entityType === "vendor"
                ? "orders@abclumber.com"
                : "john@smithplumbing.com"
            }
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClass}
            style={{ minHeight: 44 }}
            {...register("email")}
          />
          {errors.email && (
            <p
              id="email-error"
              className="mt-1 text-sm text-red-600"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone
          </label>
          <input
            id="phone"
            type="text"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(435) 555-0100"
            value={phoneValue ?? ""}
            onChange={(e) =>
              setValue("phone", formatPhoneNumber(e.target.value))
            }
            className={inputClass}
            style={{ minHeight: 44 }}
          />
        </div>
      </div>

      {/* Contractor-specific: License Number */}
      {entityType === "contractor" && (
        <div>
          <label htmlFor="license_number" className={labelClass}>
            License Number
          </label>
          <input
            id="license_number"
            type="text"
            placeholder="UT-12345"
            className={inputClass}
            style={{ minHeight: 44 }}
            {...register("license_number")}
          />
        </div>
      )}

      {/* Contractor-specific: W9 Upload */}
      {entityType === "contractor" && (
        <div>
          <label className={labelClass}>W9</label>
          {existingW9 && !w9File ? (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
              <a
                href={existingW9.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800 truncate"
              >
                {existingW9.name}
              </a>
              <button
                type="button"
                onClick={() => {
                  setExistingW9(null);
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Replace
              </button>
            </div>
          ) : w9File ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <FileText className="h-5 w-5 text-green-600 shrink-0" />
              <span className="flex-1 text-sm font-medium text-green-800 truncate">
                {w9File.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setW9File(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
              style={{ minHeight: 44 }}
            >
              <Upload className="h-4 w-4" />
              Upload W9
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setW9File(file);
            }}
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          placeholder={
            entityType === "vendor"
              ? "Preferred supplier for lumber, 10% contractor discount..."
              : "Reliable, prefers morning starts..."
          }
          className={inputClass}
          {...register("notes")}
        />
      </div>

      {/* Submit */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="order-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 sm:order-1"
          style={{ minHeight: 44 }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || w9Uploading}
          className="order-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50 sm:order-2 sm:w-auto"
          style={{ minHeight: 44 }}
        >
          {isSubmitting || w9Uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit
            ? `Update ${entityType === "vendor" ? "Vendor" : "Contractor"}`
            : `Create ${entityType === "vendor" ? "Vendor" : "Contractor"}`}
        </button>
      </div>
    </form>
  );
}
