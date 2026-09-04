import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { DEFAULT_BUDGET_LINE_ITEMS } from "@/lib/types/database";
import { planBudgetSync, BudgetSyncError } from "@/lib/finance/budget-sync";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

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
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  // Full sync: the Budget tab sends the complete line-item list, so rows the
  // user deleted are simply absent. Distinguished from the legacy array/single
  // shapes below by the `items` wrapper precisely because it deletes — an old
  // caller sending a partial list must never wipe the rest of the budget.
  if (body && !Array.isArray(body) && Array.isArray(body.items)) {
    const { data: existing, error: readError } = await supabase
      .from("budget_line_items")
      .select("id, line_number")
      .eq("project_id", id);

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    let plan;
    try {
      plan = planBudgetSync(existing ?? [], body.items);
    } catch (e) {
      if (e instanceof BudgetSyncError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // Deletes run first: a renumbered row can legitimately take the line number
    // of a row being removed in the same save, and (project_id, line_number) is
    // unique, so the upsert would collide the other way round.
    if (plan.deleteIds.length > 0) {
      const { error } = await supabase
        .from("budget_line_items")
        .delete()
        .eq("project_id", id)
        .in("id", plan.deleteIds);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    // Spend is matched to a budget line by line_number, not by foreign key, so
    // renumbering a line silently orphans everything charged to it unless the
    // pointers move too.
    for (const rename of plan.renames) {
      await supabase
        .from("contractor_payments")
        .update({ budget_line_number: rename.to })
        .eq("project_id", id)
        .eq("budget_line_number", rename.from);
      await supabase
        .from("documents")
        .update({ line_item_number: rename.to })
        .eq("project_id", id)
        .eq("line_item_number", rename.from);
    }

    // Existing rows are updated by primary key, not upserted. An upsert keyed
    // on (project_id, line_number) would find no conflict for a row whose line
    // number just changed and try to INSERT it, colliding on the id it already
    // has.
    for (const row of plan.upserts) {
      if (!row.id) continue;
      const { id: rowId, ...values } = row;
      const { error } = await supabase
        .from("budget_line_items")
        .update(values)
        .eq("id", rowId)
        .eq("project_id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const newRows = plan.upserts.filter((row) => !row.id);
    if (newRows.length > 0) {
      const { error } = await supabase
        .from("budget_line_items")
        .insert(newRows.map((row) => ({ ...row, project_id: id })));
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("budget_line_items")
      .select("*")
      .eq("project_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  }

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
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

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
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
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
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { error } = await supabase
    .from("budget_line_items")
    .delete()
    .eq("project_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
