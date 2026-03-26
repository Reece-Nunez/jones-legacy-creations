import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; drawId: string }> }
) {
  const { id, drawId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("draw_requests")
    .update(body)
    .eq("id", drawId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Log activity if status changed
  if (body.status) {
    await supabase.from("activity_log").insert({
      project_id: id,
      action: "draw_submitted",
      description: `Draw #${data.draw_number} status changed to ${body.status}`,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; drawId: string }> }
) {
  const { id, drawId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("draw_requests")
    .delete()
    .eq("id", drawId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
