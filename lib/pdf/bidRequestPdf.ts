import { PDFDocument, StandardFonts, rgb, type PDFFont, type RGB } from "pdf-lib";
import { CONTENT_WIDTH, MARGIN, PAGE_HEIGHT, PAGE_WIDTH, usd, wrapText } from "./pdfKit";

export interface BidSubmissionPdfInput {
  projectName: string;
  title: string;
  scopeDescription?: string | null;
  contractorName?: string | null;
  bidAmount?: number | null;
  bidNote?: string | null;
  termsText: string;
  submitterName: string;
  submittedAt: Date;
  submitterIp?: string | null;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Denver", // Blake operates in Utah (Mountain Time)
});

/**
 * Render a contractor's bid submission to a PDF filed under the project's
 * Documents. Captures the optional bid amount + note and the exact terms the
 * contractor agreed to (typed name, timestamp, IP) as evidence of their
 * commitment. Blake's later accept/decline is an internal decision. Mirrors
 * buildChangeOrderPdf.
 */
export async function buildBidSubmissionPdf(
  input: BidSubmissionPdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ink = rgb(0.08, 0.08, 0.08);
  const gray = rgb(0.45, 0.45, 0.45);

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
  page.drawText("Bid Submission", { x: MARGIN, y, size: 12, font, color: gray });
  y -= 26;

  label("Project");
  text(input.projectName, { font: bold, gap: 10 });

  label("Bid");
  text(input.title, { size: 13, font: bold, gap: 10 });

  if (input.scopeDescription?.trim()) {
    label("Scope");
    text(input.scopeDescription, { gap: 10 });
  }
  if (input.contractorName?.trim()) {
    label("Contractor");
    text(input.contractorName, { gap: 10 });
  }

  rule();

  label("Bid amount");
  text(
    typeof input.bidAmount === "number" && Number.isFinite(input.bidAmount)
      ? usd.format(input.bidAmount)
      : "Not specified",
    { size: 13, font: bold, gap: 10 }
  );
  if (input.bidNote?.trim()) {
    label("Note");
    text(input.bidNote, { gap: 10 });
  }

  rule();

  label("Terms agreed to");
  text(input.termsText, { size: 9, color: gray, gap: 12 });

  label("Submitted by");
  text(input.submitterName, { font: bold, gap: 6 });
  label("Date");
  text(dateFmt.format(input.submittedAt), { gap: 6 });
  if (input.submitterIp) {
    label("IP address");
    text(input.submitterIp, { size: 9, color: gray });
  }

  return doc.save();
}
