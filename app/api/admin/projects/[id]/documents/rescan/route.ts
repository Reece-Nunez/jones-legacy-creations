import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractInvoiceData } from "@/lib/extract-invoice";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { document_ids } = await request.json();

  if (!Array.isArray(document_ids) || document_ids.length === 0) {
    return NextResponse.json(
      { error: "document_ids array is required" },
      { status: 400 }
    );
  }

  const results: Array<{
    document_id: string;
    success: boolean;
    error?: string;
    vendor?: string | null;
    amount?: number | null;
  }> = [];

  for (const docId of document_ids) {
    try {
      // 1. Fetch document record
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", docId)
        .eq("project_id", id)
        .single();

      if (docError || !doc) {
        results.push({
          document_id: docId,
          success: false,
          error: docError?.message || "Document not found",
        });
        continue;
      }

      // 2. Download the file from file_url
      const fileResponse = await fetch(doc.file_url);
      if (!fileResponse.ok) {
        results.push({
          document_id: docId,
          success: false,
          error: `Failed to download file: ${fileResponse.status}`,
        });
        continue;
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      const fileType = doc.file_type || "application/pdf";
      const fileName = doc.name || "document";

      // 3. Extract data with AI
      const aiData = await extractInvoiceData(fileBuffer, fileType, fileName);

      // 4. Update document record with extracted data
      const updateFields: Record<string, unknown> = {};
      if (aiData.vendor_company || aiData.vendor_name) {
        updateFields.vendor = aiData.vendor_company || aiData.vendor_name;
      }
      if (aiData.category) {
        updateFields.doc_type = "Invoice";
      }

      if (Object.keys(updateFields).length > 0) {
        await supabase
          .from("documents")
          .update(updateFields)
          .eq("id", docId);
      }

      // 5. Find or update matching contractor_payment by invoice_file_url
      const finalVendor =
        aiData.vendor_company || aiData.vendor_name || doc.vendor;

      const { data: existingPayment } = await supabase
        .from("contractor_payments")
        .select("id")
        .eq("invoice_file_url", doc.file_url)
        .limit(1)
        .single();

      if (existingPayment) {
        // Update existing payment
        const paymentUpdate: Record<string, unknown> = {};
        if (aiData.amount != null) paymentUpdate.amount = aiData.amount;
        if (aiData.description)
          paymentUpdate.description = aiData.description;
        if (aiData.due_date) paymentUpdate.due_date = aiData.due_date;
        if (finalVendor) paymentUpdate.contractor_name = finalVendor;

        if (Object.keys(paymentUpdate).length > 0) {
          await supabase
            .from("contractor_payments")
            .update(paymentUpdate)
            .eq("id", existingPayment.id);
        }
      } else if (finalVendor && aiData.amount) {
        // 6. Create new payment if AI found amount and vendor
        // Try to match vendor to a contractor
        const { data: contractors } = await supabase
          .from("contractors")
          .select("id, name, company")
          .or(
            `name.ilike.%${finalVendor}%,company.ilike.%${finalVendor}%`
          )
          .limit(1);

        const matchedContractor = contractors?.[0] || null;

        await supabase.from("contractor_payments").insert({
          project_id: id,
          contractor_id: matchedContractor?.id || null,
          contractor_name:
            matchedContractor?.company ||
            matchedContractor?.name ||
            finalVendor,
          description:
            aiData.description || `Invoice — ${fileName}`,
          amount: aiData.amount,
          status: "pending",
          due_date: aiData.due_date || null,
          invoice_file_url: doc.file_url,
          invoice_file_name: doc.name,
        });
      }

      results.push({
        document_id: docId,
        success: true,
        vendor: finalVendor,
        amount: aiData.amount,
      });
    } catch (err) {
      results.push({
        document_id: docId,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // Recalculate draw totals for any affected draws
  const affectedDrawIds = new Set<string>();
  for (const docId of document_ids) {
    const { data: doc } = await supabase
      .from("documents")
      .select("draw_request_id")
      .eq("id", docId)
      .single();
    if (doc?.draw_request_id) affectedDrawIds.add(doc.draw_request_id);
  }

  for (const drawId of affectedDrawIds) {
    const { data: drawDocs } = await supabase
      .from("documents")
      .select("file_url")
      .eq("draw_request_id", drawId);

    if (drawDocs && drawDocs.length > 0) {
      const { data: drawPayments } = await supabase
        .from("contractor_payments")
        .select("amount")
        .eq("project_id", id)
        .in("invoice_file_url", drawDocs.map((d) => d.file_url));

      if (drawPayments) {
        const drawTotal = drawPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        await supabase
          .from("draw_requests")
          .update({ amount: drawTotal })
          .eq("id", drawId);
      }
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
