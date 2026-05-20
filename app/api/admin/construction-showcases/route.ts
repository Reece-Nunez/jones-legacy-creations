import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { slugify } from "@/lib/types/construction-showcase";

const ALLOWED_FIELDS = [
  "title",
  "slug",
  "location",
  "description",
  "features",
  "cover_image_url",
  "sort_order",
  "status",
  "project_phase",
] as const;

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("construction_showcases")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;
  const body = await request.json();

  const insert: Record<string, unknown> = { created_by: profile.id };
  for (const key of ALLOWED_FIELDS) {
    if (key in body) insert[key] = body[key] === "" ? null : body[key];
  }

  if (!insert.title || typeof insert.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  // Auto-slug from title when caller didn't provide one.
  if (!insert.slug) insert.slug = slugify(String(insert.title));

  const { data, error } = await supabase
    .from("construction_showcases")
    .insert(insert)
    .select()
    .single();

  if (error) {
    // 23505 = unique violation on slug — try with a numeric suffix.
    if (error.code === "23505" && insert.slug) {
      const base = insert.slug as string;
      for (let i = 2; i < 100; i++) {
        const trial = `${base}-${i}`;
        const { data: retry, error: retryErr } = await supabase
          .from("construction_showcases")
          .insert({ ...insert, slug: trial })
          .select()
          .single();
        if (!retryErr) return NextResponse.json(retry, { status: 201 });
        if (retryErr.code !== "23505") {
          return NextResponse.json({ error: retryErr.message }, { status: 400 });
        }
      }
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
