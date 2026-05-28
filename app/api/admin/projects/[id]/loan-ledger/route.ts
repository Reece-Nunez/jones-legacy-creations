import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("loan_ledger")
    .select("*")
    .eq("project_id", id)
    .order("entry_date", { ascending: true })
    .order("created_at", { ascending: true });

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
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  // Single-entry insert OR bulk insert (used by the AI-extract review
  // step to persist a whole statement at once).
  if (Array.isArray(body)) {
    const rows = body.map((e: Record<string, unknown>) => ({
      ...e,
      project_id: id,
    }));
    const { data, error } = await supabase
      .from("loan_ledger")
      .insert(rows)
      .select();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data, { status: 201 });
  }

  if (!body.entry_date || !body.entry_type || body.amount == null) {
    return NextResponse.json(
      { error: "entry_date, entry_type, and amount are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("loan_ledger")
    .insert({ ...body, project_id: id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("activity_log").insert({
    project_id: id,
    action: "loan_ledger_added",
    description: `${body.entry_type}: ${body.description || "(no description)"} — $${Number(body.amount).toLocaleString()}`,
  });

  return NextResponse.json(data, { status: 201 });
}
