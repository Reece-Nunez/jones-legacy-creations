import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStoragePath } from "@/lib/supabase/signedUrl";
import { detectDocumentFlags } from "@/lib/documents/detect-flags";
import { scanContextFor, storeFlags } from "@/lib/documents/scan-document";
import { processUploadedDocument } from "@/lib/documents/process-upload";
import { isDocumentKind, type DocumentKind } from "@/lib/documents/document-kind";

/** Open flags for the project's review panel, newest document first. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("document_flags")
    .select("*, document:documents(id, name, file_url)")
    .eq("project_id", id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

/**
 * Scan documents for disagreements with the project record.
 *
 * `document_ids` scans exactly those; omitting it scans everything on the
 * project that hasn't been scanned yet, which is the "Scan documents" button
 * catching up on a backlog. Photos are skipped — there is nothing on a site
 * photo to disagree with, and each scan is a paid model call.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const requestedIds: string[] | null = Array.isArray(body?.document_ids)
    ? body.document_ids
    : null;

  let query = supabase
    .from("documents")
    .select("id, name, file_url, file_type, category, document_kind, vendor, doc_type, contractor_id, draw_request_id")
    .eq("project_id", id)
    .neq("category", "photo");

  if (requestedIds) {
    if (requestedIds.length === 0) {
      return NextResponse.json({ scanned: 0, flagged: 0, results: [] });
    }
    query = query.in("id", requestedIds);
  } else {
    query = query.is("flags_scanned_at", null);
  }

  const { data: docs, error: docsError } = await query;
  if (docsError) {
    return NextResponse.json({ error: docsError.message }, { status: 500 });
  }
  if (!docs || docs.length === 0) {
    return NextResponse.json({ scanned: 0, flagged: 0, results: [] });
  }

  const admin = createAdminClient();
  const results: Array<{ document_id: string; flagged: number; error?: string }> = [];
  let flagged = 0;

  for (const doc of docs) {
    try {
      const docPath = parseStoragePath(doc.file_url, "project-documents");
      if (!docPath) {
        results.push({ document_id: doc.id, flagged: 0, error: "File is not in the project-documents bucket" });
        continue;
      }

      const { data: blob, error: dlErr } = await admin.storage
        .from("project-documents")
        .download(docPath);
      if (dlErr || !blob) {
        results.push({ document_id: doc.id, flagged: 0, error: dlErr?.message || "Failed to download file" });
        continue;
      }

      const buffer = await blob.arrayBuffer();

      // No kind means the document was never read: either it predates
      // classification, or its upload put the file in storage and the browser
      // went away before the scan request. Both want the full pass — classify
      // it, file it, and create the payment an invoice implies — not just a
      // flag scan, or an invoice sits here forever with no money behind it.
      if (!isDocumentKind(doc.document_kind)) {
        const processed = await processUploadedDocument({
          supabase,
          projectId: id,
          documentId: doc.id,
          fileBuffer: buffer,
          fileType: doc.file_type || "application/pdf",
          fileName: doc.name || "document",
          fileUrl: doc.file_url,
          explicitCategory: doc.category ?? null,
          explicitVendor: doc.vendor ?? null,
          explicitDocType: doc.doc_type ?? null,
          contractorId: doc.contractor_id ?? null,
          drawRequestId: doc.draw_request_id ?? null,
        });
        flagged += processed.flags_raised;
        results.push({ document_id: doc.id, flagged: processed.flags_raised });
        continue;
      }

      const kind: DocumentKind = doc.document_kind;
      const { context, subjects } = await scanContextFor(supabase, id, doc.file_url);
      if (context.length === 0) {
        results.push({ document_id: doc.id, flagged: 0, error: "Project has no comparable fields" });
        continue;
      }

      const raw = await detectDocumentFlags({
        fileBuffer: buffer,
        fileType: doc.file_type || "application/pdf",
        fileName: doc.name || "document",
        context,
        kind,
      });

      const count = await storeFlags(supabase, id, doc.id, raw, subjects, kind);
      flagged += count;
      results.push({ document_id: doc.id, flagged: count });
    } catch (e) {
      results.push({
        document_id: doc.id,
        flagged: 0,
        error: e instanceof Error ? e.message : "Scan failed",
      });
    }
  }

  return NextResponse.json({ scanned: docs.length, flagged, results });
}
