"use client";

/**
 * Post editor — markdown textarea with live HTML preview.
 *
 * Server renders posts via `marked` on every request. Here in the
 * admin we lazy-load `marked` once on the client and re-render the
 * preview pane as the writer types. Keeps the editing experience
 * tight without round-tripping to the server.
 *
 * Two-pane on desktop (edit left, preview right); stacked on mobile
 * with a tab switcher.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Marked } from "marked";
import { Eye, Loader2, Save, Trash2 } from "lucide-react";
import { confirmAction } from "@/lib/confirmAction";
import { slugify } from "@/lib/blog/markdown";

const marked = new Marked({ gfm: true, breaks: false });

interface ExistingPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_description: string | null;
  content_md: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tags: string[] | null;
  author_name: string | null;
  status: string;
  published_at: string | null;
}

interface Form {
  title: string;
  slug: string;
  excerpt: string;
  meta_description: string;
  content_md: string;
  cover_image_url: string;
  cover_image_alt: string;
  tags: string;
  author_name: string;
  status: "draft" | "published" | "archived";
}

export default function PostForm({ existing }: { existing?: ExistingPost }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [slugTouched, setSlugTouched] = useState(!!existing?.slug);

  const [form, setForm] = useState<Form>({
    title: existing?.title ?? "",
    slug: existing?.slug ?? "",
    excerpt: existing?.excerpt ?? "",
    meta_description: existing?.meta_description ?? "",
    content_md: existing?.content_md ?? "",
    cover_image_url: existing?.cover_image_url ?? "",
    cover_image_alt: existing?.cover_image_alt ?? "",
    tags: Array.isArray(existing?.tags) ? existing.tags.join(", ") : "",
    author_name: existing?.author_name ?? "",
    status: (existing?.status as Form["status"]) ?? "draft",
  });

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Auto-derive the slug from the title until the user manually
  // touches the slug field — typical CMS UX.
  useEffect(() => {
    if (!slugTouched && form.title) {
      const next = slugify(form.title);
      setForm((prev) => (prev.slug === next ? prev : { ...prev, slug: next }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, slugTouched]);

  const previewHtml = useMemo(
    () => marked.parse(form.content_md || "", { async: false }) as string,
    [form.content_md],
  );

  async function save() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Slug is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        meta_description: form.meta_description.trim() || null,
        content_md: form.content_md,
        cover_image_url: form.cover_image_url.trim() || null,
        cover_image_alt: form.cover_image_alt.trim() || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        author_name: form.author_name.trim() || null,
        status: form.status,
      };
      const url = existing
        ? `/api/admin/posts/${existing.id}`
        : `/api/admin/posts`;
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
      router.push("/admin/posts");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!(await confirmAction("Delete this post permanently?"))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/posts/${existing.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Delete failed");
        return;
      }
      toast.success("Deleted");
      router.push("/admin/posts");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Top metadata strip */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-6 space-y-3">
        <Field label="Title (required)">
          <input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputCls + " text-lg"}
            placeholder="Cost to build a custom home in Washington County, 2026"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Slug"
            hint="URL: /blog/<slug>. Auto-fills from title; click to edit."
          >
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", e.target.value);
              }}
              className={inputCls + " font-mono"}
              placeholder="cost-to-build-2026"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as Form["status"])
              }
              className={`${inputCls} cursor-pointer bg-white`}
            >
              <option value="draft">Draft (not visible)</option>
              <option value="published">Published (live)</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          </Field>
        </div>

        <Field
          label="Excerpt"
          hint="1-2 sentences. Shown under the title on the index card."
        >
          <textarea
            value={form.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            rows={2}
            className={inputCls}
            placeholder="What this post covers in two sentences."
          />
        </Field>

        <Field
          label="Meta description (SEO)"
          hint="Falls back to the excerpt if blank. Aim for under 160 characters."
        >
          <textarea
            value={form.meta_description}
            onChange={(e) => update("meta_description", e.target.value)}
            rows={2}
            className={inputCls}
            placeholder={`Falls back to the excerpt: "${form.excerpt}"`}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Author name">
            <input
              value={form.author_name}
              onChange={(e) => update("author_name", e.target.value)}
              className={inputCls}
              placeholder="Blake Jones"
            />
          </Field>
          <Field label="Tags (comma-separated)">
            <input
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
              className={inputCls}
              placeholder="Cost guide, Hurricane"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
          <Field
            label="Cover image URL"
            hint="Used as the index thumbnail + OG card image."
          >
            <input
              value={form.cover_image_url}
              onChange={(e) => update("cover_image_url", e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
          <Field label="Cover alt text">
            <input
              value={form.cover_image_alt}
              onChange={(e) => update("cover_image_alt", e.target.value)}
              className={inputCls}
              placeholder="Custom home in Hurricane, UT"
            />
          </Field>
        </div>
      </div>

      {/* Body editor + preview */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {/* Tab switcher (mobile primary, desktop secondary) */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 text-sm font-medium ${
              activeTab === "edit"
                ? "text-gray-900 border-b-2 border-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Markdown
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 text-sm font-medium sm:hidden ${
              activeTab === "preview"
                ? "text-gray-900 border-b-2 border-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Preview
          </button>
          <p className="hidden sm:flex ml-auto px-4 py-2.5 text-xs text-gray-500 items-center gap-1">
            <Eye className="w-3 h-3" />
            Live preview on the right
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Edit pane */}
          <div
            className={`p-4 ${activeTab === "edit" ? "block" : "hidden sm:block"} ${activeTab === "edit" ? "" : "sm:border-r border-gray-200"} border-r border-gray-200 sm:border-r`}
          >
            <textarea
              value={form.content_md}
              onChange={(e) => update("content_md", e.target.value)}
              rows={24}
              className="w-full border-0 focus:outline-none font-mono text-sm resize-none"
              placeholder={`# Section heading

Write in markdown. Supports headings, **bold**, *italic*, [links](url), bullet lists, > blockquotes, and code blocks.

## Why a markdown editor

Because typing in markdown is faster than wrestling a rich-text WYSIWYG, and the output is portable across any future blog rebuild.`}
            />
          </div>

          {/* Preview pane */}
          <div
            className={`p-6 ${activeTab === "preview" ? "block" : "hidden sm:block"}`}
          >
            {form.content_md.trim() ? (
              <div
                className="post-preview prose-like"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <p className="text-sm text-gray-400 italic">
                Preview appears here as you type.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex flex-wrap items-center gap-2 sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 -mx-4 sm:-mx-0 sm:rounded-lg sm:border">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {existing ? "Save Changes" : "Create Post"}
        </button>
        {form.status === "published" && (
          <span className="text-xs text-emerald-700">
            Live at /blog/{form.slug || "…"}
          </span>
        )}
        {existing && (
          <button
            onClick={remove}
            disabled={deleting || saving}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>

      {/* Preview styling */}
      <style>{`
        .post-preview h1 { font-family: Georgia, serif; font-weight: 700; font-size: 1.875rem; margin: 1.25rem 0 0.75rem; line-height: 1.15; }
        .post-preview h2 { font-family: Georgia, serif; font-weight: 700; font-size: 1.5rem; margin: 1.75rem 0 0.75rem; line-height: 1.2; }
        .post-preview h3 { font-family: Georgia, serif; font-weight: 700; font-size: 1.25rem; margin: 1.5rem 0 0.5rem; }
        .post-preview p { margin: 0 0 1rem; line-height: 1.65; color: #374151; font-size: 0.9375rem; }
        .post-preview a { color: #1a1a1a; text-decoration: underline; text-underline-offset: 2px; }
        .post-preview ul, .post-preview ol { margin: 0 0 1rem 1.25rem; padding: 0; }
        .post-preview li { margin: 0 0 0.375rem; font-size: 0.9375rem; color: #374151; }
        .post-preview blockquote { border-left: 3px solid #cbd5e1; padding: 0.125rem 1rem; margin: 1rem 0; font-style: italic; color: #475569; }
        .post-preview code { background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 3px; font-size: 0.85em; }
        .post-preview pre { background: #f1f5f9; padding: 0.875rem; border-radius: 4px; overflow-x: auto; margin: 1rem 0; }
        .post-preview pre code { background: transparent; padding: 0; }
        .post-preview img { max-width: 100%; height: auto; margin: 1rem 0; }
        .post-preview hr { border: 0; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
        .post-preview table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
        .post-preview th, .post-preview td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; font-size: 0.875rem; }
        .post-preview th { background: #f8fafc; font-weight: 600; }
      `}</style>
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
