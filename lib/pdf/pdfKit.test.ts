import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { sanitizePdfText, wrapText, CONTENT_WIDTH } from "./pdfKit";

describe("sanitizePdfText", () => {
  it("maps the Unicode minus sign to an ASCII hyphen", () => {
    expect(sanitizePdfText("−4,200")).toBe("-4,200");
  });

  it("maps narrow/no-break spaces to a normal space", () => {
    // U+202F (narrow no-break space, Intl time), U+00A0 (no-break space)
    expect(sanitizePdfText("3:00 PM")).toBe("3:00 PM");
    expect(sanitizePdfText("a b")).toBe("a b");
  });

  it("is null-safe", () => {
    expect(sanitizePdfText(undefined as unknown as string)).toBe("");
  });

  it("leaves ordinary ASCII untouched", () => {
    expect(sanitizePdfText("+2,500 / 3 days")).toBe("+2,500 / 3 days");
  });

  it("produces only WinAnsi-encodable output for Helvetica", async () => {
    // The whole point: sanitized text must not throw when drawn.
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage();
    const dirty = "Credit −4,200 at 3:00 PM";
    expect(() =>
      page.drawText(sanitizePdfText(dirty), { x: 10, y: 10, size: 10, font })
    ).not.toThrow();
  });
});

describe("wrapText", () => {
  it("keeps short text on a single line", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(wrapText("hello world", font, 11, CONTENT_WIDTH)).toEqual(["hello world"]);
  });

  it("wraps text that exceeds the max width onto multiple lines", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const long = "word ".repeat(100).trim();
    const lines = wrapText(long, font, 11, CONTENT_WIDTH);
    expect(lines.length).toBeGreaterThan(1);
    // No wrapped line should exceed the max width.
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 11)).toBeLessThanOrEqual(CONTENT_WIDTH);
    }
  });

  it("honors explicit newlines", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(wrapText("line one\nline two", font, 11, CONTENT_WIDTH)).toEqual([
      "line one",
      "line two",
    ]);
  });
});
