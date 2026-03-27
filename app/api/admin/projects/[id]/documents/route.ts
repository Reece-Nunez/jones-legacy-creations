import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const name = formData.get("name") as string | null;
  const category = formData.get("category") as string | null;
  const drawRequestId = formData.get("draw_request_id") as string | null;
  const lineItemNumber = formData.get("line_item_number") as string | null;
  const vendor = formData.get("vendor") as string | null;
  const docType = formData.get("doc_type") as string | null;
  const autoCreatePayment = formData.get("auto_create_payment") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const fileName = `${id}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(fileName, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("project-documents")
    .getPublicUrl(fileName);

  const fileUrl = urlData.publicUrl;

  const { data, error } = await supabase
    .from("documents")
    .insert({
      project_id: id,
      name: name || file.name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      category: category || "general",
      draw_request_id: drawRequestId || null,
      line_item_number: lineItemNumber ? parseInt(lineItemNumber) : null,
      vendor: vendor || null,
      doc_type: docType || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auto-create contractor payment when uploading invoices/receipts to a draw
  if (
    autoCreatePayment === "true" &&
    drawRequestId &&
    vendor &&
    (docType?.toLowerCase() === "invoice" || docType?.toLowerCase() === "receipt")
  ) {
    // Try to match vendor to a contractor in the directory
    const { data: contractors } = await supabase
      .from("contractors")
      .select("id, name, company")
      .or(`name.ilike.%${vendor}%,company.ilike.%${vendor}%`)
      .limit(1);

    const matchedContractor = contractors?.[0] || null;

    await supabase.from("contractor_payments").insert({
      project_id: id,
      contractor_id: matchedContractor?.id || null,
      contractor_name: matchedContractor?.name || vendor,
      description: `${docType} — ${name || file.name}`,
      amount: 0, // Amount unknown from filename — Blake can edit later
      status: "pending",
      invoice_file_url: fileUrl,
      invoice_file_name: file.name,
    });

    // Log activity
    await supabase.from("activity_log").insert({
      project_id: id,
      action: "payment_created",
      description: `Auto-created payment record for ${vendor} from draw upload`,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
