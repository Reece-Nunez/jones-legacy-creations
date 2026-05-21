import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { slugify } from "@/lib/types/construction-showcase";

const ALLOWED_FIELDS = [
  "slug",
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

// Build a default slug from "address-city-state". The caller can override
// by passing slug in the body. Used only when the body is missing one.
function deriveSlug(parts: { address?: string; city?: string; state?: string }): string {
  const raw = [parts.address, parts.city, parts.state]
    .filter((s): s is string => Boolean(s && s.trim()))
    .join(" ");
  return slugify(raw);
}

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

  // Ensure we always have a slug. If the form sent one, normalize it. If not,
  // derive one from the address. We retry once with a short suffix on a
  // unique-violation collision so two listings at the same address don't crash.
  const baseSlug =
    (typeof insert.slug === "string" && insert.slug.trim()
      ? slugify(insert.slug as string)
      : null) ||
    deriveSlug({
      address: insert.address as string,
      city: insert.city as string,
      state: insert.state as string | undefined,
    });

  if (!baseSlug) {
    return NextResponse.json(
      { error: "Could not derive a slug from the address" },
      { status: 400 }
    );
  }

  for (const candidate of [
    baseSlug,
    `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`,
  ]) {
    const { data, error } = await supabase
      .from("real_estate_listings")
      .insert({ ...insert, slug: candidate })
      .select()
      .single();

    if (!error) {
      return NextResponse.json(data, { status: 201 });
    }
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // 23505 = unique_violation → fall through and try the suffixed candidate
  }

  return NextResponse.json(
    { error: "Could not find a unique slug for this listing" },
    { status: 409 }
  );
}
