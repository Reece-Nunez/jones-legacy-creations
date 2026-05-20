import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — returns active showcases (with their photos) for the
// website. Uses service-role to bypass RLS but explicitly filters by status
// so drafts never leak.
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const slug = request.nextUrl.searchParams.get("slug");

  let query = supabase
    .from("construction_showcases")
    .select(
      `id, slug, title, location, description, features, cover_image_url, sort_order, project_phase,
       photos:construction_showcase_photos(id, url, alt, sort_order)`
    )
    .eq("status", "active");

  if (slug) {
    query = query.eq("slug", slug);
  } else {
    query = query.order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort each showcase's photos client-side here.
  type Row = {
    photos?: { id: string; url: string; alt: string | null; sort_order: number }[];
  };
  for (const r of (data ?? []) as Row[]) {
    r.photos = (r.photos ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  }

  return NextResponse.json(slug ? (data?.[0] ?? null) : (data ?? []));
}
