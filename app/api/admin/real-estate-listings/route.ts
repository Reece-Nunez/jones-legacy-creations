import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

const ALLOWED_FIELDS = [
  "address",
  "city",
  "state",
  "zip",
  "price",
  "bedrooms",
  "bathrooms",
  "square_footage",
  "lot_size",
  "property_type",
  "mls_url",
  "cover_photo_url",
  "description",
  "status",
  "sort_order",
  "featured",
  "listed_at",
] as const;

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("real_estate_listings")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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

  if (!insert.address || !insert.city) {
    return NextResponse.json(
      { error: "address and city are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("real_estate_listings")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
