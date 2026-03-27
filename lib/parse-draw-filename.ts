/**
 * Parse a draw request document filename into structured data.
 *
 * Expected patterns:
 *   "7 Lumber_Invoice_SunPro (Blake Jones).pdf"
 *   "4 Permitting_Invoice_Hurricane City Permit (Blake Jones).pdf"
 *   "8_Framing_Invoice_Buffalo Mountain Builders.pdf"
 *   "13_Windows_Invoice_ Elite Door & Window, Inc..pdf"
 *   "Dixie Power Invoice.pdf"  (fallback — no number prefix)
 *
 * Separators can be underscore or space-after-number.
 */
export interface ParsedDrawFilename {
  lineItemNumber: number | null;
  category: string | null;
  docType: string | null;
  vendor: string | null;
  originalName: string;
}

export function parseDrawFilename(filename: string): ParsedDrawFilename {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "").trim();

  // Try pattern: "NUMBER CATEGORY_TYPE_VENDOR" or "NUMBER_CATEGORY_TYPE_VENDOR"
  // The number can be followed by a space or underscore
  const match = nameWithoutExt.match(
    /^(\d+)\s*[_ ]\s*(.+?)(?:[_ ]\s*(Invoice|Receipt|Estimate|Quote|Bid|PO|Statement|Credit)s?)?(?:[_ ]\s*(.+))?$/i
  );

  if (match) {
    const lineItemNumber = parseInt(match[1], 10);
    const rawCategory = match[2]?.trim() || null;
    const rawDocType = match[3]?.trim() || null;
    let rawVendor = match[4]?.trim() || null;

    // If category contains underscores, it might be "Category_Type_Vendor"
    // Try splitting the category further
    if (rawCategory && !rawDocType) {
      const parts = rawCategory.split(/[_]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 3) {
        return {
          lineItemNumber,
          category: parts[0],
          docType: parts[1],
          vendor: cleanVendorName(parts.slice(2).join(" ")),
          originalName: filename,
        };
      }
      if (parts.length === 2) {
        return {
          lineItemNumber,
          category: parts[0],
          docType: parts[1],
          vendor: rawVendor ? cleanVendorName(rawVendor) : null,
          originalName: filename,
        };
      }
    }

    // Also try re-splitting the full string by underscores for consistent format
    const underscoreParts = nameWithoutExt
      .replace(/^\d+\s*[_ ]\s*/, "")
      .split(/[_]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (underscoreParts.length >= 3) {
      return {
        lineItemNumber,
        category: underscoreParts[0],
        docType: underscoreParts[1],
        vendor: cleanVendorName(underscoreParts.slice(2).join(" ")),
        originalName: filename,
      };
    }

    if (underscoreParts.length === 2) {
      return {
        lineItemNumber,
        category: underscoreParts[0],
        docType: underscoreParts[1],
        vendor: rawVendor ? cleanVendorName(rawVendor) : null,
        originalName: filename,
      };
    }

    return {
      lineItemNumber,
      category: rawCategory,
      docType: rawDocType,
      vendor: rawVendor ? cleanVendorName(rawVendor) : null,
      originalName: filename,
    };
  }

  // Fallback: no number prefix, just return the name
  return {
    lineItemNumber: null,
    category: null,
    docType: null,
    vendor: null,
    originalName: filename,
  };
}

/**
 * Clean up vendor name — remove "(Blake Jones)" parenthetical, trailing dots, etc.
 */
function cleanVendorName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, "") // Remove parenthetical like "(Blake Jones)"
    .replace(/\.+$/, "")           // Remove trailing dots
    .replace(/^\s+|\s+$/g, "")     // Trim
    .replace(/\s+/g, " ");         // Normalize whitespace
}
