import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";

export const BUCKET = "project-documents";

/**
 * Mint a one-shot signed URL the browser uploads a file's bytes to directly.
 *
 * Uploads used to be POSTed to the documents route, which meant every byte
 * travelled through a Vercel function — and Vercel rejects request bodies over
 * 4.5 MB with a 413 before the handler ever runs. A batch of plans and scanned
 * invoices hits that constantly. Signing the upload here and letting the
 * browser talk to Supabase Storage takes the function out of the byte path
 * entirely, so the only limit left is the bucket's own.
 *
 * The path is built server-side and namespaced under the project id; the
 * documents route rejects any storage_path that doesn't start with it, so a
 * caller can't point a record at another project's file.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Contractors may upload documents for their own project; RLS on the
  // project-documents bucket confines them to the projects they've been granted.
  const gate = await requireAdmin(undefined, { allowContractor: true });
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const body = await request.json().catch(() => ({}));
  const rawName = typeof body.name === "string" ? body.name : "";
  if (!rawName.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Strip any directory component a filename might carry so the object can't
  // escape the project prefix, and keep the extension for content sniffing.
  const safeName = rawName.split(/[\\/]/).pop()!.slice(-200);
  const storagePath = `${id}/${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Could not create upload URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    path: data.path,
    token: data.token,
    signed_url: data.signedUrl,
  });
}
