import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedInvoiceData } from "@/lib/extract-invoice";
import { recalcDrawTotal } from "@/lib/finance/draw-total";
import { safeIlikeValue } from "@/lib/supabase/filterSafe";
import { analyzeUpload, type ParsedBudgetLine } from "./analyze-upload";
import { detectDocumentFlags } from "./detect-flags";
import { scanContextFor, storeFlags } from "./scan-document";
import type { DocumentKind } from "./document-kind";

/**
 * Everything that happens to an uploaded document *after* its bytes are in
 * storage and its row exists: classify it, file it under the right category
 * and vendor, create the payment an invoice implies, and scan it for
 * discrepancies.
 *
 * Split out of the upload route because the two halves now run in separate
 * requests. Pushing 16 files through one route that also made two model calls
 * per file meant a single upload took the better part of a minute, and
 * Vercel's 4.5 MB request-body cap rejected the large ones outright with a
 * 413. Bytes now go straight from the browser to Supabase Storage and this
 * runs afterwards, one document per request, so neither limit is in the way.
 *
 * The FormData upload path still calls this inline — those callers (draws,
 * permits) send one small file and expect the result in the response.
 */

export type ProcessResult = {
  document_kind: DocumentKind;
  parsed_budget: ParsedBudgetLine[] | null;
  ai_extracted: ExtractedInvoiceData | null;
  payment_created: unknown | null;
  duplicate_payment: { id: string; amount: number; contractor_name: string } | null;
  flags_raised: number;
  /** The values written back onto the document row, so a caller can return
   *  the filed document without re-reading it. */
  category: string;
  vendor: string | null;
  doc_type: string | null;
  contractor_id: string | null;
};

export type ProcessOptions = {
  supabase: SupabaseClient;
  projectId: string;
  /** Row id of the already-inserted document. */
  documentId: string;
  fileBuffer: ArrayBuffer;
  fileType: string;
  fileName: string;
  /** Stored file_url — the key payments and flag context are matched on. */
  fileUrl: string;
  /** Category the uploader picked in the form, if any. Beats detection. */
  explicitCategory?: string | null;
  explicitVendor?: string | null;
  explicitDocType?: string | null;
  contractorId?: string | null;
  drawRequestId?: string | null;
  /**
   * Already-extracted invoice data (human-reviewed, or from the explicit
   * invoice extractor). Set `alreadyExtracted` alongside it to skip the
   * classification call — those paths already know what the file is, and a
   * second call is a paid restatement of it.
   */
  aiData?: ExtractedInvoiceData | null;
  alreadyExtracted?: boolean;
  autoCreatePayment?: boolean;
};

