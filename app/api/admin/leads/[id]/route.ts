import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

const ALLOWED = new Set(["status", "notes", "assigned_to", "converted_project_id"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  // Whitelist updatable fields so a malicious payload can't mutate
  // captured payload, attribution, or PII columns.
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of Object.keys(body)) {
    if (ALLOWED.has(k)) patch[k] = body[k];
  }

  // Convenience: stamp contacted_at / closed_at when status flips.
  if (typeof body.status === "string") {
    if (body.status === "contacted" && !body.contacted_at) {
      patch.contacted_at = new Date().toISOString();
    }
    if (
      (body.status === "won" || body.status === "lost" || body.status === "spam") &&
      !body.closed_at
    ) {
      patch.closed_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
