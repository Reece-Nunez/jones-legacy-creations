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
  /** True only if the document is a receipt or shows payment has already been made (e.g. "Paid", "Amount Due: $0.00"). False if it is an open/unpaid invoice. */
  is_paid: boolean;
  /** Set if the invoice shows dual card/ACH pricing or a card surcharge. Describes what was found and which amount was used. */
  card_fee_warning: string | null;
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
      is_paid: false,
      card_fee_warning: null,
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
  "line_items": [{"description": "item", "quantity": 1, "unit_price": 100.00, "total": 100.00}],
  "is_paid": false,
  "card_fee_warning": null
}

Field rules:
- "amount": CRITICAL — This system pays via ACH bank transfer, NOT credit card. Apply these rules in order:
    1. If the document shows dual pricing (Card / ACH, or Credit Card / Bank Transfer totals), ALWAYS use the ACH (bank transfer) amount — it will be the lower of the two.
    2. If a card surcharge, processing fee, or convenience fee is listed as a line item, subtract it.
    3. Otherwise use the single total shown.
    Parse as a number (no $ sign, no commas).
- "is_paid": Set to true ONLY if the document is clearly a receipt or proof of payment (e.g. shows "PAID", "Receipt", "Payment Confirmation", "Amount Due: $0.00", or a zero balance). Set to false if the document is an open invoice, shows an amount due greater than zero, shows status "Open", or shows "Previous Payment(s): $0.00" with a remaining balance. When in doubt, set false — it is safer to mark unpaid than to incorrectly mark paid.
- "card_fee_warning": Set to a short string if the invoice has separate Card/ACH pricing, a card surcharge, processing fee, or convenience fee. Describe what was found and which amount was used (e.g. "Invoice shows Card: $6,108.30 / ACH: $5,873.93 — ACH amount used"). Set to null if no card-related pricing differences exist.
- "category": Pick the best match from the list above based on what the invoice is for.
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
      is_paid: parsed.is_paid === true,
      card_fee_warning: typeof parsed.card_fee_warning === "string" ? parsed.card_fee_warning : null,
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
      is_paid: false,
      card_fee_warning: null,
    };
  }
}
