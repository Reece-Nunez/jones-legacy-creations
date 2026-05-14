import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

// Money math: round to 2 decimal places after each step so JS float
// rounding doesn't accumulate across the multi-step calc (materials +
// labor + ... + markup * qty + tax → subtotal → +overhead → +profit → ...).
// Postgres numeric(12,2) would silently round on write; doing it explicitly
// here makes the returned response and the persisted value identical.
const cents = (n: number) => Math.round(n * 100) / 100;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  // Fetch the quote's pricing controls
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("overhead_pct, profit_pct, contingency_pct, sales_tax_pct")
    .eq("id", id)
    .single();

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message },
      { status: quoteError.code === "PGRST116" ? 404 : 500 }
    );
  }

  // Fetch all items for this quote
  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Fetch all sections for this quote
  const { data: sections, error: sectionsError } = await supabase
    .from("quote_sections")
    .select("*")
    .eq("quote_id", id);

  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 500 });
  }

  // Calculate each item's total and update. We compute totals locally and
  // pre-round so the in-memory `allItems` (built below) and the persisted
  // row hold identical values.
  const itemTotals = new Map<string, number>();
  for (const item of items || []) {
    const baseCost =
      (Number(item.material_cost) +
        Number(item.labor_cost) +
        Number(item.equipment_cost) +
        Number(item.subcontractor_cost)) *
      Number(item.quantity) *
      (1 + Number(item.markup_pct) / 100);
    const total = cents(baseCost + Number(item.tax));
    itemTotals.set(item.id, total);
  }

  const itemResults = await Promise.all(
    Array.from(itemTotals.entries()).map(([itemId, total]) =>
      supabase.from("quote_items").update({ total }).eq("id", itemId)
    )
  );
  const itemErr = itemResults.find((r) => r.error)?.error;
  if (itemErr) {
    return NextResponse.json(
      { error: `Failed to update item totals: ${itemErr.message}` },
      { status: 500 }
    );
  }

  // Build a local allItems with the new totals; saves an extra round-trip.
  const allItems = (items || []).map((item) => ({
    ...item,
    total: itemTotals.get(item.id) ?? Number(item.total),
  }));

  // Calculate section subtotals
  const sectionUpdates = (sections || []).map((section) => {
    const sectionItems = allItems.filter((item) => item.section_id === section.id);
    const subtotal = cents(
      sectionItems.reduce((sum, item) => sum + Number(item.total), 0)
    );

    return supabase
      .from("quote_sections")
      .update({ subtotal })
      .eq("id", section.id);
  });

  const sectionResults = await Promise.all(sectionUpdates);
  const sectionErr = sectionResults.find((r) => r.error)?.error;
  if (sectionErr) {
    return NextResponse.json(
      { error: `Failed to update section subtotals: ${sectionErr.message}` },
      { status: 500 }
    );
  }

  // Calculate quote totals — round at each money boundary.
  const subtotal = cents(
    allItems.reduce((sum, item) => sum + Number(item.total), 0)
  );
  const totalMaterials = cents(
    allItems.reduce(
      (sum, item) => sum + Number(item.material_cost) * Number(item.quantity),
      0
    )
  );
  const totalLabor = cents(
    allItems.reduce(
      (sum, item) => sum + Number(item.labor_cost) * Number(item.quantity),
      0
    )
  );
  const totalSubcontractor = cents(
    allItems.reduce(
      (sum, item) => sum + Number(item.subcontractor_cost) * Number(item.quantity),
      0
    )
  );
  const totalEquipment = cents(
    allItems.reduce(
      (sum, item) => sum + Number(item.equipment_cost) * Number(item.quantity),
      0
    )
  );

  const overheadPct = Number(quote.overhead_pct) || 0;
  const profitPct = Number(quote.profit_pct) || 0;
  const contingencyPct = Number(quote.contingency_pct) || 0;
  const salesTaxPct = Number(quote.sales_tax_pct) || 0;

  const overheadAmount = cents(subtotal * (overheadPct / 100));
  const profitAmount = cents((subtotal + overheadAmount) * (profitPct / 100));
  const contingencyAmount = cents(subtotal * (contingencyPct / 100));
  const taxAmount = cents(subtotal * (salesTaxPct / 100));
  const grandTotal = cents(
    subtotal + overheadAmount + profitAmount + contingencyAmount + taxAmount
  );

  const { data: updatedQuote, error: updateError } = await supabase
    .from("quotes")
    .update({
      subtotal,
      total_materials: totalMaterials,
      total_labor: totalLabor,
      total_subcontractor: totalSubcontractor,
      total_equipment: totalEquipment,
      overhead_amount: overheadAmount,
      profit_amount: profitAmount,
      contingency_amount: contingencyAmount,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updatedQuote);
}
