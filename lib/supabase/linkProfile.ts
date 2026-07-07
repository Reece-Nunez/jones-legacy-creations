import { createAdminClient } from "@/lib/supabase/admin";

/**
 * First-login account linking.
 *
 * Users (staff AND project-scoped contractors) are pre-provisioned in
 * user_profiles with a placeholder auth_id and their email. When they sign in
 * with Google for the first time, we claim that row by matching email and
 * stamp the real auth_id — that's what lets RLS (is_admin / has_project_access,
 * both keyed on auth.uid()) resolve them.
 *
 * Runs with the service-role client on purpose: the placeholder row isn't
 * "self" yet, so the self-or-admin RLS update policy on user_profiles would
 * otherwise block the claim.
 *
 * No-op when there's no email or no unclaimed matching profile — i.e.
 * already-linked users (their row is excluded by the auth_id filter) and
 * unauthorized Google accounts with no profile at all. The gate that actually
 * denies the latter lives in middleware; this function never creates rows.
 */
export async function claimProfileByEmail(
  userId: string,
  email: string | undefined | null
): Promise<void> {
  if (!email) return;

  const admin = createAdminClient();
  await admin
    .from("user_profiles")
    .update({ auth_id: userId, last_login_at: new Date().toISOString() })
    .eq("email", email.trim().toLowerCase())
    .neq("auth_id", userId);
}
