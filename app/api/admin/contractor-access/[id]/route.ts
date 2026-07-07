import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { CONTRACTOR_ROLE } from "@/lib/roles";

/**
 * Manage a single contractor login: replace its project assignments (PATCH) or
 * remove the login entirely (DELETE). Both require access:manage and refuse to
 * act on non-contractor (staff) rows — staff are managed via /api/admin/team.
 */

// PATCH → replace the contractor's project grants with the provided set.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin("access:manage");
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;

  const { data: target } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();
  if (!target || target.role !== CONTRACTOR_ROLE) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const body = await request.json();
  const projectIds: string[] = Array.isArray(body.project_ids) ? body.project_ids : [];
  if (projectIds.length === 0) {
    return NextResponse.json(
      { error: "A contractor must be assigned at least one project" },
      { status: 400 }
    );
  }

  // Replace the grant set: clear existing, insert the new list. Small N per
  // contractor, so a wholesale replace is simpler than diffing.
  const { error: delErr } = await supabase
    .from("project_access")
    .delete()
    .eq("user_profile_id", id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  const { error: insErr } = await supabase.from("project_access").insert(
    projectIds.map((pid) => ({
      user_profile_id: id,
      project_id: pid,
      created_by: profile.id,
    }))
  );
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// DELETE → remove the contractor login (project_access cascades).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin("access:manage");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: target } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();
  if (!target || target.role !== CONTRACTOR_ROLE) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const { error } = await supabase.from("user_profiles").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
