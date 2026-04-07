import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DRAW_LINE_ITEM_WEIGHTS } from "@/lib/types/database";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch distinct line_item_numbers that have at least one document for this project
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

  const percent = totalWeight > 0
    ? Math.round((completedWeight / totalWeight) * 100)
    : 0;

  return NextResponse.json({ items, percent });
}
