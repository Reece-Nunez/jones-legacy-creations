import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { estimateReadingTimeMinutes } from "@/lib/blog/markdown";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  // Recompute reading_time_minutes on every content edit so the
  // public card stays accurate.
  if (typeof body.content_md === "string") {
    body.reading_time_minutes = estimateReadingTimeMinutes(body.content_md);
  }

  // First-time publish: stamp published_at so the index sort works.
  if (body.status === "published" && !body.published_at) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("published_at")
      .eq("id", id)
      .single();
    if (!existing?.published_at) {
      body.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("blog_posts")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
