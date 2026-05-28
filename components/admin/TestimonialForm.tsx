"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Save, Star } from "lucide-react";

interface ExistingTestimonial {
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
  author_photo_url: string | null;
}

interface Form {
  author_name: string;
  author_role: string;
  service: "construction" | "real_estate" | "interior_design" | "general";
  rating: string;
  quote: string;
  status: "draft" | "published" | "archived";
  display_order: string;
  source: string;
  source_url: string;
  author_photo_url: string;
}

export default function TestimonialForm({
  existing,
}: {
  existing?: ExistingTestimonial;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>({
    author_name: existing?.author_name ?? "",
    author_role: existing?.author_role ?? "",
    service: (existing?.service as Form["service"]) ?? "construction",
    rating: existing?.rating != null ? String(existing.rating) : "",
    quote: existing?.quote ?? "",
    status: (existing?.status as Form["status"]) ?? "draft",
    display_order: String(existing?.display_order ?? 100),
    source: existing?.source ?? "manual",
    source_url: existing?.source_url ?? "",
    author_photo_url: existing?.author_photo_url ?? "",
  });

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!form.author_name.trim() || !form.quote.trim()) {
      toast.error("Author name and quote are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        author_name: form.author_name.trim(),
        author_role: form.author_role.trim() || null,
        service: form.service,
        rating: form.rating ? parseInt(form.rating) : null,
        quote: form.quote.trim(),
        status: form.status,
        display_order: parseInt(form.display_order) || 100,
        source: form.source.trim() || "manual",
        source_url: form.source_url.trim() || null,
        author_photo_url: form.author_photo_url.trim() || null,
      };
      const url = existing
        ? `/api/admin/testimonials/${existing.id}`
        : `/api/admin/testimonials`;
      const method = existing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Save failed");
        return;
      }
      toast.success(existing ? "Updated" : "Created");
      router.push("/admin/testimonials");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Author name (required)">
          <input
            value={form.author_name}
            onChange={(e) => update("author_name", e.target.value)}
            className={inputCls}
            placeholder="Sarah Reynolds"
          />
        </Field>
        <Field label="Author role / context">
          <input
            value={form.author_role}
            onChange={(e) => update("author_role", e.target.value)}
            className={inputCls}
            placeholder="Homeowner, Hurricane UT"
          />
        </Field>
        <Field label="Service (required)">
          <select
            value={form.service}
            onChange={(e) => update("service", e.target.value as Form["service"])}
            className={`${inputCls} cursor-pointer bg-white`}
          >
            <option value="construction">Construction</option>
            <option value="real_estate">Real Estate</option>
            <option value="interior_design">Interior Design</option>
            <option value="general">General (shown everywhere)</option>
          </select>
        </Field>
        <Field label="Rating (1-5, optional)">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = parseInt(form.rating || "0") >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    update("rating", String(form.rating === String(n) ? "" : n))
                  }
                  className="p-1"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  <Star
                    className={`w-5 h-5 ${active ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                  />
                </button>
              );
            })}
            {form.rating && (
              <button
                type="button"
                onClick={() => update("rating", "")}
                className="ml-2 text-xs text-gray-500 hover:text-gray-700"
              >
                clear
              </button>
            )}
          </div>
        </Field>
      </div>

      <Field label="Quote (required)" hint="The client's words. Trim to the punchiest part if it's long.">
        <textarea
          value={form.quote}
          onChange={(e) => update("quote", e.target.value)}
          rows={4}
          className={inputCls}
          placeholder="Blake and his team built our dream home on time and on budget…"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) => update("status", e.target.value as Form["status"])}
            className={`${inputCls} cursor-pointer bg-white`}
          >
            <option value="draft">Draft (not shown)</option>
            <option value="published">Published (live)</option>
            <option value="archived">Archived (hidden)</option>
          </select>
        </Field>
        <Field
          label="Display order"
          hint="Lower = first. Defaults to 100."
        >
          <input
            type="number"
            value={form.display_order}
            onChange={(e) => update("display_order", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field
          label="Source"
          hint="manual / google / yelp / facebook"
        >
          <input
            value={form.source}
            onChange={(e) => update("source", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Source URL (optional)" hint="Link to the original Google/Yelp review.">
          <input
            value={form.source_url}
            onChange={(e) => update("source_url", e.target.value)}
            className={inputCls}
            placeholder="https://maps.google.com/…"
          />
        </Field>
        <Field label="Author photo URL (optional)">
          <input
            value={form.author_photo_url}
            onChange={(e) => update("author_photo_url", e.target.value)}
            className={inputCls}
            placeholder="https://…"
          />
        </Field>
      </div>

      <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {existing ? "Save Changes" : "Create Testimonial"}
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}