/** Map an AI construction category onto a document category. */
function inferCategory(
  aiCat: string | null,
  fileMime: string,
  amount: number | null | undefined,
  drawRequestId: string | null | undefined,
): string {
  if (aiCat === "Permitting") return "permit";
  if (aiCat === "Plans" || aiCat === "Engineering") return "plan";
  // Any other specific construction trade → invoice
  const invoiceCats = ["Slab","Plumbing","Lumber","Framing","Trusses","HVAC","Electrical",
    "Windows","Roofing","Drywall","Painting","Flooring","Cabinets","Countertops",
    "Appliances","Landscaping","Concrete","Insulation","Fencing"];
  if (aiCat && invoiceCats.includes(aiCat)) return "invoice";
  // Has an amount → treat as invoice
  if (amount) return "invoice";
  // Image without invoice signals → photo
  if (fileMime.startsWith("image/") && !amount) return "photo";
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

/**
 * Resolve a vendor name to a contractor row.
 *
 * Exact case-insensitive matching (not substring) to avoid false positives
 * like "Jones" matching "Blake Jones" when the contractor is someone else
 * named Jones. Contractors already on the project are checked first — they are
 * the likeliest match.
 */
async function resolveContractorId(
  supabase: SupabaseClient,
  projectId: string,
  vendor: string,
): Promise<string | null> {
  const vendorLower = vendor.trim().toLowerCase();

  const { data: projectContractors } = await supabase
    .from("project_contractors")
    .select("contractor_id, contractors(id, name, company)")
    .eq("project_id", projectId);

  if (projectContractors) {
    const projectMatch = projectContractors.find((pc) => {
      const c = pc.contractors as unknown as { id: string; name: string; company: string | null };
      if (!c) return false;
      return c.name?.toLowerCase() === vendorLower
        || c.company?.toLowerCase() === vendorLower;
    });
    if (projectMatch) return projectMatch.contractor_id;
  }

  const { data: exactMatch } = await supabase
    .from("contractors")
    .select("id")
    .or(`name.ilike.${safeIlikeValue(vendor)},company.ilike.${safeIlikeValue(vendor)}`)
    .limit(1);
  return exactMatch?.[0]?.id || null;
}

export async function processUploadedDocument(opts: ProcessOptions): Promise<ProcessResult> {
  const {
    supabase,
    projectId,
    documentId,
    fileBuffer,
    fileType,
    fileName,
    fileUrl,
    explicitCategory = null,
    explicitVendor = null,
    explicitDocType = null,
    contractorId = null,
    drawRequestId = null,
    autoCreatePayment = false,
  } = opts;

  let aiData: ExtractedInvoiceData | null = opts.aiData ?? null;
  let documentKind: DocumentKind = "other";
  let parsedBudget: ParsedBudgetLine[] = [];

  // Classify every upload that isn't obviously a photo, whatever category the
  // uploader picked. The old behaviour only read a file when someone chose
  // "Invoice" in the form, so invoices dropped into the Documents tab as plain
  // files were stored and forgotten — no vendor, no amount, no payment.
  const looksLikePhoto = explicitCategory === "photo";
  if (!opts.alreadyExtracted && !looksLikePhoto) {
    try {
      const analysis = await analyzeUpload(fileBuffer, fileType, fileName);
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

  // Determine final values — AI data overrides filename parsing, but explicit
  // form values override everything.
  const finalVendor = explicitVendor || aiData?.vendor_company || aiData?.vendor_name || null;
  const finalDocType =
    explicitDocType ||
    (documentKind === "invoice" ? "Invoice" : documentKind === "receipt" ? "Receipt" : null) ||
    (aiData?.category ? "Invoice" : null);
  const finalCategory =
    explicitCategory ||
    KIND_TO_CATEGORY[documentKind] ||
    inferCategory(aiData?.category ?? null, fileType, aiData?.amount, drawRequestId);

  let resolvedContractorId = contractorId || null;
  if (!resolvedContractorId && finalVendor) {
    resolvedContractorId = await resolveContractorId(supabase, projectId, finalVendor);
  }

  await supabase
    .from("documents")
    .update({
      category: finalCategory,
      vendor: finalVendor,
      doc_type: finalDocType,
      contractor_id: resolvedContractorId,
      document_kind: documentKind,
      // Held for review rather than written into budget_line_items: applying a
      // budget replaces the project's lines, so it needs a confirmation step.
      parsed_budget: parsedBudget.length > 0 ? parsedBudget : null,
    })
    .eq("id", documentId)
    .eq("project_id", projectId);

  // Auto-create contractor payment when we have invoice data
  let paymentRecord: unknown = null;
  let duplicatePayment: { id: string; amount: number; contractor_name: string } | null = null;
  // A detected invoice creates its payment too. Without this the auto path
  // classified the file correctly and then did nothing with it, which is the
  // bug that left GEM Engineering sitting in Documents with no payment.
  const detectedInvoice = documentKind === "invoice" || documentKind === "receipt";
  if (
    (autoCreatePayment || detectedInvoice) &&
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
        .eq("project_id", projectId)
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
          project_id: projectId,
          contractor_id: matchedContractor?.id || null,
          contractor_name: matchedContractor?.company || matchedContractor?.name || finalVendor,
          description: aiData?.description || `${finalDocType || "Invoice"} — ${fileName}`,
          amount: aiData?.amount || 0,
          status: isPaid ? "paid" : "pending",
          paid_date: isPaid ? new Date().toISOString().split("T")[0] : null,
          due_date: aiData?.due_date || null,
          invoice_file_url: fileUrl,
          invoice_file_name: fileName,
          draw_request_id: drawRequestId || null,
        })
        .select()
        .single();

      paymentRecord = payment;

      await supabase.from("activity_log").insert({
        project_id: projectId,
        action: "payment_created",
        description: `${aiData?.amount ? `$${aiData.amount.toLocaleString()}` : "Invoice"} from ${finalVendor}${aiData?.description ? ` — ${aiData.description}` : ""}`,
      });
    }
  }

  // Update draw total — sum all contractor payments linked to this draw's documents
  if (drawRequestId && aiData?.amount) {
    await recalcDrawTotal(supabase, projectId, drawRequestId);
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
      const { context, subjects } = await scanContextFor(supabase, projectId, fileUrl);
      if (context.length > 0) {
        const raw = await detectDocumentFlags({
          fileBuffer,
          fileType,
          fileName,
          context,
          kind: documentKind,
        });
        flagsRaised = await storeFlags(supabase, projectId, documentId, raw, subjects, documentKind);
      }
    } catch (e) {
      console.error("Document flag scan failed:", e);
    }
  }

  return {
    document_kind: documentKind,
    parsed_budget: parsedBudget.length > 0 ? parsedBudget : null,
    ai_extracted: aiData,
    payment_created: paymentRecord,
    duplicate_payment: duplicatePayment,
    flags_raised: flagsRaised,
    category: finalCategory,
    vendor: finalVendor,
    doc_type: finalDocType,
    contractor_id: resolvedContractorId,
  };
}
