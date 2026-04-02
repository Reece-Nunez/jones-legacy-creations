import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const ALLOWED_FIELDS = new Set([
  "company_name",
  "company_email",
  "company_phone",
  "company_address",
  "company_city",
  "company_state",
  "company_zip",
  "license_number",
  "logo_url",
  "website",
  "default_valid_days",
  "default_payment_terms",
  "email_reply_to",
  "email_footer_text",
  "notify_new_estimate",
  "notify_quote_accepted",
  "notify_draw_submitted",
]);

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
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

  // Get the single settings row
  const { data: existing } = await supabase
    .from("company_settings")
    .select("id")
    .limit(1)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Settings not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("company_settings")
    .update(updates)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
