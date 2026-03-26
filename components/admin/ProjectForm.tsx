"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import {
  Project,
  ProjectStatus,
  ProjectType,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
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
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  project?: Project;
}

export default function ProjectForm({ project }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!project;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name ?? "",
      client_name: project?.client_name ?? "",
      client_email: project?.client_email ?? "",
      client_phone: project?.client_phone ?? "",
      address: project?.address ?? "",
      city: project?.city ?? "",
      state: project?.state ?? "UT",
      zip: project?.zip ?? "",
      status: project?.status ?? "lead",
      project_type: project?.project_type ?? "residential",
      description: project?.description ?? "",
      notes: project?.notes ?? "",
      estimated_value: project?.estimated_value?.toString() ?? "",
      contract_value: project?.contract_value?.toString() ?? "",
      start_date: project?.start_date ?? "",
      end_date: project?.end_date ?? "",
    },
  });

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
          ? parseFloat(data.estimated_value)
          : null,
        contract_value: data.contract_value
          ? parseFloat(data.contract_value)
          : null,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
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
              type="tel"
              {...register("client_phone")}
              className={inputClassName}
              placeholder="(555) 123-4567"
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
              type="number"
              step="0.01"
              min="0"
              {...register("estimated_value")}
              className={inputClassName}
              placeholder="0.00"
            />
          </div>

          {/* Contract Value */}
          <div>
            <label htmlFor="contract_value" className={labelClassName}>
              Contract Value ($)
            </label>
            <input
              id="contract_value"
              type="number"
              step="0.01"
              min="0"
              {...register("contract_value")}
              className={inputClassName}
              placeholder="0.00"
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
