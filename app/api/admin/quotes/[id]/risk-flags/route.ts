import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quote_risk_flags")
    .select("*")
    .eq("quote_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Accept single object or array
  const items = Array.isArray(body) ? body : [body];
  const insertData = items.map((item) => ({ ...item, quote_id: id }));

  const { data, error } = await supabase
    .from("quote_risk_flags")
    .insert(insertData)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Update a specific risk flag's resolved status
  const { flag_id, resolved, resolution_notes } = body;

  if (!flag_id) {
    return NextResponse.json({ error: "flag_id is required" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (typeof resolved === "boolean") updateData.resolved = resolved;
  if (resolution_notes !== undefined) updateData.resolution_notes = resolution_notes;

  const { data, error } = await supabase
    .from("quote_risk_flags")
    .update(updateData)
    .eq("id", flag_id)
    .eq("quote_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 400 }
    );
  }

  return NextResponse.json(data);
}
