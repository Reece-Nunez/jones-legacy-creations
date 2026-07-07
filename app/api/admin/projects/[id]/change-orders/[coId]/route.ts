import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// Fields staff may edit on a draft change order. Signature / provenance columns
// are set only by the public sign route and are never client-editable here.
const EDITABLE = new Set([
  "title",
  "description",
  "reason",
  "cost_delta",
  "schedule_impact_days",
  "client_name",
  "client_email",
  "client_phone",
  "consent_text",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
) {
  const { id, coId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (EDITABLE.has(key)) updates[key] = value;
  }
  // Staff may cancel a change order by voiding it; no other status transition is
  // allowed from here (signing happens only via the public token route).
  if (body.status === "void") updates.status = "void";

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("change_orders")
    .update(updates)
    .eq("id", coId)
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
  { params }: { params: Promise<{ id: string; coId: string }> }
) {
  const { id, coId } = await params;
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase
    .from("change_orders")
    .delete()
    .eq("id", coId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
