import { PDFDocument, StandardFonts, rgb, type PDFFont, type RGB } from "pdf-lib";
import { CONTENT_WIDTH, MARGIN, PAGE_HEIGHT, PAGE_WIDTH, usd, wrapText } from "./pdfKit";

export interface SelectionPdfInput {
  projectName: string;
  title: string;
  selectionName?: string | null;
  description?: string | null;
  location?: string | null;
  costImpact?: number | null;
  disclaimerText: string;
  decision: "approved" | "declined";
  deciderName: string;
  decidedAt: Date;
  deciderIp?: string | null;
  declineReason?: string | null;
  imageBytes?: Uint8Array | null;
  imageType?: string | null;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Denver",
});

/**
 * Render a client's selection decision (approved / declined) to a PDF, embedding
 * the selection photo and the exact disclaimer the client agreed to, for filing
 * under the project's Documents.
 */
export async function buildSelectionPdf(
  input: SelectionPdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ink = rgb(0.08, 0.08, 0.08);
  const gray = rgb(0.45, 0.45, 0.45);
  const approved = input.decision === "approved";
  const decisionColor = approved ? rgb(0.05, 0.5, 0.25) : rgb(0.7, 0.15, 0.15);

  const ensure = (space: number) => {
    if (y - space < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };
  const text = (
    str: string,
    opts: { size?: number; font?: PDFFont; color?: RGB; gap?: number } = {}
  ) => {
    const size = opts.size ?? 11;
    const f = opts.font ?? font;
    for (const line of wrapText(str, f, size, CONTENT_WIDTH)) {
      ensure(size + 4);
      page.drawText(line, { x: MARGIN, y, size, font: f, color: opts.color ?? ink });
      y -= size + 4;
    }
    if (opts.gap) y -= opts.gap;
  };
  const label = (str: string) => {
    ensure(14);
    page.drawText(str.toUpperCase(), { x: MARGIN, y, size: 8, font: bold, color: gray });
    y -= 13;
  };
  const rule = () => {
    ensure(18);
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.75,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 14;
  };

  // Header
  page.drawText("Jones Legacy Creations", { x: MARGIN, y, size: 18, font: bold, color: ink });
  y -= 22;
  page.drawText("Selection Approval", { x: MARGIN, y, size: 12, font, color: gray });
  y -= 26;

  label("Project");
  text(input.projectName, { font: bold, gap: 10 });

  label("Selection");
  text(input.title, { size: 13, font: bold, gap: input.selectionName ? 4 : 10 });
  if (input.selectionName?.trim()) {
    text(input.selectionName, { color: gray, gap: 10 });
  }

  if (input.location?.trim()) {
    label("Location");
    text(input.location, { gap: 10 });
  }
  if (input.description?.trim()) {
    label("Description");
    text(input.description, { gap: 10 });
  }
  if (input.costImpact != null && input.costImpact !== 0) {
    label("Cost impact");
    text(usd.format(input.costImpact), { gap: 10 });
  }

  // Embedded photo (pdf-lib supports JPG/PNG only; other types are skipped)
  if (input.imageBytes && input.imageType) {
    try {
      const t = input.imageType.toLowerCase();
      const img = t.includes("png")
        ? await doc.embedPng(input.imageBytes)
        : t.includes("jpg") || t.includes("jpeg")
          ? await doc.embedJpg(input.imageBytes)
          : null;
      if (img) {
        const maxH = 260;
        const scale = Math.min(CONTENT_WIDTH / img.width, maxH / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        ensure(h + 12);
        page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
        y -= h + 14;
      }
    } catch {
      // Unsupported / corrupt image — the record still carries the photo URL.
    }
  }

  rule();

  label("Disclaimer");
  text(input.disclaimerText, { size: 9, color: gray, gap: 12 });

  rule();

  label("Decision");
  text(approved ? "APPROVED" : "DECLINED", { size: 14, font: bold, color: decisionColor, gap: 10 });
  if (!approved && input.declineReason?.trim()) {
    label("Reason for declining");
    text(input.declineReason, { gap: 10 });
  }

  label(approved ? "Approved by" : "Declined by");
  text(input.deciderName, { font: bold, gap: 6 });
  label("Date");
  text(dateFmt.format(input.decidedAt), { gap: 6 });
  if (input.deciderIp) {
    label("IP address");
    text(input.deciderIp, { size: 9, color: gray });
  }

  return doc.save();
}
