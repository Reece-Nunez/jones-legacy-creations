import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedInvoiceData {
  vendor_name: string | null;
  vendor_company: string | null;
  vendor_email: string | null;
  vendor_phone: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number | null;
  description: string | null;
  category: string | null;
  line_items: Array<{
    description: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
  }>;
}

/**
 * Use Claude Haiku to extract structured data from an invoice PDF/image.
 * Cost: ~$0.01-0.03 per invoice.
 */
export async function extractInvoiceData(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<ExtractedInvoiceData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Return empty data if no API key — graceful fallback
    return {
      vendor_name: null,
      vendor_company: null,
      vendor_email: null,
      vendor_phone: null,
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      amount: null,
      description: null,
      category: null,
      line_items: [],
    };
  }

  const client = new Anthropic({ apiKey });

  // Determine media type for the API
  let mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif";
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
    text: `Extract the following information from this invoice/receipt document. The filename is "${fileName}".

Return ONLY a JSON object with these fields (use null for any field you can't find):

{
  "vendor_name": "Person or contact name on the invoice (who sent it)",
  "vendor_company": "Company or business name",
  "vendor_email": "Email address if visible",
  "vendor_phone": "Phone number if visible",
  "invoice_number": "Invoice or receipt number",
  "invoice_date": "Date of invoice in YYYY-MM-DD format",
  "due_date": "Due date in YYYY-MM-DD format if specified",
  "amount": 12345.67,
  "description": "Brief one-line description of what this invoice is for",
  "category": "One of: Plans, Engineering, Permitting, Slab, Plumbing, Lumber, Framing, Trusses, HVAC, Electrical, Windows, Roofing, Drywall, Painting, Flooring, Cabinets, Countertops, Appliances, Landscaping, Concrete, Insulation, Fencing, General",
  "line_items": [{"description": "item", "quantity": 1, "unit_price": 100.00, "total": 100.00}]
}

For the "amount" field, use the TOTAL amount due (the final total, not subtotals). Parse it as a number (no $ sign, no commas).
For "category", pick the best match from the list above based on what the invoice is for.
Return ONLY valid JSON, no other text.`,
  });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: sourceContent,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parse JSON from response — handle potential markdown code blocks
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      vendor_name: parsed.vendor_name || null,
      vendor_company: parsed.vendor_company || null,
      vendor_email: parsed.vendor_email || null,
      vendor_phone: parsed.vendor_phone || null,
      invoice_number: parsed.invoice_number || null,
      invoice_date: parsed.invoice_date || null,
      due_date: parsed.due_date || null,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      description: parsed.description || null,
      category: parsed.category || null,
      line_items: Array.isArray(parsed.line_items) ? parsed.line_items : [],
    };
  } catch (error) {
    console.error("Invoice extraction error:", error);
    return {
      vendor_name: null,
      vendor_company: null,
      vendor_email: null,
      vendor_phone: null,
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      amount: null,
      description: null,
      category: null,
      line_items: [],
    };
  }
}
