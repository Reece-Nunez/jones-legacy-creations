import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStoragePath } from "@/lib/supabase/signedUrl";
import { processUploadedDocument } from "@/lib/documents/process-upload";
import type { ExtractedInvoiceData } from "@/lib/extract-invoice";

// Two model calls per document (classify, then flag). One document per request
// keeps that inside the function budget; the client walks the batch.
export const maxDuration = 60;

/**
 * Read one already-stored document: work out what it is, file it, create the
 * payment an invoice implies, and flag anything that disagrees with the
 * project.
 *
 * This is the second half of an upload. The bytes are already in storage by
 * the time this runs, so a slow or failed scan costs the uploader nothing —
 * the document is safe either way and this can be retried.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin(undefined, { allowContractor: true });
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const documentId = typeof body.document_id === "string" ? body.document_id : null;
  if (!documentId) {
    return NextResponse.json({ error: "document_id is required" }, { status: 400 });
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("project_id", id)
    .single();

  if (docError || !doc) {
    return NextResponse.json(
      { error: docError?.message || "Document not found" },
      { status: 404 }
    );
  }

  // The bucket is private, so the file comes back through the service-role
  // client — the same route the "Scan documents" catch-up button takes.
  const docPath = parseStoragePath(doc.file_url, "project-documents");
  if (!docPath) {
    return NextResponse.json(
      { error: "Stored file_url does not match project-documents bucket" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: blob, error: dlErr } = await admin.storage
    .from("project-documents")
    .download(docPath);

  if (dlErr || !blob) {
    return NextResponse.json(
      { error: dlErr?.message || "Failed to download file" },
      { status: 500 }
    );
  }

  // Data the uploader already reviewed by hand travels with the scan request
  // rather than being re-derived: re-reading a document the user has just
  // corrected would overwrite their corrections with the model's guess.
  let reviewed: ExtractedInvoiceData | null = null;
  if (body.ai_reviewed_data && typeof body.ai_reviewed_data === "object") {
    const r = body.ai_reviewed_data as Record<string, unknown>;
    reviewed = {
      vendor_name: (r.vendor_name as string) || null,
      vendor_company: (r.vendor_company as string) || null,
      vendor_email: null,
      vendor_phone: null,
      invoice_number: null,
      invoice_date: (r.date as string) || null,
      due_date: null,
      amount: typeof r.amount === "number" ? r.amount : null,
      description: (r.description as string) || null,
      category: (r.category as string) || null,
      line_items: Array.isArray(r.line_items) ? r.line_items : [],
      is_paid: r.is_paid === true,
      card_fee_warning: typeof r.card_fee_warning === "string" ? r.card_fee_warning : null,
    };
  }

  const result = await processUploadedDocument({
    supabase,
    projectId: id,
    documentId: doc.id,
    fileBuffer: await blob.arrayBuffer(),
    fileType: doc.file_type || "application/pdf",
    fileName: doc.name || "document",
    fileUrl: doc.file_url,
    explicitCategory: doc.category ?? null,
    explicitVendor: doc.vendor ?? null,
    explicitDocType: doc.doc_type ?? null,
    contractorId: doc.contractor_id ?? null,
    drawRequestId: doc.draw_request_id ?? null,
    aiData: reviewed,
    alreadyExtracted: reviewed !== null,
    autoCreatePayment: body.auto_create_payment === true,
  });

  return NextResponse.json({ document_id: doc.id, ...result });
}
