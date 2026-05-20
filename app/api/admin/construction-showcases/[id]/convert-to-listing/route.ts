import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// POST /api/admin/construction-showcases/[id]/convert-to-listing
// Creates a draft real_estate_listing pre-filled from a showcase.
// Blake then opens the listing in /admin/listings/[id] and fills in
// price, beds/baths/sqft, MLS URL, etc.

function parseLocation(loc: string | null) {
  if (!loc) return { city: "", state: "UT" };
  const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { city: parts[0], state: parts[1].slice(0, 2).toUpperCase() };
  }
  return { city: parts[0] ?? "", state: "UT" };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: showcase, error: showcaseErr } = await supabase
    .from("construction_showcases")
    .select(
      "id, title, location, description, cover_image_url"
    )
    .eq("id", id)
    .single();
  if (showcaseErr || !showcase) {
    return NextResponse.json({ error: "Showcase not found" }, { status: 404 });
  }

  const { city, state } = parseLocation(showcase.location);

  // The listings table requires non-null address + city. Use the showcase
  // title as the placeholder address so Blake at least sees what project
  // this came from; he'll edit it before publishing.
  const insert = {
    address: showcase.title || "Address pending",
    city: city || "Update before publishing",
    state: state || "UT",
    description: showcase.description ?? null,
    cover_photo_url: showcase.cover_image_url ?? null,
    status: "draft" as const,
  };

  const { data: listing, error: listingErr } = await supabase
    .from("real_estate_listings")
    .insert(insert)
    .select()
    .single();

  if (listingErr) {
    return NextResponse.json({ error: listingErr.message }, { status: 400 });
  }

  return NextResponse.json(listing, { status: 201 });
}
