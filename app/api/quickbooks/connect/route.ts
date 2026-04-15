import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/quickbooks/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Require admin session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate random state for CSRF protection
  const state = crypto.randomUUID();

  const authUrl = await buildAuthUrl(state);

  // Store state in a short-lived cookie
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("qbo_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
