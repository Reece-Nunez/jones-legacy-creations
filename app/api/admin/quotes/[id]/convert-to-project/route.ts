import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Map quote job_type_slug → project project_type
const JOB_TYPE_TO_PROJECT_TYPE: Record<string, string> = {
  new_construction: "new_home",
  takeover: "takeover",
  addition: "addition",
  remodel: "renovation",
  shop_storage: "garage",
  repair_punch: "other",
};

interface SimpleItem {
  trade: string;
  cost: number;
  isOwnerPurchase: boolean;
  note: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the quote
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message },
      { status: quoteError.code === "PGRST116" ? 404 : 500 }
    );
  }

  // Don't allow conversion if already linked to a project
  if (quote.project_id) {
    return NextResponse.json(
      { error: "This quote is already linked to a project", project_id: quote.project_id },
      { status: 400 }
    );
  }

  // Extract job-type-specific inputs
  const inputs = (quote.job_type_inputs || {}) as Record<string, unknown>;

  // Extract simple items for budget creation
  const simpleItems = (inputs.simple_items as SimpleItem[] | undefined) ?? [];

  // Calculate totals from simple items
  const contractorTotal = simpleItems
    .filter((i) => !i.isOwnerPurchase)
    .reduce((sum, i) => sum + (i.cost || 0), 0);
  const grandTotal = simpleItems.reduce((sum, i) => sum + (i.cost || 0), 0);

  // Use computed total if grand_total column is 0 (legacy quotes)
  const estimatedValue = quote.grand_total > 0 ? quote.grand_total : grandTotal;
  const contractValue = contractorTotal > 0 ? contractorTotal : estimatedValue;

  // Collect notes from all available fields
  const notesParts = [
    quote.notes,
    quote.included_scope ? `Included Scope:\n${quote.included_scope}` : null,
    quote.excluded_scope ? `Excluded Scope:\n${quote.excluded_scope}` : null,
    quote.owner_supplied_materials ? `Owner-Supplied Materials:\n${quote.owner_supplied_materials}` : null,
    `Created from Quote ${quote.quote_number}`,
  ].filter(Boolean);

  // Build project data from quote fields
  const projectData: Record<string, unknown> = {
    name: quote.project_name || `${quote.client_name} - ${quote.job_type_slug}`,
    client_name: quote.client_name,
    client_email: quote.client_email,
    client_phone: quote.client_phone,
    address: quote.address,
    city: quote.city,
    state: quote.state || "UT",
    zip: quote.zip,
    status: "approved",
    project_type: JOB_TYPE_TO_PROJECT_TYPE[quote.job_type_slug] || "other",
    description: quote.scope_summary || quote.notes || null,
    notes: notesParts.join("\n\n"),
    estimated_value: estimatedValue,
    contract_value: contractValue,
    start_date: quote.target_start_date,
    end_date: quote.desired_completion_date,
    // Map job-type-specific inputs
    square_footage: inputs.heated_sqft
      ?? (inputs.width && inputs.length ? Number(inputs.width) * Number(inputs.length) : null),
    stories: inputs.number_of_stories ? Number(inputs.number_of_stories) : null,
    bedrooms: inputs.beds ? Number(inputs.beds) : null,
    bathrooms: inputs.baths ? Number(inputs.baths) : null,
    lot_size: inputs.lot_size ?? null,
    flooring_preference: inputs.flooring_preference ?? null,
    countertop_preference: inputs.countertop_material ?? null,
    cabinet_preference: inputs.cabinet_level ?? null,
  };

  // Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert(projectData)
    .select()
    .single();

  if (projectError) {
    return NextResponse.json({ error: projectError.message }, { status: 400 });
  }

  // Create budget line items from simple items
  const pricedItems = simpleItems.filter((i) => i.cost > 0);

  if (pricedItems.length > 0) {
    const budgetItems = pricedItems.map((item, index) => ({
      project_id: project.id,
      line_number: String(index + 1),
      description: item.trade.toUpperCase(),
      budgeted_amount: item.cost,
      is_owner_purchase: item.isOwnerPurchase ?? false,
      notes: item.note || null,
    }));

    await supabase.from("budget_line_items").insert(budgetItems);
  }

  // Link the quote to the new project and mark as accepted
  await supabase
    .from("quotes")
    .update({ project_id: project.id, status: "accepted" })
    .eq("id", id);

  // Log activity
  await supabase.from("activity_log").insert({
    project_id: project.id,
    action: "project_created",
    description: `Project created from quote ${quote.quote_number} with ${pricedItems.length} budget line items`,
    metadata: {
      quote_id: id,
      quote_number: quote.quote_number,
      budget_items_count: pricedItems.length,
      estimated_value: estimatedValue,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
