import { PDFDocument, StandardFonts, rgb, type PDFFont, type RGB } from "pdf-lib";
import { CONTENT_WIDTH, MARGIN, PAGE_HEIGHT, PAGE_WIDTH, usd, wrapText } from "./pdfKit";

export interface ChangeOrderPdfInput {
  projectName: string;
  title: string;
  description?: string | null;
  reason?: string | null;
  costDelta: number;
  scheduleImpactDays: number;
  consentText: string;
  signerName: string;
  signedAt: Date;
  signerIp?: string | null;
}

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Denver", // Blake operates in Utah (Mountain Time)
});

function formatDelta(amount: number): string {
  // ASCII hyphen — pdf-lib's WinAnsi fonts can't encode U+2212.
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}${usd.format(Math.abs(amount))}`;
}

/**
 * Render a signed Change Order to a single-page (auto-paginating) PDF suitable
 * for filing under the project's Documents. The signature block records the
 * typed name, timestamp, IP, and the exact consent text the client agreed to.
 */
export async function buildChangeOrderPdf(
  input: ChangeOrderPdfInput
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
  page.drawText("Change Order", { x: MARGIN, y, size: 12, font, color: gray });
  y -= 26;

  label("Project");
  text(input.projectName, { font: bold, gap: 10 });

  label("Change");
  text(input.title, { size: 13, font: bold, gap: 10 });

  if (input.description?.trim()) {
    label("Description");
    text(input.description, { gap: 10 });
  }
  if (input.reason?.trim()) {
    label("Reason");
    text(input.reason, { gap: 10 });
  }

  rule();

  label("Change to contract price");
  text(formatDelta(input.costDelta), { size: 13, font: bold, gap: 10 });

  label("Schedule impact");
  const days = input.scheduleImpactDays;
  text(
    days === 0
      ? "No change"
      : `${days > 0 ? "+" : "-"}${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`,
    { gap: 10 }
  );

  rule();

  label("Electronic signature");
  text(input.consentText, { size: 9, color: gray, gap: 12 });

  label("Signed by");
  text(input.signerName, { font: bold, gap: 6 });
  label("Date");
  text(dateFmt.format(input.signedAt), { gap: 6 });
  if (input.signerIp) {
    label("IP address");
    text(input.signerIp, { size: 9, color: gray });
  }

  return doc.save();
}
