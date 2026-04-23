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
  const aiReviewedDataRaw = formData.get("ai_reviewed_data") as string | null;

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

  // AI extraction: use human-reviewed data if provided, otherwise run AI
  let aiData: import("@/lib/extract-invoice").ExtractedInvoiceData | null = null;
  if (aiReviewedDataRaw) {
    // Human-reviewed AI data — already confirmed by the user
    try {
      const reviewed = JSON.parse(aiReviewedDataRaw);
      aiData = {
        vendor_name: reviewed.vendor_name || null,
        vendor_company: reviewed.vendor_company || null,
        vendor_email: null,
        vendor_phone: null,
        invoice_number: null,
        invoice_date: reviewed.date || null,
        due_date: null,
        amount: typeof reviewed.amount === "number" ? reviewed.amount : null,
        description: reviewed.description || null,
        category: reviewed.category || null,
        line_items: Array.isArray(reviewed.line_items) ? reviewed.line_items : [],
        is_paid: reviewed.is_paid === true,
        card_fee_warning: typeof reviewed.card_fee_warning === "string" ? reviewed.card_fee_warning : null,
      };
    } catch {
      // Invalid JSON, fall through to no AI data
    }
  } else if (useAi === "true") {
    const buffer = await file.arrayBuffer();
    aiData = await extractInvoiceData(buffer, file.type, file.name);
  }

  // Determine final values — AI data overrides filename parsing, but explicit form values override everything
  const finalVendor = vendor || aiData?.vendor_company || aiData?.vendor_name || null;
  const finalDocType = docType || (aiData?.category ? "Invoice" : null);

  // Map AI construction category → document category type
  function inferCategory(aiCat: string | null, fileMime: string): string {
    if (aiCat === "Permitting") return "permit";
    if (aiCat === "Plans" || aiCat === "Engineering") return "plan";
    // Any other specific construction trade → invoice
    const invoiceCats = ["Slab","Plumbing","Lumber","Framing","Trusses","HVAC","Electrical",
      "Windows","Roofing","Drywall","Painting","Flooring","Cabinets","Countertops",
      "Appliances","Landscaping","Concrete","Insulation","Fencing"];
    if (aiCat && invoiceCats.includes(aiCat)) return "invoice";
    // Has an amount → treat as invoice
    if (aiData?.amount) return "invoice";
    // Image without invoice signals → photo
    if (fileMime.startsWith("image/") && !aiData?.amount) return "photo";
    // Linked to a draw → invoice
    if (drawRequestId) return "invoice";
    return "general";
  }

  const finalCategory = category || inferCategory(aiData?.category ?? null, file.type);

  // Resolve contractor_id: use explicit ID, or try to match by vendor name.
  // Priority: 1) explicit ID, 2) exact match on project contractors, 3) exact match globally.
  // We use exact case-insensitive matching (not substring) to avoid false positives
  // like "Jones" matching "Blake Jones" when the contractor is someone else named Jones.
  let resolvedContractorId = contractorId || null;
  if (!resolvedContractorId && finalVendor) {
    const vendorLower = finalVendor.trim().toLowerCase();

    // First: try contractors already assigned to this project (most likely match)
    const { data: projectContractors } = await supabase
      .from("project_contractors")
      .select("contractor_id, contractors(id, name, company)")
      .eq("project_id", id);

    if (projectContractors) {
      const projectMatch = projectContractors.find((pc) => {
        const c = pc.contractors as unknown as { id: string; name: string; company: string | null };
        if (!c) return false;
        return c.name?.toLowerCase() === vendorLower
          || c.company?.toLowerCase() === vendorLower;
      });
      if (projectMatch) {
        resolvedContractorId = projectMatch.contractor_id;
      }
    }

    // Fallback: exact match in all contractors (not substring)
    if (!resolvedContractorId) {
      const { data: exactMatch } = await supabase
        .from("contractors")
        .select("id")
        .or(`name.ilike.${finalVendor},company.ilike.${finalVendor}`)
        .limit(1);
      resolvedContractorId = exactMatch?.[0]?.id || null;
    }
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
  let duplicatePayment: { id: string; amount: number; contractor_name: string } | null = null;
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

    // Duplicate detection: skip creating a new payment if one already exists
    // on this project with the same contractor (by id if resolved, else by name)
    // and the same amount. Prevents re-uploads from producing duplicate payments.
    if (aiData?.amount && aiData.amount > 0) {
      const nameForMatch = matchedContractor?.company || matchedContractor?.name || finalVendor;
      let dupQuery = supabase
        .from("contractor_payments")
        .select("id, amount, contractor_name")
        .eq("project_id", id)
        .eq("amount", aiData.amount);
      if (matchedContractor?.id) {
        dupQuery = dupQuery.eq("contractor_id", matchedContractor.id);
      } else {
        dupQuery = dupQuery.ilike("contractor_name", nameForMatch);
      }
      const { data: existingDupes } = await dupQuery.limit(1);
      if (existingDupes && existingDupes.length > 0) {
        duplicatePayment = existingDupes[0];
      }
    }

    if (!duplicatePayment) {
      const isPaid = aiData?.is_paid === true;
      const { data: payment } = await supabase
        .from("contractor_payments")
        .insert({
          project_id: id,
          contractor_id: matchedContractor?.id || null,
          contractor_name: matchedContractor?.company || matchedContractor?.name || finalVendor,
          description: aiData?.description || `${finalDocType || "Invoice"} — ${file.name}`,
          amount: aiData?.amount || 0,
          status: isPaid ? "paid" : "pending",
          paid_date: isPaid ? new Date().toISOString().split("T")[0] : null,
          due_date: aiData?.due_date || null,
          invoice_file_url: fileUrl,
          invoice_file_name: file.name,
          draw_request_id: drawRequestId || null,
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
      duplicate_payment: duplicatePayment,
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
