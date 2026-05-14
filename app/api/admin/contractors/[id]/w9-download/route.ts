import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { signFromPublicUrl } from "@/lib/supabase/signedUrl";

// Resolves the contractor's stored w9_file_url to a short-lived signed URL
// and 302-redirects the browser to it. The bucket is private, so this is
// the only way for an admin to fetch the W-9 from the UI.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;

  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("w9_file_url")
    .eq("id", id)
    .single();

  if (error || !contractor?.w9_file_url) {
    return NextResponse.json({ error: "W-9 not found" }, { status: 404 });
  }

  const signed = await signFromPublicUrl(contractor.w9_file_url, "contractor-w9", 60);
  if (!signed) {
    return NextResponse.json(
      { error: "Failed to sign W-9 URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed, 302);
}
