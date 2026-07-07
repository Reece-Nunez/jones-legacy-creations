import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { generateToken } from "@/lib/tokens";
import { DEFAULT_CHANGE_ORDER_CONSENT } from "@/lib/legal/approvalText";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin("projects:view");
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", id)
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
  const gate = await requireAdmin("projects:edit");
  if (gate instanceof NextResponse) return gate;
  const { supabase, profile } = gate;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("change_orders")
    .insert({
      project_id: id,
      title: body.title.trim(),
      description: body.description ?? null,
      reason: body.reason ?? null,
      cost_delta: Number.isFinite(Number(body.cost_delta)) ? Number(body.cost_delta) : 0,
      schedule_impact_days: Number.isInteger(Number(body.schedule_impact_days))
        ? Number(body.schedule_impact_days)
        : 0,
      client_name: body.client_name ?? null,
      client_email: body.client_email ?? null,
      client_phone: body.client_phone ?? null,
      consent_text:
        typeof body.consent_text === "string" && body.consent_text.trim()
          ? body.consent_text
          : DEFAULT_CHANGE_ORDER_CONSENT,
      token: generateToken(),
      status: "draft",
      created_by: profile.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data, { status: 201 });
}
