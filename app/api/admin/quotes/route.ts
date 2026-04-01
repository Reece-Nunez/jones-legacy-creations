import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const status = request.nextUrl.searchParams.get("status");
  const jobType = request.nextUrl.searchParams.get("job_type");

  let query = supabase.from("quotes").select("*").order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }
  if (jobType) {
    query = query.eq("job_type_slug", jobType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Fields that map directly to quote table columns
const QUOTE_COLUMNS = new Set([
  "project_id", "job_type_slug", "template_id", "estimate_stage", "status",
  "client_name", "client_email", "client_phone", "project_name",
  "address", "city", "county", "state", "zip", "parcel_lot_info",
  "occupied_or_vacant", "financing_required",
  "target_start_date", "desired_completion_date",
  "plans_available", "engineering_available", "permit_status", "utilities_status",
  "owner_supplied_materials", "scope_summary", "included_scope", "excluded_scope", "notes",
  "labor_burden_pct", "overhead_pct", "profit_pct", "contingency_pct", "sales_tax_pct",
  "permit_allowance", "dumpster_allowance", "equipment_allowance", "cleanup_allowance",
  "valid_through_date", "payment_schedule", "change_order_language",
  "job_type_inputs", "created_by",
  "revision_number", "parent_quote_id",
]);

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  // Separate known columns from job-type-specific inputs
  const quoteData: Record<string, unknown> = {};
  const jobTypeInputs: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body)) {
    if (QUOTE_COLUMNS.has(key)) {
      quoteData[key] = value;
    } else {
      jobTypeInputs[key] = value;
    }
  }

  // Merge job-type-specific inputs into the jsonb column
  if (Object.keys(jobTypeInputs).length > 0) {
    quoteData.job_type_inputs = {
      ...(quoteData.job_type_inputs as Record<string, unknown> ?? {}),
      ...jobTypeInputs,
    };
  }

  // Set pricing control defaults if not provided
  const defaults: Record<string, unknown> = {
    labor_burden_pct: 0,
    overhead_pct: 10,
    profit_pct: 10,
    contingency_pct: 5,
    sales_tax_pct: 0,
    permit_allowance: 0,
    dumpster_allowance: 0,
    equipment_allowance: 0,
    cleanup_allowance: 0,
    status: "draft",
  };

  const insertData = { ...defaults, ...quoteData };

  const { data, error } = await supabase.from("quotes").insert(insertData).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
