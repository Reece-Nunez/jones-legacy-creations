import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { signObjectUrl } from "@/lib/supabase/signedUrl";

// Only admin-accessible buckets are exposed via this endpoint. Avatars stays
// public so it isn't here. The bucket name comes from a caller-supplied
// query param, so we MUST allowlist — otherwise an admin could sign a URL
// for any bucket the service-role can see.
const ADMIN_BUCKETS = new Set(["project-documents", "contractor-w9"]);

// GET /api/admin/files/download?bucket=<name>&path=<encoded path>
// Auth + bucket allowlist, then 302-redirects to a 60s signed URL.
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;

  const bucket = request.nextUrl.searchParams.get("bucket");
  const path = request.nextUrl.searchParams.get("path");

  if (!bucket || !path) {
    return NextResponse.json(
      { error: "bucket and path are required" },
      { status: 400 }
    );
  }
  if (!ADMIN_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Unknown bucket" }, { status: 400 });
  }

  const signed = await signObjectUrl(bucket, path, 60);
  if (!signed) {
    return NextResponse.json(
      { error: "Failed to sign URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed, 302);
}
