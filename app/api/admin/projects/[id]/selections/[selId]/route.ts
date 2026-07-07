import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// Text fields staff may edit on a draft selection. The photo is set at creation;
// decision / provenance columns are set only by the public decide route.
const EDITABLE = new Set([
  "title",
  "selection_name",
  "description",
  "location",
  "cost_impact",
  "disclaimer_text",
  "client_name",
  "client_email",
  "client_phone",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; selId: string }> }
) {
  const { id, selId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (EDITABLE.has(key)) updates[key] = value;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("selection_approvals")
    .update(updates)
    .eq("id", selId)
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
  { params }: { params: Promise<{ id: string; selId: string }> }
) {
  const { id, selId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase
    .from("selection_approvals")
    .delete()
    .eq("id", selId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
