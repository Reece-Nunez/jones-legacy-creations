import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStoragePath } from "@/lib/supabase/signedUrl";
import { extractPermitData } from "@/lib/extract-permit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  const { supabase } = gate;
  const { file_url } = await request.json();

  if (!file_url || typeof file_url !== "string") {
    return NextResponse.json({ error: "file_url is required" }, { status: 400 });
  }

  // SSRF guard: only fetch from our own Supabase storage. Otherwise an
  // authenticated admin could turn this route into a proxy against the
  // internal network or arbitrary external services.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !file_url.startsWith(`${supabaseUrl}/storage/v1/object/`)) {
    return NextResponse.json(
      { error: "file_url must be a Supabase storage URL" },
      { status: 400 }
    );
  }

  try {
    // Bucket is private; download via admin client by storage path.
    const path = parseStoragePath(file_url, "project-documents");
    if (!path) {
      return NextResponse.json(
        { error: "file_url must be in the project-documents bucket" },
        { status: 400 }
      );
    }
    const admin = createAdminClient();
    const { data: blob, error: dlErr } = await admin.storage
      .from("project-documents")
      .download(path);
    if (dlErr || !blob) {
      return NextResponse.json({ error: dlErr?.message || "Failed to fetch file" }, { status: 400 });
    }

    const buffer = await blob.arrayBuffer();
    const contentType = blob.type || "application/pdf";
    const fileName = path.split("/").pop() || "permit.pdf";

    // Run AI extraction
    const extracted = await extractPermitData(buffer, contentType, fileName);

    // Fetch current project to determine which fields are already filled
    const { data: project } = await supabase
      .from("projects")
      .select(
        "square_footage, stories, bedrooms, bathrooms, garage_spaces, finish_level, lot_size, flooring_preference, countertop_preference, cabinet_preference, project_type"
      )
      .eq("id", id)
      .single();

    return NextResponse.json({ extracted, current: project });
  } catch (error) {
    console.error("Permit extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract permit data" },
      { status: 500 }
    );
  }
}
