import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { generateShowcaseDescription } from "@/lib/generate-showcase-description";

// POST /api/admin/construction-showcases/[id]/generate-description
// Body (optional): { title, location, features, photoUrls } — caller may
// override the persisted values (handy when the form has unsaved edits).
// If omitted, we pull whatever is in the DB.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  let override: {
    title?: string;
    location?: string | null;
    features?: string[];
    photoUrls?: string[];
  } = {};
  try {
    override = await request.json();
  } catch {
    // No body, that's fine — we'll just use the DB row
  }

  const { data: showcase, error } = await supabase
    .from("construction_showcases")
    .select("id, title, location, features")
    .eq("id", id)
    .single();
  if (error || !showcase) {
    return NextResponse.json({ error: "Showcase not found" }, { status: 404 });
  }

  let photoUrls = override.photoUrls;
  if (!Array.isArray(photoUrls)) {
    const { data: photos } = await supabase
      .from("construction_showcase_photos")
      .select("url, sort_order")
      .eq("showcase_id", id)
      .order("sort_order", { ascending: true })
      .limit(8);
    photoUrls = (photos ?? []).map((p) => p.url);
  }

  if (!photoUrls || photoUrls.length === 0) {
    return NextResponse.json(
      { error: "Add at least one photo before generating a description." },
      { status: 400 }
    );
  }

  try {
    const description = await generateShowcaseDescription({
      title: override.title ?? showcase.title,
      location:
        override.location !== undefined ? override.location : showcase.location,
      features: Array.isArray(override.features)
        ? override.features
        : (showcase.features ?? []),
      photoUrls,
    });
    return NextResponse.json({ description });
  } catch (err) {
    console.error("Failed to generate showcase description:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to generate description",
      },
      { status: 500 }
    );
  }
}
