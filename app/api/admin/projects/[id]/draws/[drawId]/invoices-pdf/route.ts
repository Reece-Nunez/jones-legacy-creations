import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument } from "pdf-lib";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; drawId: string }> },
) {
  const { id, drawId } = await params;
  const supabase = await createClient();

  const { data: draw, error: drawErr } = await supabase
    .from("draw_requests")
    .select("draw_number")
    .eq("id", drawId)
    .eq("project_id", id)
    .single();

  if (drawErr || !draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  const { data: docs, error: docsErr } = await supabase
    .from("documents")
    .select("name, file_url, file_type, line_item_number")
    .eq("project_id", id)
    .eq("draw_request_id", drawId)
    .eq("category", "invoice");

  if (docsErr) {
    return NextResponse.json({ error: docsErr.message }, { status: 500 });
  }

  if (!docs || docs.length === 0) {
    return NextResponse.json(
      { error: "No invoices on this draw" },
      { status: 404 },
    );
  }

  const sorted = [...docs].sort((a, b) =>
    (a.line_item_number ?? "zzz").localeCompare(
      b.line_item_number ?? "zzz",
      undefined,
      { numeric: true },
    ),
  );

  const merged = await PDFDocument.create();

  for (const doc of sorted) {
    try {
      const res = await fetch(doc.file_url);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      const type = (doc.file_type || "").toLowerCase();
      const name = (doc.name || "").toLowerCase();

      const isPdf = type.includes("pdf") || name.endsWith(".pdf");
      const isPng = type.includes("png") || name.endsWith(".png");
      const isJpg =
        type.includes("jpeg") ||
        type.includes("jpg") ||
        name.endsWith(".jpg") ||
        name.endsWith(".jpeg");

      if (isPdf) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } else if (isPng || isJpg) {
        const img = isPng
          ? await merged.embedPng(bytes)
          : await merged.embedJpg(bytes);
        const maxW = 612;
        const maxH = 792;
        const scale = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const page = merged.addPage([maxW, maxH]);
        page.drawImage(img, {
          x: (maxW - w) / 2,
          y: (maxH - h) / 2,
          width: w,
          height: h,
        });
      }
    } catch (err) {
      console.error(`Failed to merge doc ${doc.name}:`, err);
    }
  }

  if (merged.getPageCount() === 0) {
    return NextResponse.json(
      { error: "No mergeable invoices found" },
      { status: 400 },
    );
  }

  const pdfBytes = await merged.save();
  const filename = `Draw_${draw.draw_number}_Invoices.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
