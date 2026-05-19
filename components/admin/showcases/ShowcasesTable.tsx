"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Trash2, Copy, Plus, Hammer, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmAction } from "@/lib/confirmAction";
import {
  SHOWCASE_STATUS_COLORS,
  SHOWCASE_STATUS_LABELS,
  type ConstructionShowcase,
} from "@/lib/types/construction-showcase";

interface Props {
  showcases: ConstructionShowcase[];
}

export default function ShowcasesTable({ showcases }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  async function handleDelete(s: ConstructionShowcase) {
    if (
      !(await confirmAction(
        `Delete "${s.title}" from the website? This also removes its photos. Cannot be undone.`
      ))
    )
      return;
    setDeletingId(s.id);
    try {
      const res = await fetch(`/api/admin/construction-showcases/${s.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete showcase");
      }
      toast.success("Showcase deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete showcase");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDuplicate(s: ConstructionShowcase) {
    setDuplicatingId(s.id);
    try {
      const res = await fetch("/api/admin/construction-showcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${s.title} (copy)`,
          location: s.location,
          description: s.description,
          features: s.features,
          cover_image_url: s.cover_image_url,
          sort_order: s.sort_order,
          status: "draft",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to duplicate showcase");
      }
      const created = await res.json();
      toast.success("Duplicated — opening edit");
      router.push(`/admin/showcases/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate showcase");
    } finally {
      setDuplicatingId(null);
    }
  }

  if (showcases.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <Hammer className="mx-auto h-10 w-10 text-gray-300" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No showcase projects yet</h3>
        <p className="mt-2 text-sm text-gray-500">
          Add a project here to feature it on the public Construction page.
        </p>
        <Link
          href="/admin/showcases/new"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Add Showcase Project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showcases.map((s) => (
        <div
          key={s.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <Link
            href={`/admin/showcases/${s.id}`}
            className="flex flex-col sm:flex-row group"
            aria-label={`Edit showcase ${s.title}`}
          >
            <div className="sm:w-48 sm:shrink-0 aspect-[4/3] sm:aspect-auto relative bg-gray-100">
              {s.cover_image_url ? (
                <Image
                  src={s.cover_image_url}
                  alt={s.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 192px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Hammer className="h-10 w-10 text-gray-300" />
                </div>
              )}
            </div>
            <div className="flex-1 p-4 sm:p-5 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                    {s.title}
                  </h3>
                  {s.location && (
                    <p className="text-sm text-gray-500">{s.location}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                    SHOWCASE_STATUS_COLORS[s.status]
                  )}
                >
                  {SHOWCASE_STATUS_LABELS[s.status]}
                </span>
              </div>
              {s.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {s.description}
                </p>
              )}
              {s.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {s.features.slice(0, 4).map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                    >
                      {f}
                    </span>
                  ))}
                  {s.features.length > 4 && (
                    <span className="text-xs text-gray-500 self-center">
                      +{s.features.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex-wrap">
            {s.status === "active" && (
              <a
                href={`/services/construction/projects/${s.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 mr-auto"
              >
                View on site <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Link
              href={`/admin/showcases/${s.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <button
              onClick={() => handleDuplicate(s)}
              disabled={duplicatingId === s.id}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              title="Make a copy as a draft"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button
              onClick={() => handleDelete(s)}
              disabled={deletingId === s.id}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 min-h-[40px] text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
