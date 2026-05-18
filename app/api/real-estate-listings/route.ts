import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — returns active/pending listings only. Uses service-role
// client so it works regardless of RLS state, but the SELECT explicitly
// filters by status so we never leak drafts/sold/archived rows.
export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("real_estate_listings")
    .select(
      "id, address, city, state, zip, price, bedrooms, bathrooms, square_footage, lot_size, property_type, mls_url, cover_photo_url, description, status, sort_order, featured, listed_at"
    )
    .in("status", ["active", "pending"])
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
