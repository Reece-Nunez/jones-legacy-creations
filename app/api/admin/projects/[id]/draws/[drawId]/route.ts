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

  // When a draw is funded, auto-reimburse any payments Blake covered personally.
  // Payments still in "pending" stay pending — Blake will pay them from the draw
  // funds and can mark them "paid_from_draw" individually when that happens.
  if (body.status === "funded") {
    const fundedDate = body.funded_date || new Date().toISOString().split("T")[0];
    await supabase
      .from("contractor_payments")
      .update({ status: "reimbursed", reimbursed_date: fundedDate })
      .eq("draw_request_id", drawId)
      .eq("project_id", id)
      .eq("status", "paid_personal");
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
