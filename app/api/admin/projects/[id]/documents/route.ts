import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractInvoiceData } from "@/lib/extract-invoice";

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
  const contractorId = formData.get("contractor_id") as string | null;
  const autoCreatePayment = formData.get("auto_create_payment") as string | null;
  const useAi = formData.get("use_ai") as string | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  // Upload file to storage
  const storagePath = `${id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("project-documents")
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  // AI extraction if requested
  let aiData = null;
  if (useAi === "true") {
    const buffer = await file.arrayBuffer();
    aiData = await extractInvoiceData(buffer, file.type, file.name);
  }

  // Determine final values — AI data overrides filename parsing, but explicit form values override everything
  const finalVendor = vendor || aiData?.vendor_company || aiData?.vendor_name || null;
  const finalDocType = docType || (aiData?.category ? "Invoice" : null);
  const finalCategory = category || (drawRequestId ? "draw_request" : "general");

  // Resolve contractor_id: use explicit ID, or try to match by vendor name
  let resolvedContractorId = contractorId || null;
  if (!resolvedContractorId && finalVendor) {
    const { data: matched } = await supabase
      .from("contractors")
      .select("id")
      .or(`name.ilike.%${finalVendor}%,company.ilike.%${finalVendor}%`)
      .limit(1);
    resolvedContractorId = matched?.[0]?.id || null;
  }

  // Create document record
  const { data, error } = await supabase
    .from("documents")
    .insert({
      project_id: id,
      name: name || file.name,
      file_url: fileUrl,
      file_type: file.type,
      file_size: file.size,
      category: finalCategory,
      draw_request_id: drawRequestId || null,
      line_item_number: lineItemNumber || null,
      vendor: finalVendor,
      doc_type: finalDocType,
      contractor_id: resolvedContractorId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auto-create contractor payment when we have invoice data
  let paymentRecord = null;
  if (
    (autoCreatePayment === "true" || useAi === "true") &&
    finalVendor &&
    (finalDocType?.toLowerCase() === "invoice" || finalDocType?.toLowerCase() === "receipt" || aiData?.amount)
  ) {
    // Use the already-resolved contractor, or fetch details if we have an ID
    let matchedContractor: { id: string; name: string; company: string } | null = null;
    if (resolvedContractorId) {
      const { data: cData } = await supabase
        .from("contractors")
        .select("id, name, company")
        .eq("id", resolvedContractorId)
        .single();
      matchedContractor = cData;
    }

    const { data: payment } = await supabase
      .from("contractor_payments")
      .insert({
        project_id: id,
        contractor_id: matchedContractor?.id || null,
        contractor_name: matchedContractor?.company || matchedContractor?.name || finalVendor,
        description: aiData?.description || `${finalDocType || "Invoice"} — ${file.name}`,
        amount: aiData?.amount || 0,
        status: "pending",
        due_date: aiData?.due_date || null,
        invoice_file_url: fileUrl,
        invoice_file_name: file.name,
      })
      .select()
      .single();

    paymentRecord = payment;

    await supabase.from("activity_log").insert({
      project_id: id,
      action: "payment_created",
      description: `${aiData?.amount ? `$${aiData.amount.toLocaleString()}` : "Invoice"} from ${finalVendor}${aiData?.description ? ` — ${aiData.description}` : ""}`,
    });
  }

  // Update draw total — sum all contractor payments linked to this draw's documents
  if (drawRequestId && aiData?.amount) {
    const { data: drawPayments } = await supabase
      .from("contractor_payments")
      .select("amount")
      .eq("project_id", id)
      .in(
        "invoice_file_url",
        (await supabase
          .from("documents")
          .select("file_url")
          .eq("draw_request_id", drawRequestId)
        ).data?.map((d) => d.file_url) || []
      );

    if (drawPayments) {
      const drawTotal = drawPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      await supabase
        .from("draw_requests")
        .update({ amount: drawTotal })
        .eq("id", drawRequestId);
    }
  }

  return NextResponse.json(
    {
      ...data,
      ai_extracted: aiData,
      payment_created: paymentRecord,
    },
    { status: 201 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { id: docId, ...updates } = body;

  if (!docId) {
    return NextResponse.json({ error: "Document id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", docId)
    .eq("project_id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
