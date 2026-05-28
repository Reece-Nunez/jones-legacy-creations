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
    .from("project_misc_charges")
    .select("*")
    .eq("project_id", id)
    .order("charge_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

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

  if (!body.description || body.amount == null) {
    return NextResponse.json(
      { error: "description and amount are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("project_misc_charges")
    .insert({ ...body, project_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    project_id: id,
    action: "misc_charge_added",
    description: `Misc charge: ${body.description} ($${Number(body.amount).toLocaleString()})`,
  });

  return NextResponse.json(data, { status: 201 });
}
