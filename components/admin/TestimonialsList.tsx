"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState } from "react";
import { Edit3, Star, Trash2 } from "lucide-react";
import { confirmAction } from "@/lib/confirmAction";

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string | null;
  service: string;
  rating: number | null;
  quote: string;
  status: string;
  display_order: number;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

const SERVICE_LABEL: Record<string, string> = {
  construction: "Construction",
  real_estate: "Real Estate",
  interior_design: "Interior Design",
  general: "General",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-gray-200 text-gray-600",
};

export default function TestimonialsList({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  if (testimonials.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Star className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">
          No testimonials yet. Click <strong>+ New</strong> to add your first.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {testimonials.map((t) => (
        <TestimonialRow key={t.id} t={t} />
      ))}
    </div>
  );
}

function TestimonialRow({ t }: { t: Testimonial }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(t.status);

  async function updateStatus(newStatus: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/testimonials/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Update failed");
        return;
      }
      setStatus(newStatus);
      toast.success(`Marked as ${newStatus}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!(await confirmAction("Delete this testimonial?"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/testimonials/${t.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Deleted");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{t.author_name}</span>
            {t.author_role && (
              <span className="text-xs text-gray-500">{t.author_role}</span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[status] || "bg-gray-100"}`}
            >
              {status}
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
              {SERVICE_LABEL[t.service] || t.service}
            </span>
            {t.rating != null && (
              <span className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: t.rating }, (_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 italic">&ldquo;{t.quote}&rdquo;</p>
          {t.source_url && (
            <a
              href={t.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[11px] text-indigo-600 hover:text-indigo-500"
            >
              View original{t.source ? ` (${t.source})` : ""}
            </a>
          )}
        </div>
        <div className="flex sm:flex-col items-center gap-2">
          <select
            value={status}
            disabled={busy}
            onChange={(e) => updateStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white cursor-pointer disabled:opacity-50"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <Link
            href={`/admin/testimonials/${t.id}`}
            className="p-1.5 text-gray-500 hover:text-indigo-600"
            aria-label="Edit"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={remove}
            disabled={busy}
            className="p-1.5 text-gray-500 hover:text-rose-600 disabled:opacity-50"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
