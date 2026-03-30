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

  // Remove the assignment from the junction table
  await supabase
    .from("project_contractors")
    .delete()
    .eq("contractor_id", contractorId)
    .eq("project_id", project_id);

  // Remove contractor_id from payments on this project
  await supabase
    .from("contractor_payments")
    .update({ contractor_id: null })
    .eq("contractor_id", contractorId)
    .eq("project_id", project_id);

  // Remove contractor_id from documents on this project
  await supabase
    .from("documents")
    .update({ contractor_id: null })
    .eq("contractor_id", contractorId)
    .eq("project_id", project_id);

  return NextResponse.json({ success: true });
}
