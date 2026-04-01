import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch items with their section's sort_order for ordering
  const { data: sections, error: sectionsError } = await supabase
    .from("quote_sections")
    .select("id, sort_order")
    .eq("quote_id", id)
    .order("sort_order");

  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 500 });
  }

  const sectionIds = (sections || []).map((s) => s.id);

  if (sectionIds.length === 0) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort by section sort_order then item sort_order
  const sectionOrder = new Map(sections!.map((s) => [s.id, s.sort_order]));
  const sorted = (data || []).sort((a, b) => {
    const sectionDiff = (sectionOrder.get(a.section_id) ?? 0) - (sectionOrder.get(b.section_id) ?? 0);
    if (sectionDiff !== 0) return sectionDiff;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  return NextResponse.json(sorted);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("quote_items")
    .insert({ ...body, quote_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
