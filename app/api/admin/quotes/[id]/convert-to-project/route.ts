import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Map quote job_type_slug → project project_type
const JOB_TYPE_TO_PROJECT_TYPE: Record<string, string> = {
  new_construction: "new_home",
  takeover: "new_home",
  addition: "addition",
  remodel: "renovation",
  shop_storage: "garage",
  repair_punch: "other",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the quote with sections
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

  // Extract job-type-specific inputs for extra field mapping
  const inputs = (quote.job_type_inputs || {}) as Record<string, unknown>;

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
    description: quote.scope_summary,
    notes: [
      quote.notes,
      quote.included_scope ? `Included Scope: ${quote.included_scope}` : null,
      `Created from Quote ${quote.quote_number}`,
    ].filter(Boolean).join("\n\n"),
    estimated_value: quote.grand_total,
    contract_value: quote.grand_total,
    start_date: quote.target_start_date,
    end_date: quote.desired_completion_date,
    // Map from job_type_inputs if available
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

  // Fetch quote sections to create budget line items
  const { data: sections } = await supabase
    .from("quote_sections")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order");

  // Create budget line items from quote sections
  if (sections && sections.length > 0) {
    const budgetItems = sections.map((section, index) => ({
      project_id: project.id,
      line_number: String(index + 1),
      description: section.name.toUpperCase(),
      budgeted_amount: Number(section.subtotal) || 0,
      notes: section.notes,
    }));

    // Add overhead, profit, contingency as separate line items
    if (Number(quote.overhead_amount) > 0) {
      budgetItems.push({
        project_id: project.id,
        line_number: String(budgetItems.length + 1),
        description: "OVERHEAD",
        budgeted_amount: Number(quote.overhead_amount),
        notes: `${quote.overhead_pct}%`,
      });
    }
    if (Number(quote.profit_amount) > 0) {
      budgetItems.push({
        project_id: project.id,
        line_number: String(budgetItems.length + 1),
        description: "PROFIT",
        budgeted_amount: Number(quote.profit_amount),
        notes: `${quote.profit_pct}%`,
      });
    }
    if (Number(quote.contingency_amount) > 0) {
      budgetItems.push({
        project_id: project.id,
        line_number: String(budgetItems.length + 1),
        description: "CONTINGENCY",
        budgeted_amount: Number(quote.contingency_amount),
        notes: `${quote.contingency_pct}%`,
      });
    }

    await supabase.from("budget_line_items").insert(budgetItems);
  }

  // Link the quote to the new project
  await supabase
    .from("quotes")
    .update({ project_id: project.id, status: "accepted" })
    .eq("id", id);

  // Log activity on the new project
  await supabase.from("activity_log").insert({
    project_id: project.id,
    action: "project_created",
    description: `Project created from quote ${quote.quote_number}`,
    metadata: { quote_id: id, quote_number: quote.quote_number },
  });

  return NextResponse.json(project, { status: 201 });
}
