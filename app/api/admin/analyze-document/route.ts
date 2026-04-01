import { NextRequest, NextResponse } from "next/server";
import { extractDocumentData } from "@/lib/extract-document";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  // Validate file type
  const validTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
  ];
  if (!validTypes.some((t) => file.type.startsWith(t.split("/")[0]) || file.type === t)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a PDF or image." },
      { status: 400 }
    );
  }

  // Max 25MB
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 25MB)" },
      { status: 400 }
    );
  }

  try {
    const buffer = await file.arrayBuffer();
    const result = await extractDocumentData(buffer, file.type, file.name);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Document analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
