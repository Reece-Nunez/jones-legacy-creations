import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_upload_tokens")
    .select("*")
    .eq("project_id", id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const body = await request.json();
  const { contractor_id, contractor_name, project_name } = body;

  if (!contractor_id || !contractor_name || !project_name) {
    return NextResponse.json(
      { error: "contractor_id, contractor_name, and project_name are required" },
      { status: 400 }
    );
  }

  // Generate a short random token
  const token = crypto.randomUUID().slice(0, 8);

  const { data, error } = await supabase
    .from("invoice_upload_tokens")
    .insert({
      token,
      project_id: id,
      contractor_id,
      contractor_name,
      project_name,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Build the full URL
  const origin =
    request.headers.get("origin") ||
    request.headers.get("x-forwarded-host")
      ? `https://${request.headers.get("x-forwarded-host")}`
      : "http://localhost:3000";

  const url = `${origin}/submit-invoice/${token}`;

  return NextResponse.json({ ...data, url }, { status: 201 });
}
