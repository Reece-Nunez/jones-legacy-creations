import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, canManageRole } from "@/lib/roles";
import { ALL_ROLE_SLUGS } from "@/lib/roles";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!callerProfile || !hasPermission(callerProfile.role, "team:manage")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Get the target user
  const { data: targetUser } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Can't edit someone with higher/equal level unless you're same level
  if (!canManageRole(callerProfile.role, targetUser.role)) {
    return NextResponse.json({ error: "Cannot modify a user with equal or higher role" }, { status: 403 });
  }

  const body = await request.json();
  const allowedFields = ["display_name", "email", "role", "title", "phone", "is_active"];
  const updates: Record<string, unknown> = {};

  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  // Validate role if changing
  if (updates.role && !ALL_ROLE_SLUGS.includes(updates.role as typeof ALL_ROLE_SLUGS[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Can't promote someone above your own level
  if (updates.role && !canManageRole(callerProfile.role, updates.role as string)) {
    return NextResponse.json({ error: "Cannot assign a role higher than your own" }, { status: 403 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
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
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("user_profiles")
    .select("id, role")
    .eq("auth_id", user.id)
    .single();

  if (!callerProfile || !hasPermission(callerProfile.role, "team:delete")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Can't delete yourself
  if (callerProfile.id === id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const { data: targetUser } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!canManageRole(callerProfile.role, targetUser.role)) {
    return NextResponse.json({ error: "Cannot delete a user with equal or higher role" }, { status: 403 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
