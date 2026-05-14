import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// Recalculates per-item totals, per-section subtotals, and quote-level
// aggregates atomically via the recalc_quote_totals SQL function. The
// function locks the quote row, so concurrent recalcs serialize instead
// of interleaving, and a failure mid-way no longer leaves item totals
// out of sync with the quote totals.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase.rpc("recalc_quote_totals", {
    quote_id_in: id,
  });

  if (error) {
    const status = error.code === "P0002" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}
