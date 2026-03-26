import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("draw_requests")
    .select("*")
    .eq("project_id", id)
    .order("draw_number", { ascending: true });

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

  const { data, error } = await supabase
    .from("draw_requests")
    .insert({ ...body, project_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Log activity
  await supabase.from("activity_log").insert({
    project_id: id,
    action: "draw_submitted",
    description: `Draw #${body.draw_number} created for $${Number(body.amount).toLocaleString()}`,
  });

  return NextResponse.json(data, { status: 201 });
}
