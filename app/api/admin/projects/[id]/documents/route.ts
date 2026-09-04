import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { extractInvoiceData } from "@/lib/extract-invoice";
import { recalcDrawTotal } from "@/lib/finance/draw-total";
import { processUploadedDocument } from "@/lib/documents/process-upload";
import { isProjectStoragePath } from "@/lib/supabase/storagePath";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "project-documents";

// The FormData branch below still reads and classifies a file inline, which is
// two model calls. The JSON branch does no model work at all.
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Contractors may list and upload documents for their own project; RLS on
  // the documents table and the project-documents bucket confines them to the
  // projects they've been granted.
  const gate = await requireAdmin(undefined, { allowContractor: true });
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

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

/**
 * File a document that the browser has already uploaded straight into storage
 * with a signed URL from ./upload-url.
 *
 * No bytes and no model calls, so this stays well inside both the request-body
 * cap and the function timeout however large the file was. Reading the
 * document is a separate step — POST ./scan with the returned id.
 */
async function registerUploadedFile(
  supabase: SupabaseClient,
  projectId: string,
  body: Record<string, unknown>,
) {
  const storagePath = typeof body.storage_path === "string" ? body.storage_path : "";

  // The path was minted by ./upload-url under this project's prefix. Checking
  // it again here is what stops a caller from hanging a record off another
  // project's file, since the record — not the object — is what the UI reads.
  if (!isProjectStoragePath(storagePath, projectId)) {
    return NextResponse.json(
      { error: "storage_path does not belong to this project" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name : storagePath;
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("documents")
    .insert({
      project_id: projectId,
      name,
      file_url: urlData.publicUrl,
      file_type: (body.file_type as string) || null,
      file_size: typeof body.file_size === "number" ? body.file_size : null,
      category: (body.category as string) || "general",
      draw_request_id: (body.draw_request_id as string) || null,
      line_item_number: (body.line_item_number as string) || null,
      vendor: (body.vendor as string) || null,
      doc_type: (body.doc_type as string) || null,
      contractor_id: (body.contractor_id as string) || null,
      // Null, not "other": null means never read, and that is what the
      // "Scan documents" button looks for. "other" would mean read and
      // found to be nothing special, which would hide an unscanned
      // invoice from the one thing that could still pick it up.
      document_kind: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ...data, scan_pending: true }, { status: 201 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Contractors may list and upload documents for their own project; RLS on
  // the documents table and the project-documents bucket confines them to the
  // projects they've been granted.
  const gate = await requireAdmin(undefined, { allowContractor: true });
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  if ((request.headers.get("content-type") || "").includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return registerUploadedFile(supabase, id, body as Record<string, unknown>);
  }

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
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
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
      line_item_number: lineItemNumber || null,
      vendor: vendor || null,
      doc_type: docType || null,
      contractor_id: contractorId || null,
      document_kind: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Classify, file, pay and flag. Inline here because these callers send one
  // small file and read the result out of the response; the Documents tab
  // takes the two-phase route above instead.
  const processed = await processUploadedDocument({
    supabase,
    projectId: id,
    documentId: data.id,
    fileBuffer: await file.arrayBuffer(),
    fileType: file.type,
    fileName: file.name,
    fileUrl,
    explicitCategory: category,
    explicitVendor: vendor,
    explicitDocType: docType,
    contractorId,
    drawRequestId,
    aiData,
    alreadyExtracted: Boolean(aiReviewedDataRaw) || useAi === "true",
    autoCreatePayment: autoCreatePayment === "true" || useAi === "true",
  });

  return NextResponse.json(
    {
      ...data,
      // Reflect what processing wrote back, so the response is the filed
      // document rather than the placeholder row it was inserted as.
      category: processed.category,
      vendor: processed.vendor,
      doc_type: processed.doc_type,
      contractor_id: processed.contractor_id,
      ai_extracted: processed.ai_extracted,
      document_kind: processed.document_kind,
      parsed_budget: processed.parsed_budget,
      payment_created: processed.payment_created,
      duplicate_payment: processed.duplicate_payment,
      flags_raised: processed.flags_raised,
    },
    { status: 201 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Contractors may list and upload documents for their own project; RLS on
  // the documents table and the project-documents bucket confines them to the
  // projects they've been granted.
  const gate = await requireAdmin(undefined, { allowContractor: true });
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const body = await request.json();

  const { id: docId, ...updates } = body;

  if (!docId) {
    return NextResponse.json({ error: "Document id is required" }, { status: 400 });
  }

  // Moving a document between draws (including off a draw entirely, with
  // draw_request_id: null) has to be read before the update so the draw it is
  // leaving can be re-totalled too.
  const movingDraw = Object.prototype.hasOwnProperty.call(updates, "draw_request_id");
  let previousDrawId: string | null = null;
  let fileUrl: string | null = null;
  if (movingDraw) {
    const { data: before } = await supabase
      .from("documents")
      .select("draw_request_id, file_url")
      .eq("id", docId)
      .eq("project_id", id)
      .single();
    previousDrawId = before?.draw_request_id ?? null;
    fileUrl = before?.file_url ?? null;
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

  if (movingDraw && fileUrl) {
    const nextDrawId = (updates.draw_request_id as string | null) ?? null;

    // The invoice and the payment it created travel together. Without this the
    // payment keeps pointing at the old draw: it stops showing under that
    // draw's documents but never reappears in "Not on a draw yet", so it is
    // invisible everywhere.
    await supabase
      .from("contractor_payments")
      .update({ draw_request_id: nextDrawId })
      .eq("project_id", id)
      .eq("invoice_file_url", fileUrl);

    const affected = [previousDrawId, nextDrawId].filter(
      (drawId, idx, all): drawId is string => Boolean(drawId) && all.indexOf(drawId) === idx,
    );
    for (const drawId of affected) {
      await recalcDrawTotal(supabase, id, drawId);
    }
  }

  return NextResponse.json(data);
}
