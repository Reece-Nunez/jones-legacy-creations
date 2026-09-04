import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { safeIlikeValue } from "@/lib/supabase/filterSafe";
import { extractInvoiceData } from "@/lib/extract-invoice";
import { recalcDrawTotal } from "@/lib/finance/draw-total";
import { detectDocumentFlags } from "@/lib/documents/detect-flags";
import { scanContextFor, storeFlags } from "@/lib/documents/scan-document";
import { analyzeUpload, type ParsedBudgetLine } from "@/lib/documents/analyze-upload";
import type { DocumentKind } from "@/lib/documents/document-kind";

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

  // Classify every upload that isn't obviously a photo, whatever category the
  // uploader picked. The old behaviour only read a file when someone chose
  // "Invoice" in the form, so invoices dropped into the Documents tab as plain
  // files were stored and forgotten — no vendor, no amount, no payment.
  //
  // Skipped when the invoice extractor already ran (explicit AI upload) or the
  // user reviewed the data by hand: those paths already know what the file is,
  // and this would be a second paid call saying the same thing.
  let documentKind: DocumentKind = "other";
  let parsedBudget: ParsedBudgetLine[] = [];
  const alreadyExtracted = Boolean(aiReviewedDataRaw) || useAi === "true";
  const looksLikePhoto = category === "photo";

  if (!alreadyExtracted && !looksLikePhoto) {
    try {
      const analysis = await analyzeUpload(await file.arrayBuffer(), file.type, file.name);
      documentKind = analysis.kind;

      if (analysis.kind === "budget") {
        parsedBudget = analysis.budget_lines;
      }

      // An invoice or receipt feeds the existing payment-creation path below by
      // filling in the same shape the explicit AI upload produces.
      if ((analysis.kind === "invoice" || analysis.kind === "receipt") && analysis.vendor_name) {
        aiData = {
          vendor_name: analysis.vendor_name,
          vendor_company: analysis.vendor_name,
          vendor_email: null,
          vendor_phone: null,
          invoice_number: null,
          invoice_date: analysis.invoice_date,
          due_date: analysis.due_date,
          amount: analysis.amount,
          description: analysis.description,
          category: null,
          line_items: [],
          is_paid: analysis.is_paid,
          card_fee_warning: analysis.card_fee_warning,
        };
      }
    } catch (e) {
      console.error("Upload classification failed:", e);
    }
  }

  // Determine final values — AI data overrides filename parsing, but explicit form values override everything
  const finalVendor = vendor || aiData?.vendor_company || aiData?.vendor_name || null;
  const finalDocType =
    docType ||
    (documentKind === "invoice" ? "Invoice" : documentKind === "receipt" ? "Receipt" : null) ||
    (aiData?.category ? "Invoice" : null);

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

  // A detected kind beats the mime/amount guesswork in inferCategory, but an
  // explicit choice in the upload form still wins over both.
  const KIND_TO_CATEGORY: Partial<Record<DocumentKind, string>> = {
    invoice: "invoice",
    receipt: "invoice",
    contract: "contract",
    permit: "permit",
    plan: "plan",
  };
  const finalCategory =
    category ||
    KIND_TO_CATEGORY[documentKind] ||
    inferCategory(aiData?.category ?? null, file.type);

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
        .or(`name.ilike.${safeIlikeValue(finalVendor)},company.ilike.${safeIlikeValue(finalVendor)}`)
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
      document_kind: documentKind,
      // Held for review rather than written into budget_line_items: applying a
      // budget replaces the project's lines, so it needs a confirmation step.
      parsed_budget: parsedBudget.length > 0 ? parsedBudget : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Auto-create contractor payment when we have invoice data
  let paymentRecord = null;
  let duplicatePayment: { id: string; amount: number; contractor_name: string } | null = null;
  // A detected invoice creates its payment too. Without this the auto path
  // classified the file correctly and then did nothing with it, which is the
  // bug that left GEM Engineering sitting in Documents with no payment.
  const detectedInvoice = documentKind === "invoice" || documentKind === "receipt";
  if (
    (autoCreatePayment === "true" || useAi === "true" || detectedInvoice) &&
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
    await recalcDrawTotal(supabase, id, drawRequestId);
  }

  // Discrepancy scan. Runs last so any payment created above is part of what
  // the document is checked against. Photos are skipped — there's nothing on a
  // site photo to disagree with, and each scan is a paid model call.
  //
  // Deliberately non-fatal: a failed scan must not fail an upload. The document
  // is already stored, and the "Scan documents" button picks up anything that
  // didn't get a flags_scanned_at stamp.
  let flagsRaised = 0;
  if (finalCategory !== "photo") {
    try {
      const { context, subjects } = await scanContextFor(supabase, id, fileUrl);
      if (context.length > 0) {
        const raw = await detectDocumentFlags({
          fileBuffer: await file.arrayBuffer(),
          fileType: file.type,
          fileName: file.name,
          context,
          kind: documentKind,
        });
        flagsRaised = await storeFlags(supabase, id, data.id, raw, subjects, documentKind);
      }
    } catch (e) {
      console.error("Document flag scan failed:", e);
    }
  }

  return NextResponse.json(
    {
      ...data,
      ai_extracted: aiData,
      document_kind: documentKind,
      parsed_budget: parsedBudget.length > 0 ? parsedBudget : null,
      payment_created: paymentRecord,
      duplicate_payment: duplicatePayment,
      flags_raised: flagsRaised,
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
