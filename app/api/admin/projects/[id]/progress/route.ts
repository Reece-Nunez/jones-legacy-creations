import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DRAW_LINE_ITEM_WEIGHTS } from "@/lib/types/database";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Check if this is a cash job
  const { data: project } = await supabase
    .from("projects")
    .select("is_cash_job")
    .eq("id", id)
    .single();

  // ── Cash job: dollar-weighted progress from budget line items ─────────────
  if (project?.is_cash_job) {
    const [{ data: lineItems }, { data: docs }] = await Promise.all([
      supabase
        .from("budget_line_items")
        .select("line_number, description, budgeted_amount, owner_purchased")
        .eq("project_id", id)
        .order("line_number"),
      supabase
        .from("documents")
        .select("line_item_number")
        .eq("project_id", id)
        .not("line_item_number", "is", null),
    ]);

    const invoicedNumbers = new Set(
      (docs ?? []).map((d) => d.line_item_number as string)
    );

    const items = (lineItems ?? []).map((item) => {
      const hasInvoice = invoicedNumbers.has(item.line_number);
      const isOwnerPurchased = item.owner_purchased ?? false;
      return {
        line_number: item.line_number,
        description: item.description,
        budgeted_amount: item.budgeted_amount ?? 0,
        completed: hasInvoice || isOwnerPurchased,
        source: hasInvoice
          ? ("invoice" as const)
          : isOwnerPurchased
          ? ("owner_purchased" as const)
          : null,
      };
    });

    const totalBudgeted = items.reduce((s, i) => s + i.budgeted_amount, 0);
    const coveredBudget = items
      .filter((i) => i.completed)
      .reduce((s, i) => s + i.budgeted_amount, 0);

    const percent =
      totalBudgeted > 0 ? Math.round((coveredBudget / totalBudgeted) * 100) : 0;

    return NextResponse.json({ cashJob: true, items, percent });
  }

  // ── Standard job: NAHB line-item weight approach ──────────────────────────
  const { data: docs } = await supabase
    .from("documents")
    .select("line_item_number")
    .eq("project_id", id)
    .not("line_item_number", "is", null);

  const completedNumbers = new Set(
    (docs ?? []).map((d) => d.line_item_number as string)
  );

  const items = DRAW_LINE_ITEM_WEIGHTS.map((item) => ({
    ...item,
    completed: completedNumbers.has(item.number),
  }));

  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  const completedWeight = items
    .filter((i) => i.completed)
    .reduce((sum, i) => sum + i.weight, 0);

  const percent =
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return NextResponse.json({ cashJob: false, items, percent });
}
