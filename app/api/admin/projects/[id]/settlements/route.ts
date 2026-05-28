import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("project_settlements")
    .select("*")
    .eq("project_id", id)
    .order("settlement_date", { ascending: true });

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
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  if (!body.settlement_date || !body.settlement_type) {
    return NextResponse.json(
      { error: "settlement_date and settlement_type are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("project_settlements")
    .insert({ ...body, project_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    project_id: id,
    action: "settlement_added",
    description: `${body.settlement_type} settlement recorded for ${body.settlement_date}`,
  });

  return NextResponse.json(data, { status: 201 });
}
