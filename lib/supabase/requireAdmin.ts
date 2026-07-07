import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Permission } from "@/lib/roles";
import { hasPermission, isContractor } from "@/lib/roles";

export type AdminContext = {
  supabase: SupabaseClient;
  user: User;
  profile: { id: string; auth_id: string; email: string; role: string; is_active: boolean };
};

export type RequireAdminOptions = {
  /**
   * Allow project-scoped contractor logins through this route. Defaults to
   * FALSE — contractors are denied on every /api/admin route by default, which
   * closes the service-role (RLS-bypassing) routes to them in one place. Set
   * true only on the handful of routes a contractor legitimately needs (e.g.
   * their own project's documents), where RLS still scopes the data.
   */
  allowContractor?: boolean;
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
  permission?: Permission,
  options?: RequireAdminOptions
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

  // Default-deny contractors on API routes. This is the single choke point that
  // keeps project-scoped contractors out of every staff/service-role route;
  // only routes that opt in via allowContractor (and rely on RLS for scope)
  // let them through.
  if (isContractor(profile.role) && !options?.allowContractor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Per-route capability check. Contractor data scope is enforced by RLS.
  if (permission && !hasPermission(profile.role, permission)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  return { supabase, user, profile };
}
