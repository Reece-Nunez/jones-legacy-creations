import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { isContractor } from "@/lib/roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  // Contractors may update task status on their project; RLS confines them to
  // granted projects, and we narrow the writable fields below.
  const gate = await requireAdmin(undefined, { allowContractor: true });
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;
  let body = await request.json();

  // Staff can edit any field; a contractor may only toggle completion/status.
  if (isContractor(profile.role)) {
    const allowed: Record<string, unknown> = {};
    if ("completed" in body) allowed.completed = body.completed;
    if ("status" in body) allowed.status = body.status;
    body = allowed;
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "No permitted fields" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(body)
    .eq("id", taskId)
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
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
