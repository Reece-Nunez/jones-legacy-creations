import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Try to find existing profile
  let { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  // Auto-create profile if it doesn't exist
  if (!profile) {
    const { data: newProfile, error } = await supabase
      .from("user_profiles")
      .insert({
        auth_id: user.id,
        email: user.email ?? "",
        display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profile = newProfile;
  }

  // Update last login
  await supabase
    .from("user_profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", profile.id);

  return NextResponse.json(profile);
}

const ALLOWED_FIELDS = new Set([
  "display_name",
  "phone",
  "title",
  "avatar_url",
  "theme",
  "timezone",
  "notify_email",
  "notify_in_app",
]);

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_FIELDS.has(key)) {
      updates[key] = value;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("auth_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
