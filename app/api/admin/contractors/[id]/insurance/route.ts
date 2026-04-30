import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractInsuranceData } from "@/lib/extract-insurance";

const sanitize = (s: string) =>
  s.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contractor_insurance_documents")
    .select("*")
    .eq("contractor_id", id)
    .order("expiration_date", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const { data: contractor, error: cErr } = await supabase
    .from("contractors")
    .select("id")
    .eq("id", id)
    .single();
  if (cErr || !contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }

  const storagePath = `${id}/insurance/${Date.now()}-${sanitize(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("contractor-w9")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("contractor-w9")
    .getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  // AI auto-fill of carrier, policy #, coverage, expiration. Fields are
  // returned but stored as nullable so the user can correct if wrong.
  const buffer = await file.arrayBuffer();
  const ai = await extractInsuranceData(buffer, file.type, file.name);

  const { data: inserted, error: insertErr } = await supabase
    .from("contractor_insurance_documents")
    .insert({
      contractor_id: id,
      file_url: fileUrl,
      file_name: file.name,
      insurance_company: ai.insurance_company,
      policy_number: ai.policy_number,
      coverage_type: ai.coverage_type,
      expiration_date: ai.expiration_date,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ document: inserted, ai_extracted: ai });
}
