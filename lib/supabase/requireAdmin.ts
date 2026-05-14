import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Permission } from "@/lib/roles";
import { hasPermission } from "@/lib/roles";

export type AdminContext = {
  supabase: SupabaseClient;
  user: User;
  profile: { id: string; auth_id: string; email: string; role: string; is_active: boolean };
};

/**
 * Gate any /api/admin/* route. Returns either an AdminContext or a
 * NextResponse the caller should return immediately.
 *
 *   const gate = await requireAdmin();
 *   if (gate instanceof NextResponse) return gate;
 *   const { supabase, user, profile } = gate;
 */
export async function requireAdmin(
  permission?: Permission
): Promise<AdminContext | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, auth_id, email, role, is_active")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Defense-in-depth: also honor the ADMIN_ALLOWED_EMAILS env allowlist
  // that the middleware uses for page protection.
  const allowlist = (process.env.ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (
    allowlist.length > 0 &&
    !allowlist.includes((user.email || "").toLowerCase())
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (permission && !hasPermission(profile.role, permission)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return { supabase, user, profile };
}
