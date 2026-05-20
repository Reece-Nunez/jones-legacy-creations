import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const LISTING_PHOTOS_BUCKET = "real-estate-photos";

function storagePathFromUrl(url: string | null, bucket: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const marker = "/storage/v1/object/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    let rest = u.pathname.slice(i + marker.length);
    if (rest.startsWith("public/")) rest = rest.slice("public/".length);
    if (rest.startsWith("sign/")) rest = rest.slice("sign/".length);
    if (!rest.startsWith(`${bucket}/`)) return null;
    return decodeURIComponent(rest.slice(bucket.length + 1));
  } catch {
    return null;
  }
}

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("real_estate_listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key] === "" ? null : body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("real_estate_listings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  // Grab the cover photo path before we delete the row so we can clean it up.
  const { data: listing } = await supabase
    .from("real_estate_listings")
    .select("cover_photo_url")
    .eq("id", id)
    .maybeSingle();

  const coverPath = storagePathFromUrl(
    listing?.cover_photo_url ?? null,
    LISTING_PHOTOS_BUCKET
  );

  const { error } = await supabase
    .from("real_estate_listings")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort storage cleanup. Don't fail the API if storage hiccups.
  if (coverPath) {
    try {
      const admin = createAdminClient();
      await admin.storage.from(LISTING_PHOTOS_BUCKET).remove([coverPath]);
    } catch (err) {
      console.warn("Listing delete: storage cleanup failed", err);
    }
  }

  return NextResponse.json({ success: true });
}
