import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractorId } = await params;
  const supabase = await createClient();
  const { project_id } = await request.json();

  if (!project_id) {
    return NextResponse.json({ error: "project_id is required" }, { status: 400 });
  }

  // Get contractor details for name matching
  const { data: contractor } = await supabase
    .from("contractors")
    .select("name, company")
    .eq("id", contractorId)
    .single();

  if (!contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const searchTerms = [contractor.name, contractor.company].filter(Boolean);

  // Link unlinked payments on this project that match by name
  for (const term of searchTerms) {
    await supabase
      .from("contractor_payments")
      .update({ contractor_id: contractorId })
      .eq("project_id", project_id)
      .is("contractor_id", null)
      .ilike("contractor_name", `%${term}%`);
  }

  // Link unlinked documents on this project that match by vendor
  for (const term of searchTerms) {
    await supabase
      .from("documents")
      .update({ contractor_id: contractorId })
      .eq("project_id", project_id)
      .is("contractor_id", null)
      .ilike("vendor", `%${term}%`);
  }

  return NextResponse.json({ success: true });
}
