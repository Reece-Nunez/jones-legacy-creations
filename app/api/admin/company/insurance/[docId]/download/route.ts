import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { signFromPublicUrl } from "@/lib/supabase/signedUrl";

// Resolves a company insurance document's stored file_url to a short-lived
// signed URL and 302-redirects the browser to it. The company-documents
// bucket is private, so this is the only way for an admin to view the file.
//
// Note the redirect target is the Supabase origin — it must stay listed in
// the CSP `frame-src` (next.config.ts) or in-app PDF previews get blocked.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: doc, error } = await supabase
    .from("company_insurance_documents")
    .select("file_url")
    .eq("id", docId)
    .single();

  if (error || !doc?.file_url) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const signed = await signFromPublicUrl(doc.file_url, "company-documents", 60);
  if (!signed) {
    return NextResponse.json(
      { error: "Failed to sign document URL" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed, 302);
}
