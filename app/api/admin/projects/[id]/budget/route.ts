import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_BUDGET_LINE_ITEMS } from "@/lib/types/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_line_items")
    .select("*")
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Natural sort: "1", "2", ... "9", "10", "10a", "10b", "11", ...
  const sorted = (data ?? []).sort((a, b) =>
    a.line_number.localeCompare(b.line_number, undefined, { numeric: true })
  );

  return NextResponse.json(sorted);
}

// Initialize budget with default line items or update existing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // If body is an array, it's a bulk upsert
  if (Array.isArray(body)) {
    const rows = body.map((item: { line_number: string; description: string; budgeted_amount: number; notes?: string }) => ({
      project_id: id,
      line_number: item.line_number,
      description: item.description,
      budgeted_amount: item.budgeted_amount || 0,
      notes: item.notes || null,
    }));

    const { data, error } = await supabase
      .from("budget_line_items")
      .upsert(rows, { onConflict: "project_id,line_number" })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  }

  // Single item
  const { data, error } = await supabase
    .from("budget_line_items")
    .upsert(
      { ...body, project_id: id },
      { onConflict: "project_id,line_number" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

// Initialize default budget line items for a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const rows = DEFAULT_BUDGET_LINE_ITEMS.map((item) => ({
    project_id: id,
    line_number: item.line_number,
    description: item.description,
    budgeted_amount: 0,
  }));

  const { data, error } = await supabase
    .from("budget_line_items")
    .upsert(rows, { onConflict: "project_id,line_number" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { line_item_id, owner_purchased } = await request.json();

  const { data, error } = await supabase
    .from("budget_line_items")
    .update({ owner_purchased })
    .eq("id", line_item_id)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("budget_line_items")
    .delete()
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
