import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/roles";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get caller's profile to check permissions
  const { data: callerProfile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!callerProfile || !hasPermission(callerProfile.role, "team:view")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Create a new team member profile
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (!callerProfile || !hasPermission(callerProfile.role, "team:manage")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { display_name, email, role, title, phone } = body;

  if (!display_name || !email || !role) {
    return NextResponse.json(
      { error: "display_name, email, and role are required" },
      { status: 400 }
    );
  }

  // Check if email already exists
  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .ilike("email", email.trim())
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      auth_id: crypto.randomUUID(), // Placeholder until they log in via OAuth
      display_name: display_name.trim(),
      email: email.trim().toLowerCase(),
      role,
      title: title?.trim() || null,
      phone: phone?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
