import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { DEFAULT_PROJECT_PHASES } from "@/lib/types/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: existing, error } = await supabase
    .from("project_phases")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-create defaults if none exist
  if (!existing || existing.length === 0) {
    const defaults = DEFAULT_PROJECT_PHASES.map((p) => ({
      ...p,
      project_id: id,
    }));
    const { data: created, error: insertError } = await supabase
      .from("project_phases")
      .insert(defaults)
      .select()
      .order("sort_order", { ascending: true });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json(created);
  }

  return NextResponse.json(existing);
}
