import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch quote
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 }
    );
  }

  // Fetch all related data in parallel
  const [
    { data: sections },
    { data: items },
    { data: exclusions },
    { data: allowances },
    { data: riskFlags },
    { data: vendorQuotes },
    { data: files },
  ] = await Promise.all([
    supabase
      .from("quote_sections")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order"),
    supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order"),
    supabase
      .from("quote_exclusions")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order"),
    supabase
      .from("quote_allowances")
      .select("*")
      .eq("quote_id", id)
      .order("sort_order"),
    supabase
      .from("quote_risk_flags")
      .select("*")
      .eq("quote_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quote_vendor_quotes")
      .select("*")
      .eq("quote_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quote_files")
      .select("*")
      .eq("quote_id", id)
      .order("created_at", { ascending: false }),
  ]);

  // Nest items under their sections
  const sectionsWithItems = (sections || []).map((section) => ({
    ...section,
    items: (items || []).filter((item) => item.section_id === section.id),
  }));

  return NextResponse.json({
    ...quote,
    sections: sectionsWithItems,
    exclusions: exclusions || [],
    allowances: allowances || [],
    risk_flags: riskFlags || [],
    vendor_quotes: vendorQuotes || [],
    files: files || [],
  });
}

const allowedFields = [
  "project_id",
  "job_type_slug",
  "template_id",
  "estimate_stage",
  "status",
  "parent_quote_id",
  "client_name",
  "client_email",
  "client_phone",
  "project_name",
  "address",
  "city",
  "county",
  "state",
  "zip",
  "parcel_lot_info",
  "occupied_or_vacant",
  "financing_required",
  "target_start_date",
  "desired_completion_date",
  "plans_available",
  "engineering_available",
  "permit_status",
  "utilities_status",
  "owner_supplied_materials",
  "scope_summary",
  "included_scope",
  "excluded_scope",
  "notes",
  "labor_burden_pct",
  "overhead_pct",
  "profit_pct",
  "contingency_pct",
  "sales_tax_pct",
  "permit_allowance",
  "dumpster_allowance",
  "equipment_allowance",
  "cleanup_allowance",
  "valid_through_date",
  "payment_schedule",
  "change_order_language",
  "job_type_inputs",
  "created_by",
];

const pricingFields = [
  "labor_burden_pct",
  "overhead_pct",
  "profit_pct",
  "contingency_pct",
  "sales_tax_pct",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Filter to only allowed fields
  const updateData: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updateData[key] = body[key];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("quotes")
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 400 }
    );
  }

  // Recalculate totals if pricing fields changed
  const pricingChanged = pricingFields.some((f) => f in body);
  if (pricingChanged) {
    const baseUrl = request.nextUrl.origin;
    await fetch(`${baseUrl}/api/admin/quotes/${id}/calculate`, { method: "POST" });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from("quotes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
