"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Ensures the current authenticated user has a row in `user_profiles`.
 * Runs once per session (tab). If no profile exists, creates one from
 * the auth user's metadata (OAuth name, email, avatar).
 *
 * Call this in any layout that wraps authenticated pages (e.g. AdminShell).
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

      // Check if profile already exists
      const { data: existing } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (existing) {
        // Profile exists — update last_login_at silently
        await supabase
          .from("user_profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("auth_id", user.id);
        return;
      }

      // No profile — create one from auth metadata
      const meta = user.user_metadata ?? {};
      const displayName =
        meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "";

      await supabase.from("user_profiles").insert({
        auth_id: user.id,
        email: user.email ?? "",
        display_name: displayName,
        avatar_url: meta.avatar_url ?? null,
        role: "office_admin", // Safe default for new users
      });
    })();
  }, []);
}
