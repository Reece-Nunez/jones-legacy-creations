import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const jobType = request.nextUrl.searchParams.get("job_type");

  let query = supabase
    .from("exclusion_library")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (jobType) {
    query = query.contains("applicable_job_types", [jobType]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
