import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import {
  estimateReadingTimeMinutes,
  slugify,
} from "@/lib/blog/markdown";

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("status", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  if (!body.title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  const slug = body.slug?.trim() || slugify(body.title);
  if (!slug) {
    return NextResponse.json({ error: "Could not derive slug" }, { status: 400 });
  }

  const reading_time_minutes = estimateReadingTimeMinutes(body.content_md || "");

  // If the row is being created as published, default published_at to
  // now so the post immediately appears in the public index.
  const published_at =
    body.published_at ??
    (body.status === "published" ? new Date().toISOString() : null);

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      ...body,
      slug,
      reading_time_minutes,
      published_at,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
