"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Upload,
  Loader2,
  Save,
  Home,
  X,
  Star,
  StarOff,
  GripVertical,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { confirmAction } from "@/lib/confirmAction";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  type RealEstateListing,
  type RealEstateListingPhoto,
  type PropertyType,
  type ListingStatus,
} from "@/lib/types/real-estate";
import { slugify, slugifyLive } from "@/lib/types/construction-showcase";

interface ListingFormProps {
  listing?: RealEstateListing & { photos?: RealEstateListingPhoto[] };
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
  const coverInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const draggingIdRef = useRef<string | null>(null);

  const [form, setForm] = useState({
    slug: listing?.slug ?? "",
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

  const [photos, setPhotos] = useState<RealEstateListingPhoto[]>(
    listing?.photos ?? []
  );

  // Photos picked but not yet uploaded. Used on the create form so Blake
  // can queue files before the listing row exists; flushed on submit.
  type PendingPhoto = { id: string; file: File; previewUrl: string };
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      previewUrlsRef.current = [];
    };
  }, []);

  const [coverUploading, setCoverUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingNonPhotoFields, setSavingNonPhotoFields] = useState(false);
  const [extractingStats, setExtractingStats] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleExtractFromDescription() {
    const description = form.description.trim();
    if (!description) {
      toast.error("Paste the listing description first, then click extract.");
      return;
    }

    setExtractingStats(true);
    const toastId = toast.loading("Reading the description…");
    try {
      const res = await fetch(
        "/api/admin/real-estate-listings/extract-from-description",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Extraction failed (${res.status})`);
      }
      const data: {
        fields: {
          address: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          price: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          square_footage: number | null;
          lot_size: string | null;
          property_type: PropertyType | null;
          description: string | null;
          notes: string | null;
        };
      } = await res.json();

      // Fill only fields Blake hasn't typed into yet. He's the source of
      // truth once he's touched a field.
      let filledCount = 0;
      setForm((prev) => {
        const next = { ...prev };
        const fill = (
          key: keyof typeof prev,
          value: string | number | null
        ) => {
          if (value === null || value === undefined || value === "") return;
          if (prev[key] !== "" && prev[key] !== "0") return;
          (next as Record<string, unknown>)[key] =
            typeof value === "number" ? value.toString() : value;
          filledCount++;
        };
        fill("address", data.fields.address);
        fill("city", data.fields.city);
        fill("state", data.fields.state);
        fill("zip", data.fields.zip);
        fill("price", data.fields.price);
        fill("bedrooms", data.fields.bedrooms);
        fill("bathrooms", data.fields.bathrooms);
        fill("square_footage", data.fields.square_footage);
        fill("lot_size", data.fields.lot_size);
        if (data.fields.property_type && !prev.property_type) {
          next.property_type = data.fields.property_type;
          filledCount++;
        }
        // Auto-derive slug if blank now that we have an address.
        if (!isEdit && !prev.slug && (data.fields.address || next.address)) {
          next.slug = slugify(
            [next.address, next.city, next.state].filter(Boolean).join(" ")
          );
        }
        return next;
      });

      toast.dismiss(toastId);
      const noteSuffix = data.fields.notes ? ` — ${data.fields.notes}` : "";
      if (filledCount === 0) {
        toast(
          `Nothing new to fill — the description didn't mention any stats not already in the form.${noteSuffix}`,
          { duration: 6000 }
        );
      } else {
        toast.success(
          `Filled ${filledCount} field${filledCount === 1 ? "" : "s"} from the description. Review before saving.${noteSuffix}`,
          { duration: 6000 }
        );
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractingStats(false);
    }
  }

  // Auto-fill the slug from address/city/state on the create form, only as
  // long as the user hasn't started typing their own. Once they touch the
  // slug field manually it stops syncing.
  function onAddressFieldChange(
    key: "address" | "city" | "state",
    value: string
  ) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (isEdit) return next;
      const prevDerived = slugify(
        [prev.address, prev.city, prev.state].filter(Boolean).join(" ")
      );
      if (!prev.slug || prev.slug === prevDerived) {
        next.slug = slugify(
          [next.address, next.city, next.state].filter(Boolean).join(" ")
        );
      }
      return next;
    });
  }

  async function uploadFile(file: File): Promise<string> {
    const supabase = createClient();
    if (file.size > 15 * 1024 * 1024) {
      throw new Error("File too large (max 15 MB)");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are supported");
    }
    const path = `${Date.now()}-${sanitizeFilename(file.name)}`;
    const { error } = await supabase.storage
      .from("real-estate-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage
      .from("real-estate-photos")
      .getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function handleCoverUpload(file: File) {
    setCoverUploading(true);
    try {
      const url = await uploadFile(file);
      update("cover_photo_url", url);
      toast.success("Cover photo set");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  function queuePendingPhotos(files: FileList) {
    const accepted: PendingPhoto[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 15 * 1024 * 1024) {
        toast.error(`${f.name}: too large (max 15 MB)`);
        continue;
      }
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: not an image`);
        continue;
      }
      const previewUrl = URL.createObjectURL(f);
      previewUrlsRef.current.push(previewUrl);
      accepted.push({ id: crypto.randomUUID(), file: f, previewUrl });
    }
    if (accepted.length > 0) {
      setPendingPhotos((prev) => [...prev, ...accepted]);
      toast.success(
        `${accepted.length} photo${accepted.length === 1 ? "" : "s"} queued. They upload when you save.`
      );
    }
  }

  async function handlePhotosUpload(files: FileList) {
    if (!isEdit) {
      queuePendingPhotos(files);
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }
    setPhotoUploading(true);
    try {
      const uploads: { url: string }[] = [];
      for (const f of Array.from(files)) {
        try {
          const url = await uploadFile(f);
          uploads.push({ url });
        } catch (err) {
          toast.error(
            `${f.name}: ${err instanceof Error ? err.message : "failed"}`
          );
        }
      }
      if (uploads.length > 0) {
        const res = await fetch(
          `/api/admin/real-estate-listings/${listing!.id}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photos: uploads }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to register photos");
        }
        const created: RealEstateListingPhoto[] = await res.json();
        setPhotos((prev) => [...prev, ...created]);
        toast.success(
          `${created.length} photo${created.length === 1 ? "" : "s"} added`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function removePendingPhoto(id: string) {
    setPendingPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function deletePhoto(photo: RealEstateListingPhoto) {
    if (!isEdit) return;
    if (!(await confirmAction("Remove this photo from the listing?"))) return;
    try {
      const res = await fetch(
        `/api/admin/real-estate-listings/${listing!.id}/photos/${photo.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete photo");
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (form.cover_photo_url === photo.url) update("cover_photo_url", "");
      toast.success("Photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete photo");
    }
  }

  function setCoverFromPhoto(photo: RealEstateListingPhoto) {
    update("cover_photo_url", photo.url);
    toast.success("Cover photo updated");
  }

  function onDragStart(id: string) {
    draggingIdRef.current = id;
  }
  async function onDrop(targetId: string) {
    const dragging = draggingIdRef.current;
    draggingIdRef.current = null;
    if (!dragging || dragging === targetId || !isEdit) return;
    const next = [...photos];
    const fromIdx = next.findIndex((p) => p.id === dragging);
    const toIdx = next.findIndex((p) => p.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await persistOrder(next);
  }

  // Move a photo one slot up or down. HTML5 drag doesn't work on touch
  // devices, so this is the mobile-accessible reorder path. Buttons stay
  // visible on desktop too — drag is the discoverable shortcut, arrows
  // are the explicit affordance.
  async function movePhoto(photoId: string, direction: "up" | "down") {
    if (!isEdit) return;
    const idx = photos.findIndex((p) => p.id === photoId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= photos.length) return;
    const next = [...photos];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    await persistOrder(next);
  }

  async function persistOrder(next: RealEstateListingPhoto[]) {
    setPhotos(next);
    try {
      const res = await fetch(
        `/api/admin/real-estate-listings/${listing!.id}/photos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: next.map((p) => p.id) }),
        }
      );
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      toast.error("Could not save new order. Reloading.");
      setPhotos(listing?.photos ?? []);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSavingNonPhotoFields(true);
    try {
      const payload = {
        slug: slugify(form.slug.trim() || `${form.address} ${form.city} ${form.state}`),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim() || "UT",
        zip: form.zip.trim() || null,
        price: form.price ? Number(form.price) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        square_footage: form.square_footage
          ? Number(form.square_footage)
          : null,
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
      const saved = await res.json();
      const listingId = saved.id as string;

      // Flush queued gallery photos. One sequential pass so progress is
      // reportable and a single failure doesn't sink the others.
      let uploadedCount = 0;
      if (pendingPhotos.length > 0) {
        setSavingNonPhotoFields(false);
        const uploadToastId = toast.loading(
          `Uploading photo 1 of ${pendingPhotos.length}…`
        );
        try {
          const photoUrls: string[] = [];
          for (let i = 0; i < pendingPhotos.length; i++) {
            const p = pendingPhotos[i];
            toast.loading(
              `Uploading photo ${i + 1} of ${pendingPhotos.length}…`,
              { id: uploadToastId }
            );
            try {
              const url = await uploadFile(p.file);
              photoUrls.push(url);
            } catch (err) {
              toast.error(
                `${p.file.name}: ${err instanceof Error ? err.message : "upload failed"}`
              );
            }
          }
          if (photoUrls.length > 0) {
            const photoRes = await fetch(
              `/api/admin/real-estate-listings/${listingId}/photos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  photos: photoUrls.map((url) => ({ url })),
                }),
              }
            );
            if (!photoRes.ok) {
              const body = await photoRes.json().catch(() => ({}));
              throw new Error(body.error || "Failed to register photos");
            }
            uploadedCount = photoUrls.length;
          }
          toast.dismiss(uploadToastId);
          pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          setPendingPhotos([]);
        } catch (err) {
          toast.dismiss(uploadToastId);
          toast.error(
            err instanceof Error ? err.message : "Photo upload failed"
          );
        }
      }

      const baseMsg = isEdit ? "Listing saved" : "Listing created";
      const photoMsg =
        uploadedCount > 0
          ? `. ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded.`
          : "";
      toast.success(`${baseMsg}${photoMsg}`);

      if (!isEdit) {
        router.push(`/admin/listings/${listingId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setSubmitting(false);
      setSavingNonPhotoFields(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Cover photo */}
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
            {coverUploading ? (
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
                <p className="text-xs text-gray-400">
                  Or pick one from the photo gallery below
                </p>
              </>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={coverUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleCoverUpload(f);
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
            onChange={(e) => onAddressFieldChange("address", e.target.value)}
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
            onChange={(e) => onAddressFieldChange("city", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>State</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => onAddressFieldChange("state", e.target.value)}
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

      {/* URL slug — auto-fills from address on create, freely editable */}
      <div>
        <label className={labelClass}>URL slug</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => update("slug", slugifyLive(e.target.value))}
          onBlur={(e) => update("slug", slugify(e.target.value))}
          placeholder="123-main-st-george-ut"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          /services/real-estate/listings/{form.slug || "…"}
        </p>
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
          placeholder="https://my.flexmls.com/…/listings/…"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Where the &ldquo;View on MLS&rdquo; button will send visitors.
        </p>
      </div>

      {/* Description + AI auto-fill */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass + " mb-0"}>Description (optional)</label>
          <button
            type="button"
            onClick={handleExtractFromDescription}
            disabled={extractingStats || !form.description.trim()}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent"
            title={
              !form.description.trim()
                ? "Paste the description first"
                : "Pull beds, baths, sqft, and lot size out of the description"
            }
          >
            {extractingStats ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {extractingStats ? "Reading…" : "Auto-fill stats from description"}
          </button>
        </div>
        <textarea
          rows={6}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Paste the marketing description from the MLS listing here. Then click Auto-fill stats to pull beds, baths, sq ft, and lot size into the form."
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          Auto-fill only sets fields you haven&apos;t already typed in.
        </p>
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
          disabled={submitting || coverUploading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          style={{ minHeight: 44 }}
        >
          {savingNonPhotoFields ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEdit ? (
            <Save className="h-4 w-4" />
          ) : (
            <Home className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : "Create listing"}
        </button>
      </div>

      {/* Photo gallery manager. Always visible — on the create form, files
          are queued in component state (pendingPhotos) and uploaded on save.
          On the edit form, they upload immediately and persist via the API. */}
      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Photo gallery
            </h3>
            <p className="text-sm text-gray-500">
              {isEdit
                ? "Drag photos to reorder. Click the star to set the cover."
                : "Pick photos to add to the gallery. They upload when you save."}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
            {photoUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Add photos
              </>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={photoUploading}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handlePhotosUpload(e.target.files);
                }
              }}
            />
          </label>
        </div>

        {photos.length === 0 && pendingPhotos.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-500">
            No photos yet. Click <strong>Add photos</strong> above to upload.
            You can select multiple files at once.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pendingPhotos.map((p) => (
              <div
                key={p.id}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-amber-300"
                title="Queued — uploads when you save"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt={p.file.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/40 transition-colors" />
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-amber-400/95 text-white text-[10px] font-semibold px-1.5 py-0.5">
                  Queued
                </span>
                <button
                  type="button"
                  onClick={() => removePendingPhoto(p.id)}
                  title="Remove from queue"
                  aria-label="Remove from queue"
                  className="absolute top-1.5 right-1.5 h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/90 text-red-600 hover:bg-red-600 hover:text-white transition-colors md:opacity-0 md:group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {photos.map((p, idx) => {
              const isCover = form.cover_photo_url === p.url;
              const isFirst = idx === 0;
              const isLast = idx === photos.length - 1;
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => onDragStart(p.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(p.id)}
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                  // touch-action: pan-y lets the user scroll the page
                  // vertically by touching a draggable tile. Without this,
                  // mobile browsers intercept the touch as a drag-start
                  // (which HTML5 D&D can't complete anyway), trapping scroll.
                  style={{ touchAction: "pan-y" }}
                >
                  <Image
                    src={p.url}
                    alt={p.alt ?? "Listing photo"}
                    fill
                    sizes="(max-width: 640px) 50vw, 200px"
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/40 transition-colors" />

                  <span className="hidden md:flex absolute top-1.5 left-1.5 h-9 w-9 items-center justify-center rounded-md bg-white/90 text-gray-700 opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </span>

                  <button
                    type="button"
                    onClick={() => setCoverFromPhoto(p)}
                    title={isCover ? "This is the cover photo" : "Set as cover"}
                    aria-label={isCover ? "Cover photo" : "Set as cover"}
                    className={`absolute top-1.5 right-12 h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors ${
                      isCover
                        ? "bg-amber-400 text-white"
                        : "bg-white/90 text-gray-700 md:opacity-0 md:group-hover:opacity-100 hover:bg-amber-400 hover:text-white"
                    }`}
                  >
                    {isCover ? (
                      <Star className="h-4 w-4 fill-current" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => deletePhoto(p)}
                    title="Remove photo"
                    aria-label="Remove photo"
                    className="absolute top-1.5 right-1.5 h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/90 text-red-600 hover:bg-red-600 hover:text-white transition-colors md:opacity-0 md:group-hover:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Move up/down — always visible on mobile (no hover), hover-
                      revealed on desktop. The accessible alternative to drag,
                      since HTML5 D&D doesn't work on touch. */}
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => movePhoto(p.id, "up")}
                      disabled={isFirst}
                      title="Move up"
                      aria-label="Move photo up"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/90 text-gray-700 hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-white/90 disabled:hover:text-gray-700 disabled:cursor-not-allowed md:opacity-0 md:group-hover:opacity-100"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePhoto(p.id, "down")}
                      disabled={isLast}
                      title="Move down"
                      aria-label="Move photo down"
                      className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/90 text-gray-700 hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-white/90 disabled:hover:text-gray-700 disabled:cursor-not-allowed md:opacity-0 md:group-hover:opacity-100"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </form>
  );
}
