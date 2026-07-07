"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Stamps `last_login_at` for the current authenticated user, once per session
 * (tab). Call this in any layout that wraps authenticated pages (e.g.
 * AdminShell).
 *
 * NOTE: this intentionally does NOT create profiles. Access is provisioned
 * ahead of time (staff via team management, contractors via contractor access)
 * and linked to the auth account by email on first login — see
 * `claimProfileByEmail`. Auto-creating a profile for any Google sign-in was a
 * privilege-escalation hole (every new sign-in became an office_admin), so a
 * missing profile now correctly means "not authorized" and is handled by the
 * middleware gate.
 */
export function useEnsureProfile() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const supabase = createClient();

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Best-effort last-login stamp. No-op (RLS) if no profile exists yet.
      await supabase
        .from("user_profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("auth_id", user.id);
    })();
  }, []);
}
