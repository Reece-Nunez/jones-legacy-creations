import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const jobType = request.nextUrl.searchParams.get("job_type");

  let query = supabase
    .from("allowance_packages")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (jobType) {
    query = query.contains("applicable_job_types", [jobType]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
