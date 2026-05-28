import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; settlementId: string }> }
) {
  const { id, settlementId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  const { data, error } = await supabase
    .from("project_settlements")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", settlementId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; settlementId: string }> }
) {
  const { id, settlementId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase
    .from("project_settlements")
    .delete()
    .eq("id", settlementId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
