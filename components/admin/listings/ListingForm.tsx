"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { Upload, Loader2, Save, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  type RealEstateListing,
  type PropertyType,
  type ListingStatus,
} from "@/lib/types/real-estate";

interface ListingFormProps {
  listing?: RealEstateListing;
}

const labelClass = "block text-xs font-medium text-gray-500 mb-1";
const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/]/g, "_").replace(/\.{2,}/g, ".");
}

export default function ListingForm({ listing }: ListingFormProps) {
  const router = useRouter();
  const isEdit = !!listing;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    address: listing?.address ?? "",
    city: listing?.city ?? "",
    state: listing?.state ?? "UT",
    zip: listing?.zip ?? "",
    price: listing?.price?.toString() ?? "",
    bedrooms: listing?.bedrooms?.toString() ?? "",
    bathrooms: listing?.bathrooms?.toString() ?? "",
    square_footage: listing?.square_footage?.toString() ?? "",
    lot_size: listing?.lot_size ?? "",
    property_type: (listing?.property_type as PropertyType | "") ?? "",
    mls_url: listing?.mls_url ?? "",
    cover_photo_url: listing?.cover_photo_url ?? "",
    description: listing?.description ?? "",
    status: (listing?.status as ListingStatus) ?? "draft",
    sort_order: listing?.sort_order?.toString() ?? "0",
    featured: listing?.featured ?? false,
    listed_at: listing?.listed_at ?? "",
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhotoUpload(file: File) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Photo is too large (max 15 MB).");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${Date.now()}-${sanitizeFilename(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("real-estate-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { data: urlData } = supabase.storage
        .from("real-estate-photos")
        .getPublicUrl(path);
      update("cover_photo_url", urlData.publicUrl);
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim() || "UT",
        zip: form.zip.trim() || null,
        price: form.price ? Number(form.price) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        square_footage: form.square_footage ? Number(form.square_footage) : null,
        lot_size: form.lot_size.trim() || null,
        property_type: form.property_type || null,
        mls_url: form.mls_url.trim() || null,
        cover_photo_url: form.cover_photo_url || null,
        description: form.description.trim() || null,
        status: form.status,
        sort_order: form.sort_order ? Number(form.sort_order) : 0,
        featured: form.featured,
        listed_at: form.listed_at || null,
      };

      const url = isEdit
        ? `/api/admin/real-estate-listings/${listing!.id}`
        : `/api/admin/real-estate-listings`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save listing");
      }
      toast.success(isEdit ? "Listing saved" : "Listing created");
      router.push("/admin/listings");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Photo upload */}
      <div>
        <label className={labelClass}>Cover photo</label>
        {form.cover_photo_url ? (
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <Image
              src={form.cover_photo_url}
              alt="Cover"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => update("cover_photo_url", "")}
              className="absolute top-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white"
            >
              Replace
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full aspect-[4/3] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Uploading…</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600 font-medium">
                  Upload cover photo
                </p>
                <p className="text-xs text-gray-400">JPG, PNG, or WebP up to 15 MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
              }}
            />
          </label>
        )}
      </div>

      {/* Address */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
        <div className="sm:col-span-6">
          <label className={labelClass}>Street address *</label>
          <input
            type="text"
            required
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="123 Main Street"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-3">
          <label className={labelClass}>City *</label>
          <input
            type="text"
            required
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>State</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-1">
          <label className={labelClass}>Zip</label>
          <input
            type="text"
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Price + property type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Price</label>
          <input
            type="number"
            min={0}
            step="1"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            placeholder="989000"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Property type</label>
          <select
            value={form.property_type}
            onChange={(e) =>
              update("property_type", e.target.value as PropertyType | "")
            }
            className={inputClass}
          >
            <option value="">Choose…</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className={labelClass}>Beds</label>
          <input
            type="number"
            min={0}
            value={form.bedrooms}
            onChange={(e) => update("bedrooms", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Baths</label>
          <input
            type="number"
            min={0}
            step="0.5"
            value={form.bathrooms}
            onChange={(e) => update("bathrooms", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Sq ft</label>
          <input
            type="number"
            min={0}
            value={form.square_footage}
            onChange={(e) => update("square_footage", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Lot size</label>
          <input
            type="text"
            value={form.lot_size}
            onChange={(e) => update("lot_size", e.target.value)}
            placeholder="0.25 acres"
            className={inputClass}
          />
        </div>
      </div>

      {/* MLS link */}
      <div>
        <label className={labelClass}>MLS listing URL</label>
        <input
          type="url"
          value={form.mls_url}
          onChange={(e) => update("mls_url", e.target.value)}
          placeholder="https://www.utahrealestate.com/…"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Where the &ldquo;View MLS Listing&rdquo; button will send visitors.
        </p>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description (optional)</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Visibility / order */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as ListingStatus)}
            className={inputClass}
          >
            {Object.entries(LISTING_STATUS_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Only Active and Pending are shown on the public site.
          </p>
        </div>
        <div>
          <label className={labelClass}>Sort order</label>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => update("sort_order", e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">
            Lower = shown first. Featured listings always come first.
          </p>
        </div>
        <div>
          <label className={labelClass}>Listed date</label>
          <input
            type="date"
            value={form.listed_at}
            onChange={(e) => update("listed_at", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(e) => update("featured", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-gray-700">Pin to the front of the row (featured)</span>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.push("/admin/listings")}
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          style={{ minHeight: 44 }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEdit ? (
            <Save className="h-4 w-4" />
          ) : (
            <Home className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : "Create listing"}
        </button>
      </div>
    </form>
  );
}
