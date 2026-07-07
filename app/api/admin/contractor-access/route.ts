import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { CONTRACTOR_ROLE } from "@/lib/roles";

/**
 * Contractor-access management. Backs the "Users & Access" screen where staff
 * (access:manage — owner, technical director, office manager) provision
 * project-scoped contractor logins and assign them to projects.
 *
 * Contractors are ordinary user_profiles rows with role='contractor' and a
 * placeholder auth_id that gets claimed by email on first Google sign-in
 * (see claimProfileByEmail). project_access maps them to the projects they see.
 */

// GET → the data the Users & Access screen needs beyond the base team list:
// every contractor's project grants + the full project list for the picker.
export async function GET() {
  const gate = await requireAdmin("access:manage");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const [{ data: grants, error: grantsErr }, { data: projects, error: projErr }] =
    await Promise.all([
      supabase.from("project_access").select("user_profile_id, project_id"),
      supabase.from("projects").select("id, name").order("name", { ascending: true }),
    ]);

  if (grantsErr || projErr) {
    return NextResponse.json(
      { error: grantsErr?.message ?? projErr?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ grants: grants ?? [], projects: projects ?? [] });
}

// POST → create a contractor login and assign it to one or more projects.
export async function POST(request: NextRequest) {
  const gate = await requireAdmin("access:manage");
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;

  const body = await request.json();
  const displayName: string = (body.display_name ?? "").trim();
  const email: string = (body.email ?? "").trim().toLowerCase();
  const projectIds: string[] = Array.isArray(body.project_ids) ? body.project_ids : [];
  const phone: string | null = body.phone?.trim() || null;

  if (!displayName || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }
  if (projectIds.length === 0) {
    return NextResponse.json(
      { error: "Assign at least one project" },
      { status: 400 }
    );
  }

  // Reject duplicate email (staff or contractor) — one login per person.
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .ilike("email", email)
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  // Placeholder auth_id — claimed by email on first Google login.
  const { data: created, error: createErr } = await supabase
    .from("user_profiles")
    .insert({
      auth_id: crypto.randomUUID(),
      display_name: displayName,
      email,
      role: CONTRACTOR_ROLE,
      phone,
    })
    .select("id")
    .single();

  if (createErr || !created) {
    return NextResponse.json(
      { error: createErr?.message ?? "Failed to create contractor" },
      { status: 400 }
    );
  }

  const { error: grantErr } = await supabase.from("project_access").insert(
    projectIds.map((pid) => ({
      user_profile_id: created.id,
      project_id: pid,
      created_by: profile.id,
    }))
  );

  if (grantErr) {
    // Roll back the orphan profile so a failed grant doesn't leave a
    // contractor login with no project (which would still pass the gate).
    await supabase.from("user_profiles").delete().eq("id", created.id);
    return NextResponse.json({ error: grantErr.message }, { status: 400 });
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
