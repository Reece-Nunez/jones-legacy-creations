import Anthropic from "@anthropic-ai/sdk";

export type DocumentAnalysisType =
  | "receipt"
  | "invoice"
  | "material_list"
  | "inspection"
  | "general";

export interface ExtractedDocumentData {
  document_type: DocumentAnalysisType;
  vendor_name: string | null;
  vendor_company: string | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  category: string | null;
  line_items: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
  }>;
  // For receipts specifically
  payment_method: string | null;
  tax_amount: number | null;
  // For material lists
  materials: Array<{
    item: string;
    quantity: string | null;
    unit: string | null;
  }>;
  // Raw text summary for anything the AI finds interesting
  summary: string | null;
  confidence: "high" | "medium" | "low";
}

function emptyResult(): ExtractedDocumentData {
  return {
    document_type: "general",
    vendor_name: null,
    vendor_company: null,
    amount: null,
    date: null,
    description: null,
    category: null,
    line_items: [],
    payment_method: null,
    tax_amount: null,
    materials: [],
    summary: null,
    confidence: "low",
  };
}

/**
 * Use Claude Haiku to analyze and extract structured data from construction documents.
 * Handles receipts, invoices, material lists, inspection reports, and general documents.
 * Cost: ~$0.01-0.03 per document.
 */
export async function extractDocumentData(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<ExtractedDocumentData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return emptyResult();
  }

  const client = new Anthropic({ apiKey });

  // Determine media type for the API
  let mediaType:
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif";
  if (fileType === "application/pdf") {
    mediaType = "application/pdf";
  } else if (fileType === "image/png") {
    mediaType = "image/png";
  } else if (fileType === "image/webp") {
    mediaType = "image/webp";
  } else if (fileType === "image/gif") {
    mediaType = "image/gif";
  } else {
    mediaType = "image/jpeg";
  }

  const base64 = Buffer.from(fileBuffer).toString("base64");

  const sourceContent: Anthropic.Messages.ContentBlockParam[] = [];

  if (mediaType === "application/pdf") {
    sourceContent.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64,
      },
    });
  } else {
    sourceContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64,
      },
    });
  }

  sourceContent.push({
    type: "text",
    text: `Analyze this construction-related document. The filename is "${fileName}".

First, identify what type of document this is:
- "receipt" — a store receipt, payment confirmation, or proof of purchase (e.g. Home Depot, Lowe's, lumber yard)
- "invoice" — a bill from a vendor or subcontractor for services/materials
- "material_list" — a list of materials, delivery ticket, or packing slip
- "inspection" — an inspection report, punch list, or quality check
- "general" — anything else (site photos, notes, plans, etc.)

Then extract all relevant information. Return ONLY a JSON object with these fields (use null for any field you can't find, use empty arrays [] if no items):

{
  "document_type": "receipt",
  "vendor_name": "Person or contact name (cashier, sales rep, etc.)",
  "vendor_company": "Store or business name (e.g. Home Depot, ABC Supply)",
  "amount": 123.45,
  "date": "2026-01-15",
  "description": "Brief one-line description of what this document is about",
  "category": "Lumber",
  "line_items": [{"description": "2x4x8 SPF Stud", "quantity": 50, "unit_price": 3.98, "total": 199.00}],
  "payment_method": "Visa ending 1234",
  "tax_amount": 9.87,
  "materials": [{"item": "2x4x8 SPF Stud", "quantity": "50", "unit": "each"}],
  "summary": "Any additional notes, findings, or observations worth capturing",
  "confidence": "high"
}

Field guidance:
- "amount": The TOTAL amount (final total including tax). Parse as a number (no $ sign, no commas).
- "date": In YYYY-MM-DD format.
- "category": Pick the BEST match from: Plans, Engineering, Permitting, Slab, Plumbing, Lumber, Framing, Trusses, HVAC, Electrical, Windows, Roofing, Drywall, Painting, Flooring, Cabinets, Countertops, Appliances, Landscaping, Concrete, Insulation, Fencing, General
- "line_items": Individual purchased items with pricing (for receipts/invoices).
- "payment_method": How it was paid if visible (cash, check #, card type + last 4).
- "tax_amount": Sales tax amount as a number if visible.
- "materials": For material lists/delivery tickets — item names with quantities and units.
- "summary": For inspections, include key findings. For general docs, summarize what you see.
- "confidence": "high" if the document is clear and you extracted solid data, "medium" if some fields are uncertain, "low" if the image is blurry or the document type is unclear.

Return ONLY valid JSON, no other text.`,
  });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: sourceContent,
        },
      ],
    });

    const text = response.content
      .filter(
        (block): block is Anthropic.Messages.TextBlock => block.type === "text"
      )
      .map((block) => block.text)
      .join("");

    // Parse JSON from response — handle potential markdown code blocks
    const jsonStr = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    const validTypes: DocumentAnalysisType[] = [
      "receipt",
      "invoice",
      "material_list",
      "inspection",
      "general",
    ];
    const validConfidence = ["high", "medium", "low"] as const;

    return {
      document_type: validTypes.includes(parsed.document_type)
        ? parsed.document_type
        : "general",
      vendor_name: parsed.vendor_name || null,
      vendor_company: parsed.vendor_company || null,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      date: parsed.date || null,
      description: parsed.description || null,
      category: parsed.category || null,
      line_items: Array.isArray(parsed.line_items) ? parsed.line_items : [],
      payment_method: parsed.payment_method || null,
      tax_amount:
        typeof parsed.tax_amount === "number" ? parsed.tax_amount : null,
      materials: Array.isArray(parsed.materials) ? parsed.materials : [],
      summary: parsed.summary || null,
      confidence: validConfidence.includes(parsed.confidence)
        ? parsed.confidence
        : "low",
    };
  } catch (error) {
    console.error("Document extraction error:", error);
    return emptyResult();
  }
}
