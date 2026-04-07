import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  const { id, phaseId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const updates: Record<string, unknown> = { completed: body.completed };
  if (body.completed) {
    updates.completed_at = new Date().toISOString();
  } else {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from("project_phases")
    .update(updates)
    .eq("id", phaseId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
