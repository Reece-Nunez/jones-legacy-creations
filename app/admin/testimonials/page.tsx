/**
 * /admin/testimonials — list + bulk publish toggle.
 *
 * Lives next to /admin/leads in the AdminShell. Blake's flow is:
 *   1. Get a happy text/email from a client.
 *   2. Click "+ New" here, paste the quote, fill name/role/service.
 *   3. Save as 'draft' to polish.
 *   4. Toggle to 'published' → quote appears on the matching service
 *      page within seconds (server component, no caching beyond the
 *      Next render).
 */

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Plus, Star } from "lucide-react";
import TestimonialsList from "@/components/admin/TestimonialsList";

export default async function TestimonialsAdminPage() {
  const supabase = await createClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .order("status", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const all = testimonials ?? [];
  const counts = {
    draft: all.filter((t) => t.status === "draft").length,
    published: all.filter((t) => t.status === "published").length,
    archived: all.filter((t) => t.status === "archived").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
              <Star className="w-6 h-6 text-amber-500" />
              Testimonials
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Client quotes on the public service pages.{" "}
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
              href="/admin/testimonials/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="w-4 h-4" />
              New
            </Link>
          </div>
        </div>

        <TestimonialsList testimonials={all} />
      </div>
    </div>
  );
}
