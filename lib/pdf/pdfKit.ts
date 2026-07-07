import type { PDFFont } from "pdf-lib";

// US Letter, comfortable margins. Shared by the change-order and selection PDFs.
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 54;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * pdf-lib's StandardFonts use WinAnsi encoding, which throws on characters
 * outside that set. Two common offenders slip in from formatting: the Unicode
 * MINUS SIGN (U+2212) and the narrow/no-break spaces that Intl.DateTimeFormat
 * emits around AM/PM. Map those to safe ASCII before drawing.
 */
export function sanitizePdfText(text: string): string {
  return (text ?? "")
    .replace(/[−‑]/g, "-") // minus sign / non-breaking hyphen -> hyphen
    .replace(/[      ]/g, " "); // exotic spaces -> normal space
}

/**
 * Break `text` into lines that each fit within `maxWidth` at the given font/size.
 * Honors existing newlines; collapses runs of whitespace inside a line. Output is
 * WinAnsi-safe (see {@link sanitizePdfText}).
 */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const out: string[] = [];
  for (const rawLine of sanitizePdfText(text).split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
