import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("custom_trades")
    .select("*")
    .eq("active", true)
    .order("usage_count", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { trade_name, default_cost, category, notes } = body;

  if (!trade_name) {
    return NextResponse.json({ error: "trade_name is required" }, { status: 400 });
  }

  // Check if this trade already exists (case-insensitive)
  const { data: existing } = await supabase
    .from("custom_trades")
    .select("id, usage_count")
    .ilike("trade_name", trade_name.trim())
    .limit(1);

  if (existing && existing.length > 0) {
    // Already exists — increment usage count and update cost if provided
    const updates: Record<string, unknown> = {
      usage_count: (existing[0].usage_count || 0) + 1,
      active: true,
    };
    if (default_cost !== undefined) updates.default_cost = default_cost;
    if (notes) updates.notes = notes;

    const { data, error } = await supabase
      .from("custom_trades")
      .update(updates)
      .eq("id", existing[0].id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  }

  // Create new custom trade
  const { data, error } = await supabase
    .from("custom_trades")
    .insert({
      trade_name: trade_name.trim(),
      default_cost: default_cost || null,
      category: category || null,
      notes: notes || null,
      usage_count: 1,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
