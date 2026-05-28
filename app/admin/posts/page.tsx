import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Plus, FileText, Eye, Edit3 } from "lucide-react";
import { formatDate } from "@/lib/formatters";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-700",
  archived: "bg-gray-200 text-gray-600",
};

export default async function PostsAdminPage() {
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, status, author_name, published_at, updated_at, reading_time_minutes",
    )
    .order("status", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const all = posts ?? [];
  const counts = {
    draft: all.filter((p) => p.status === "draft").length,
    published: all.filter((p) => p.status === "published").length,
    archived: all.filter((p) => p.status === "archived").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <FileText className="w-6 h-6 text-indigo-500" />
              Blog Posts
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              <span className="text-emerald-700 font-semibold">
                {counts.published} live
              </span>
              {counts.draft > 0 && (
                <>
                  {" · "}
                  <span className="text-gray-600">{counts.draft} draft</span>
                </>
              )}
              {counts.archived > 0 && (
                <>
                  {" · "}
                  <span className="text-gray-500">{counts.archived} archived</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <Link
              href="/admin/posts/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Link>
          </div>
        </div>

        {all.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No posts yet. Click <strong>+ New Post</strong> to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {all.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[p.status] || "bg-gray-100"}`}
                      >
                        {p.status}
                      </span>
                      {p.published_at && (
                        <span className="text-[11px] text-gray-500">
                          {formatDate(p.published_at)}
                        </span>
                      )}
                      {p.reading_time_minutes && (
                        <span className="text-[11px] text-gray-500">
                          {p.reading_time_minutes} min read
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 truncate">
                        /blog/{p.slug}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {p.title || "(untitled)"}
                    </h3>
                    {p.excerpt && (
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                        {p.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.status === "published" && (
                      <Link
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        className="p-1.5 text-gray-500 hover:text-indigo-600"
                        aria-label="View live"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    )}
                    <Link
                      href={`/admin/posts/${p.id}`}
                      className="p-1.5 text-gray-500 hover:text-indigo-600"
                      aria-label="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
