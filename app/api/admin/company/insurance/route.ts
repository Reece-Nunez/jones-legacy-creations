import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { extractInsuranceData } from "@/lib/extract-insurance";

// Storage keys are sanitized rather than stored verbatim. A raw name like
// "LOT 42_Deed of Trust.pdf" round-trips through percent-encoding on every
// read, which is where preview/download URLs get brittle. Keys here are
// always [A-Za-z0-9._-]; the original name is preserved in file_name for
// display.
const sanitize = (s: string) =>
  s.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");

export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("company_insurance_documents")
    .select("*")
    .order("expiration_date", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const storagePath = `insurance/${Date.now()}-${sanitize(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("company-documents")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("company-documents")
    .getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  // AI auto-fill of carrier, policy #, coverage, expiration. Stored nullable
  // so the user can correct anything it reads wrong.
  const buffer = await file.arrayBuffer();
  const ai = await extractInsuranceData(buffer, file.type, file.name);

  const { data: inserted, error: insertErr } = await supabase
    .from("company_insurance_documents")
    .insert({
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
