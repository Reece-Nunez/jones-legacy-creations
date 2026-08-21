import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { isPasswordValid, passwordProblems } from "@/lib/auth/passwordPolicy";

// POST /api/admin/profile/password — change your own password.
//
// Contractors are allowed through: they sign in with the same handed-out
// starter passwords staff got, so they need to be able to rotate theirs too.
// This only ever updates the caller's own auth user — there is no user id in
// the payload, so it can't be pointed at someone else's account.
export async function POST(request: NextRequest) {
  const gate = await requireAdmin(undefined, { allowContractor: true });
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => null);
  const password = body?.password;
  const confirm = body?.confirm;

  if (typeof password !== "string" || typeof confirm !== "string") {
    return NextResponse.json(
      { error: "password and confirm are required" },
      { status: 400 },
    );
  }

  if (password !== confirm) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400 },
    );
  }

  // Re-checked here on purpose. The form's live checklist is guidance for the
  // person typing; this is the rule.
  if (!isPasswordValid(password)) {
    return NextResponse.json(
      {
        error: "Password does not meet the requirements",
        problems: passwordProblems(password),
      },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // Surfaces Supabase's own complaints too, e.g. reusing the current password.
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
