import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, type Permission } from "@/lib/roles";

/**
 * Server-component guard for /admin pages.
 *
 * The API routes are the real security boundary — data can't be read or
 * written without passing requireAdmin(permission). This exists so that
 * hiding a nav link is not the only thing standing between a user and a page
 * they aren't meant to reach: typing the URL directly lands on the dashboard
 * instead of a shell that renders nothing but failed fetches.
 *
 * Redirects to the dashboard (not a 403) because every caller is already
 * signed-in staff; this is "not your area", not "who are you".
 */
export async function requirePagePermission(
  permission: Permission,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role, is_active")
    .eq("auth_id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) redirect("/admin/login");
  if (!hasPermission(profile.role, permission)) redirect("/admin");
}
