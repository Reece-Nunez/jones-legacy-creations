"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Contractor, TRADES } from "@/lib/types/database";
import { Save, Loader2 } from "lucide-react";
import { formatPhoneNumber } from "@/lib/formatters";

const contractorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z
    .string()
    .email("Invalid email address")
    .or(z.literal(""))
    .optional(),
  phone: z.string().optional(),
  trade: z.string().min(1, "Trade is required"),
  license_number: z.string().optional(),
  notes: z.string().optional(),
});

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      name: contractor?.name ?? "",
      company: contractor?.company ?? "",
      email: contractor?.email ?? "",
      phone: contractor?.phone ? formatPhoneNumber(contractor.phone) : "",
      trade: contractor?.trade ?? "",
      license_number: contractor?.license_number ?? "",
      notes: contractor?.notes ?? "",
    },
  });

  const phoneValue = watch("phone");

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
      toast.success(isEdit ? "Contractor updated" : "Contractor created");

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

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 rounded-xl bg-white p-6 shadow-sm"
      noValidate
    >
      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          placeholder="John Smith"
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
          Company
        </label>
        <input
          id="company"
          type="text"
          placeholder="Smith Plumbing LLC"
          className={inputClass}
          style={{ minHeight: 44 }}
          {...register("company")}
        />
      </div>

      {/* Trade */}
      <div>
        <label htmlFor="trade" className={labelClass}>
          Trade <span className="text-red-500">*</span>
        </label>
        <select
          id="trade"
          aria-required="true"
          aria-invalid={!!errors.trade}
          aria-describedby={errors.trade ? "trade-error" : undefined}
          className={`${inputClass} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_12px_center] bg-no-repeat pr-10`}
          style={{ minHeight: 44 }}
          {...register("trade")}
        >
          <option value="">Select a trade...</option>
          {TRADES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {errors.trade && (
          <p id="trade-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.trade.message}
          </p>
        )}
      </div>

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
            placeholder="john@smithplumbing.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={inputClass}
            style={{ minHeight: 44 }}
            {...register("email")}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
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
            onChange={(e) => setValue("phone", formatPhoneNumber(e.target.value))}
            className={inputClass}
            style={{ minHeight: 44 }}
          />
        </div>
      </div>

      {/* License Number */}
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

      {/* Notes */}
      <div>
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          rows={4}
          placeholder="Reliable, prefers morning starts..."
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
          disabled={isSubmitting}
          className="order-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50 sm:order-2 sm:w-auto"
          style={{ minHeight: 44 }}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit ? "Update Contractor" : "Create Contractor"}
        </button>
      </div>
    </form>
  );
}
