import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const allowed = [
    "insurance_company",
    "policy_number",
    "coverage_type",
    "expiration_date",
    "file_name",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key] === "" ? null : body[key];
  }

  const { data, error } = await supabase
    .from("contractor_insurance_documents")
    .update(patch)
    .eq("id", docId)
    .eq("contractor_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("contractor_insurance_documents")
    .delete()
    .eq("id", docId)
    .eq("contractor_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
