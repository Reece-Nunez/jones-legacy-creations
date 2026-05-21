import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// POST body shape: { url, alt?, sort_order? }   (single)
//                OR { photos: [{ url, alt?, sort_order? }, ...] } (batch)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  const incoming = Array.isArray(body.photos)
    ? body.photos
    : body.url
      ? [body]
      : null;

  if (!incoming) {
    return NextResponse.json(
      { error: "Provide url or photos: [...]" },
      { status: 400 }
    );
  }

  // Find current max sort_order to append below it.
  const { data: maxRow } = await supabase
    .from("real_estate_listing_photos")
    .select("sort_order")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = (maxRow?.sort_order ?? -1) + 1;

  const rows = incoming.map(
    (p: { url: string; alt?: string; sort_order?: number }) => ({
      listing_id: listingId,
      url: p.url,
      alt: p.alt ?? null,
      sort_order: typeof p.sort_order === "number" ? p.sort_order : next++,
    })
  );

  const { data, error } = await supabase
    .from("real_estate_listing_photos")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}

// PATCH body: { order: [photoId, photoId, ...] } — reorder by id sequence
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  if (!Array.isArray(body.order)) {
    return NextResponse.json(
      { error: "order: [photoId, ...] is required" },
      { status: 400 }
    );
  }

  const updates = body.order.map((photoId: string, idx: number) =>
    supabase
      .from("real_estate_listing_photos")
      .update({ sort_order: idx })
      .eq("id", photoId)
      .eq("listing_id", listingId)
  );

  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error)?.error;
  if (firstErr) {
    return NextResponse.json({ error: firstErr.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
