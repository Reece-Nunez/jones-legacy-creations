import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

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

  // Calculate each item's total and update
  const itemUpdates = (items || []).map((item) => {
    const baseCost =
      (Number(item.material_cost) +
        Number(item.labor_cost) +
        Number(item.equipment_cost) +
        Number(item.subcontractor_cost)) *
      Number(item.quantity) *
      (1 + Number(item.markup_pct) / 100);
    const total = baseCost + Number(item.tax);

    return supabase
      .from("quote_items")
      .update({ total })
      .eq("id", item.id);
  });

  await Promise.all(itemUpdates);

  // Re-fetch items with updated totals for section/quote calculations
  const { data: updatedItems } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id);

  const allItems = updatedItems || [];

  // Calculate section subtotals
  const sectionUpdates = (sections || []).map((section) => {
    const sectionItems = allItems.filter((item) => item.section_id === section.id);
    const subtotal = sectionItems.reduce((sum, item) => sum + Number(item.total), 0);

    return supabase
      .from("quote_sections")
      .update({ subtotal })
      .eq("id", section.id);
  });

  await Promise.all(sectionUpdates);

  // Calculate quote totals
  const subtotal = allItems.reduce((sum, item) => sum + Number(item.total), 0);
  const totalMaterials = allItems.reduce(
    (sum, item) => sum + Number(item.material_cost) * Number(item.quantity),
    0
  );
  const totalLabor = allItems.reduce(
    (sum, item) => sum + Number(item.labor_cost) * Number(item.quantity),
    0
  );
  const totalSubcontractor = allItems.reduce(
    (sum, item) => sum + Number(item.subcontractor_cost) * Number(item.quantity),
    0
  );
  const totalEquipment = allItems.reduce(
    (sum, item) => sum + Number(item.equipment_cost) * Number(item.quantity),
    0
  );

  const overheadPct = Number(quote.overhead_pct) || 0;
  const profitPct = Number(quote.profit_pct) || 0;
  const contingencyPct = Number(quote.contingency_pct) || 0;
  const salesTaxPct = Number(quote.sales_tax_pct) || 0;

  const overheadAmount = subtotal * (overheadPct / 100);
  const profitAmount = (subtotal + overheadAmount) * (profitPct / 100);
  const contingencyAmount = subtotal * (contingencyPct / 100);
  const taxAmount = subtotal * (salesTaxPct / 100);
  const grandTotal = subtotal + overheadAmount + profitAmount + contingencyAmount + taxAmount;

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
