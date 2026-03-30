import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPermitData } from "@/lib/extract-permit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { file_url } = await request.json();

  if (!file_url) {
    return NextResponse.json({ error: "file_url is required" }, { status: 400 });
  }

  try {
    // Fetch the file from the public URL
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 400 });
    }

    const buffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get("content-type") || "application/pdf";
    const fileName = file_url.split("/").pop() || "permit.pdf";

    // Run AI extraction
    const extracted = await extractPermitData(buffer, contentType, fileName);

    // Fetch current project to determine which fields are already filled
    const supabase = await createClient();
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
