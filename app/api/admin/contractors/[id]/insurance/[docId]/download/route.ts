import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { signFromPublicUrl } from "@/lib/supabase/signedUrl";

// Resolves a contractor insurance document's stored file_url to a short-lived
// signed URL and 302-redirects the browser to it. The contractor-w9 bucket
// is private, so this is the only way for an admin to view the file.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id, docId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: doc, error } = await supabase
    .from("contractor_insurance_documents")
    .select("file_url")
    .eq("id", docId)
    .eq("contractor_id", id)
    .single();

  if (error || !doc?.file_url) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const signed = await signFromPublicUrl(doc.file_url, "contractor-w9", 60);
  if (!signed) {
    return NextResponse.json(
      { error: "Failed to sign document URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed, 302);
}
