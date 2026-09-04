import { createClient } from "@/lib/supabase/client";
import type { ExtractedDocumentData } from "@/lib/extract-document";

/**
 * Browser-side, two-phase document upload.
 *
 * Phase one gets every file into storage and filed as a row; phase two reads
 * them. They are separate because they fail differently: a file's bytes go
 * straight from the browser to Supabase Storage and are subject only to the
 * bucket's size limit, while reading a document is two model calls that can be
 * slow or fall over. Routing the bytes through the API was capping uploads at
 * Vercel's 4.5 MB request body — anything larger came back 413 — and putting
 * the model calls in the same request meant a 16-file batch spent minutes in
 * flight with nothing saved until each one finished.
 *
 * Nothing here throws for a single bad file. Each result carries its own
 * error so a batch reports what landed and what didn't instead of stopping at
 * the first failure, which is how 13 of 16 files silently never got attempted.
 */

const BUCKET = "project-documents";

export type UploadFields = {
  category?: string;
  draw_request_id?: string | null;
  line_item_number?: string | null;
  vendor?: string | null;
  doc_type?: string | null;
  contractor_id?: string | null;
};

export type UploadOutcome = {
  file: File;
  documentId: string | null;
  error: string | null;
};

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body.error === "string") return body.error;
  // Vercel's body-size rejection never reaches the handler, so there is no
  // JSON error to read — say something the uploader can act on.
  if (res.status === 413) return "File is too large to upload";
  return fallback;
}

/** Store one file's bytes and file its record. Never throws. */
export async function uploadProjectDocument(
  projectId: string,
  file: File,
  fields: UploadFields = {},
): Promise<UploadOutcome> {
  try {
    const signRes = await fetch(`/api/admin/projects/${projectId}/documents/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name }),
    });
    if (!signRes.ok) {
      return { file, documentId: null, error: await errorMessage(signRes, "Could not start upload") };
    }
    const { path, token } = await signRes.json();

    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
    if (storageError) {
      return { file, documentId: null, error: storageError.message };
    }

    const recordRes = await fetch(`/api/admin/projects/${projectId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storage_path: path,
        name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        ...fields,
      }),
    });
    if (!recordRes.ok) {
      return { file, documentId: null, error: await errorMessage(recordRes, "Could not save document") };
    }

    const doc = await recordRes.json();
    return { file, documentId: doc.id as string, error: null };
  } catch (e) {
    return { file, documentId: null, error: e instanceof Error ? e.message : "Upload failed" };
  }
}

/**
 * Read one stored document. Never throws — a failed scan leaves the document
 * in place, and the "Scan documents" button picks it up later.
 */
export async function scanProjectDocument(
  projectId: string,
  documentId: string,
  opts: { aiReviewedData?: ExtractedDocumentData; autoCreatePayment?: boolean } = {},
): Promise<{ ok: boolean; error: string | null }> {
  try {
    const res = await fetch(`/api/admin/projects/${projectId}/documents/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_id: documentId,
        ai_reviewed_data: opts.aiReviewedData ?? null,
        auto_create_payment: opts.autoCreatePayment === true,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: await errorMessage(res, "Scan failed") };
    }
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Scan failed" };
  }
}
