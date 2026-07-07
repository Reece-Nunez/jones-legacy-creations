import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimProfileByEmail } from "@/lib/supabase/linkProfile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First-login linking: claim a pre-provisioned profile (staff or
      // contractor) by email so RLS resolves this user. Unauthorized accounts
      // link nothing and are stopped by the middleware profile gate.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await claimProfileByEmail(user.id, user.email);

      // Check if MFA verification is required (user has a TOTP factor enrolled)
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2") {
        const verifyUrl = new URL(`${origin}/admin/mfa/verify`);
        verifyUrl.searchParams.set("next", next);
        return NextResponse.redirect(verifyUrl.toString());
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`);
}
