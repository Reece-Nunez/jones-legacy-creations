"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Upload,
  Loader2,
  Save,
  Hammer,
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
  SHOWCASE_STATUS_LABELS,
  PROJECT_PHASE_LABELS,
  SHOWCASE_CATEGORY_LABELS,
  slugify,
  slugifyLive,
  type ConstructionShowcase,
  type ShowcasePhoto,
  type ShowcaseStatus,
  type ProjectPhase,
  type ShowcaseCategory,
} from "@/lib/types/construction-showcase";

interface ShowcaseFormProps {
  showcase?: ConstructionShowcase & { photos?: ShowcasePhoto[] };
}

const labelClass = "block text-xs font-medium text-gray-500 mb-1";
const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/]/g, "_").replace(/\.{2,}/g, ".");
}

export default function ShowcaseForm({ showcase }: ShowcaseFormProps) {
  const router = useRouter();
  const isEdit = !!showcase;

  const [form, setForm] = useState({
    title: showcase?.title ?? "",
    slug: showcase?.slug ?? "",
    location: showcase?.location ?? "",
    description: showcase?.description ?? "",
    cover_image_url: showcase?.cover_image_url ?? "",
    sort_order: showcase?.sort_order?.toString() ?? "0",
    status: (showcase?.status as ShowcaseStatus) ?? "draft",
    project_phase: (showcase?.project_phase as ProjectPhase) ?? "completed",
    category: (showcase?.category as ShowcaseCategory) ?? "construction",
  });
  const [features, setFeatures] = useState<string[]>(showcase?.features ?? []);
  const [featureInput, setFeatureInput] = useState("");
  const [photos, setPhotos] = useState<ShowcasePhoto[]>(showcase?.photos ?? []);

  // Photos that have been picked but not yet uploaded. Used on the create
  // form so Blake can queue files before the showcase exists. On submit we
  // upload them all and register them against the new id.
  type PendingPhoto = { id: string; file: File; previewUrl: string };
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  // Track every object URL we mint so we can revoke them on unmount.
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
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const draggingIdRef = useRef<string | null>(null);

  // Touch-device detection — same pattern as the listings form. On touch
  // we disable HTML5 drag (it doesn't fire on touch and `draggable` traps
  // scroll via long-press image-save menus) and lean on the up/down
  // buttons added below.
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: coarse)");
    const apply = () => setIsTouchDevice(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Auto-fill slug from title for new showcases until user types in slug manually.
  function onTitleChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, title: value };
      if (!isEdit && (!prev.slug || prev.slug === slugify(prev.title))) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addFeature(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (features.includes(v)) {
      setFeatureInput("");
      return;
    }
    setFeatures((prev) => [...prev, v]);
    setFeatureInput("");
  }

  function removeFeature(idx: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadFile(file: File): Promise<string> {
    const supabase = createClient();
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File too large (max 20 MB)");
    }
    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are supported");
    }
    const slugPart = (showcase?.slug || form.slug || "showcase").replace(/[^a-z0-9-]/g, "");
    const path = `${slugPart || "showcase"}/${Date.now()}-${sanitizeFilename(file.name)}`;
    const { error } = await supabase.storage
      .from("construction-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabase.storage
      .from("construction-photos")
      .getPublicUrl(path);
    return urlData.publicUrl;
  }

  async function handleCoverUpload(file: File) {
    setCoverUploading(true);
    try {
      const url = await uploadFile(file);
      update("cover_image_url", url);
      toast.success("Cover photo set");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  function queuePendingPhotos(files: FileList) {
    const accepted: PendingPhoto[] = [];
    for (const f of Array.from(files)) {
      if (f.size > 20 * 1024 * 1024) {
        toast.error(`${f.name}: too large (max 20 MB)`);
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
      // No showcase row yet — queue files until save commits them.
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
          toast.error(`${f.name}: ${err instanceof Error ? err.message : "failed"}`);
        }
      }
      if (uploads.length > 0) {
        const res = await fetch(
          `/api/admin/construction-showcases/${showcase!.id}/photos`,
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
        const created: ShowcasePhoto[] = await res.json();
        setPhotos((prev) => [...prev, ...created]);
        toast.success(`${created.length} photo${created.length === 1 ? "" : "s"} added`);
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

  async function deletePhoto(photo: ShowcasePhoto) {
    if (!isEdit) return;
    if (!(await confirmAction("Remove this photo from the showcase?"))) return;
    try {
      const res = await fetch(
        `/api/admin/construction-showcases/${showcase!.id}/photos/${photo.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete photo");
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      // If this was the cover photo, also clear cover_image_url locally.
      if (form.cover_image_url === photo.url) update("cover_image_url", "");
      toast.success("Photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete photo");
    }
  }

  async function setCoverFromPhoto(photo: ShowcasePhoto) {
    update("cover_image_url", photo.url);
    toast.success("Cover photo updated");
  }

  async function generateDescription() {
    if (!isEdit) {
      toast.error("Save the showcase first, then generate.");
      return;
    }
    if (photos.length === 0) {
      toast.error("Upload at least one photo first.");
      return;
    }
    setGeneratingDescription(true);
    const dismissLoading = toast.loading("Reading the photos…");
    try {
      const res = await fetch(
        `/api/admin/construction-showcases/${showcase!.id}/generate-description`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Send the current (unsaved) form values so the AI sees what
            // Blake just typed, not what's still in the DB.
            title: form.title,
            location: form.location || null,
            features,
            photoUrls: photos.map((p) => p.url),
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate description");
      }
      const data = await res.json();
      const aiDescription =
        typeof data?.description === "string" ? data.description.trim() : "";
      const aiFeatures: string[] = Array.isArray(data?.features)
        ? data.features.filter(
            (f: unknown): f is string =>
              typeof f === "string" && f.trim().length > 0
          )
        : [];

      if (!aiDescription && aiFeatures.length === 0) {
        throw new Error("Got an empty response back");
      }

      if (aiDescription) {
        update("description", aiDescription);
      }
      // Merge new features in, skipping any that are already there
      // (case-insensitive). Cap at 10 so the chip list doesn't sprawl.
      let added = 0;
      if (aiFeatures.length > 0) {
        setFeatures((prev) => {
          const existing = new Set(prev.map((f) => f.toLowerCase()));
          const next = [...prev];
          for (const f of aiFeatures) {
            const v = f.trim();
            if (!v) continue;
            if (existing.has(v.toLowerCase())) continue;
            existing.add(v.toLowerCase());
            next.push(v);
            added++;
            if (next.length >= 10) break;
          }
          return next;
        });
      }

      const parts: string[] = [];
      if (aiDescription) parts.push("description drafted");
      if (added > 0) parts.push(`${added} feature${added === 1 ? "" : "s"} added`);
      toast.success(`${parts.join(", ")}. Review and tweak before saving.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate description");
    } finally {
      setGeneratingDescription(false);
      toast.dismiss(dismissLoading);
    }
  }

  // Drag-and-drop reorder using HTML5 DnD. Sufficient on desktop; mobile
  // users can edit the sort_order via the form's number field if they need
  // exact ordering.
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

  // Touch-friendly reorder. Same fallback the listings form uses — HTML5
  // drag-and-drop doesn't work on touch so we offer explicit up/down arrows.
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

  async function persistOrder(next: ShowcasePhoto[]) {
    setPhotos(next);
    try {
      const res = await fetch(
        `/api/admin/construction-showcases/${showcase!.id}/photos`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: next.map((p) => p.id) }),
        }
      );
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      toast.error("Could not save new order. Reloading.");
      setPhotos(showcase?.photos ?? []);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSavingNonPhotoFields(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: slugify(form.slug.trim() || form.title.trim()),
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        features,
        cover_image_url: form.cover_image_url || null,
        sort_order: form.sort_order ? Number(form.sort_order) : 0,
        status: form.status,
        project_phase: form.project_phase,
        category: form.category,
      };
      const url = isEdit
        ? `/api/admin/construction-showcases/${showcase!.id}`
        : `/api/admin/construction-showcases`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save showcase");
      }
      const saved = await res.json();
      const showcaseId = saved.id as string;

      // Flush queued photos. We do this in one sequential pass so progress
      // is reportable and failures are isolated.
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
              `/api/admin/construction-showcases/${showcaseId}/photos`,
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
          // Release the queued previews now that they're committed.
          pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          setPendingPhotos([]);
        } catch (err) {
          toast.dismiss(uploadToastId);
          toast.error(
            err instanceof Error ? err.message : "Photo upload failed"
          );
        }
      }

      const baseMsg = isEdit ? "Saved" : "Showcase created";
      const photoMsg =
        uploadedCount > 0
          ? `. ${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} uploaded.`
          : "";
      toast.success(`${baseMsg}${photoMsg}`);

      if (!isEdit) {
        router.push(`/admin/showcases/${showcaseId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save showcase");
    } finally {
      setSubmitting(false);
      setSavingNonPhotoFields(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Cover photo */}
      <div>
        <label className={labelClass}>Cover photo</label>
        {form.cover_image_url ? (
          <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <Image
              src={form.cover_image_url}
              alt="Cover"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => update("cover_image_url", "")}
              className="absolute top-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow hover:bg-white"
            >
              Replace
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full aspect-[3/2] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
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

      {/* Title + slug */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>Project title *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Haven Hideaway"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>URL slug</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => update("slug", slugifyLive(e.target.value))}
            onBlur={(e) => update("slug", slugify(e.target.value))}
            placeholder="haven-hideaway"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">/services/construction/projects/{form.slug || "…"}</p>
        </div>
      </div>

      {/* Service category — controls which public page the showcase appears on */}
      <div>
        <label className={labelClass}>Service category</label>
        <select
          value={form.category}
          onChange={(e) => update("category", e.target.value as ShowcaseCategory)}
          className={inputClass}
        >
          {Object.entries(SHOWCASE_CATEGORY_LABELS).map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Construction shows on /services/construction. Interior Design shows
          on /services/interior-design.
        </p>
      </div>

      {/* Location + phase */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Location</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="Hatch, UT"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Project phase</label>
          <select
            value={form.project_phase}
            onChange={(e) =>
              update("project_phase", e.target.value as ProjectPhase)
            }
            className={inputClass}
          >
            {Object.entries(PROJECT_PHASE_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Current shows under &ldquo;Current Projects&rdquo;. Completed
            shows under &ldquo;Most Recent Builds&rdquo;.
          </p>
        </div>
      </div>

      {/* Status + sort order */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as ShowcaseStatus)}
            className={inputClass}
          >
            {Object.entries(SHOWCASE_STATUS_LABELS).map(([slug, label]) => (
              <option key={slug} value={slug}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            Only Active appears on the website.
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
          <p className="mt-1 text-xs text-gray-400">Lower = shown first.</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelClass + " mb-0"}>Description</label>
          <button
            type="button"
            onClick={generateDescription}
            disabled={generatingDescription || !isEdit || photos.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:hover:bg-transparent"
            title={
              !isEdit
                ? "Save the showcase first"
                : photos.length === 0
                ? "Upload at least one photo first"
                : "Draft a description from the photos"
            }
          >
            {generatingDescription ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {generatingDescription ? "Reading photos…" : "Generate from photos"}
          </button>
        </div>
        <textarea
          rows={5}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="What makes this build feel like itself. Add photos and click Generate to draft from them."
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">
          The generated draft is yours to edit before saving.
        </p>
      </div>

      {/* Features chips */}
      <div>
        <label className={labelClass}>Features</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {features.map((f, idx) => (
            <span
              key={`${f}-${idx}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 text-sm"
            >
              {f}
              <button
                type="button"
                onClick={() => removeFeature(idx)}
                aria-label={`Remove ${f}`}
                className="hover:text-indigo-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addFeature(featureInput);
              }
            }}
            placeholder="Add a feature and press Enter"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => addFeature(featureInput)}
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Save bar (sticky so user can save without scrolling all the way down) */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => router.push("/admin/showcases")}
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
            <Hammer className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : "Create showcase"}
        </button>
      </div>

      {/* Photo gallery manager. Always visible. On the create form, files
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
              No photos yet. Click <strong>Add photos</strong> above to
              upload. You can select multiple files at once.
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
                const isCover = form.cover_image_url === p.url;
                const isFirst = idx === 0;
                const isLast = idx === photos.length - 1;
                return (
                  <div
                    key={p.id}
                    // HTML5 drag is desktop only — touch devices fall back
                    // to the up/down buttons below.
                    {...(isTouchDevice
                      ? {}
                      : {
                          draggable: true,
                          onDragStart: () => onDragStart(p.id),
                          onDragOver: (e: React.DragEvent) =>
                            e.preventDefault(),
                          onDrop: () => onDrop(p.id),
                        })}
                    className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                  >
                    <Image
                      src={p.url}
                      alt={p.alt ?? "Showcase photo"}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/40 transition-colors" />

                    <span className="hidden md:flex absolute top-1.5 left-1.5 h-9 w-9 items-center justify-center rounded-md bg-white/90 text-gray-700 opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <GripVertical className="h-4 w-4" />
                    </span>

                    {/* Star + X — 44 px touch targets on mobile, 36 px
                        hover-reveal on desktop. Solid white background so
                        they pop over any photo. */}
                    <button
                      type="button"
                      onClick={() => setCoverFromPhoto(p)}
                      title={isCover ? "This is the cover photo" : "Set as cover"}
                      aria-label={isCover ? "Cover photo" : "Set as cover"}
                      className={`absolute top-1.5 right-[3.5rem] md:right-12 h-11 w-11 md:h-9 md:w-9 inline-flex items-center justify-center rounded-md shadow-sm transition-colors ${
                        isCover
                          ? "bg-amber-400 text-white"
                          : "bg-white text-gray-900 md:opacity-0 md:group-hover:opacity-100 hover:bg-amber-400 hover:text-white"
                      }`}
                    >
                      {isCover ? (
                        <Star className="h-5 w-5 md:h-4 md:w-4 fill-current" />
                      ) : (
                        <StarOff className="h-5 w-5 md:h-4 md:w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePhoto(p)}
                      title="Remove photo"
                      aria-label="Remove photo"
                      className="absolute top-1.5 right-1.5 h-11 w-11 md:h-9 md:w-9 inline-flex items-center justify-center rounded-md bg-white text-red-600 shadow-sm hover:bg-red-600 hover:text-white transition-colors md:opacity-0 md:group-hover:opacity-100"
                    >
                      <X className="h-5 w-5 md:h-4 md:w-4" />
                    </button>

                    {/* Move up/down — touch-friendly reorder. Always visible
                        on mobile, hover-reveal on desktop. */}
                    <div className="absolute bottom-1.5 left-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => movePhoto(p.id, "up")}
                        disabled={isFirst}
                        title="Move up"
                        aria-label="Move photo up"
                        className="h-11 w-11 md:h-9 md:w-9 inline-flex items-center justify-center rounded-md bg-white text-gray-900 shadow-sm hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-900 disabled:cursor-not-allowed md:opacity-0 md:group-hover:opacity-100"
                      >
                        <ChevronUp className="h-5 w-5 md:h-4 md:w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(p.id, "down")}
                        disabled={isLast}
                        title="Move down"
                        aria-label="Move photo down"
                        className="h-11 w-11 md:h-9 md:w-9 inline-flex items-center justify-center rounded-md bg-white text-gray-900 shadow-sm hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-900 disabled:cursor-not-allowed md:opacity-0 md:group-hover:opacity-100"
                      >
                        <ChevronDown className="h-5 w-5 md:h-4 md:w-4" />
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
