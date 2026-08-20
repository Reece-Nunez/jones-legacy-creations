import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { parseStoragePath } from "@/lib/supabase/signedUrl";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  const allowed = [
    "insurance_company",
    "policy_number",
    "coverage_type",
    "expiration_date",
    "file_name",
    "notes",
  ] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key] === "" ? null : body[key];
  }

  const { data, error } = await supabase
    .from("company_insurance_documents")
    .update(patch)
    .eq("id", docId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  // Read the row first so we can clean up the stored object too. The
  // contractor equivalent leaves orphaned files in the bucket; no reason to
  // repeat that here.
  const { data: doc } = await supabase
    .from("company_insurance_documents")
    .select("file_url")
    .eq("id", docId)
    .maybeSingle();

  const { error } = await supabase
    .from("company_insurance_documents")
    .delete()
    .eq("id", docId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort: the row is already gone, so a storage failure shouldn't
  // surface as a failed delete to the user.
  if (doc?.file_url) {
    const path = parseStoragePath(doc.file_url, "company-documents");
    if (path) {
      await supabase.storage.from("company-documents").remove([path]);
    }
  }

  return NextResponse.json({ success: true });
}
