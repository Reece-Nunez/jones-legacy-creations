import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedReceiptData {
  /** How the payment was made (e.g. "Check #1234", "ACH transfer", "Venmo", "Cash", "Credit card ****4242") */
  payment_method: string | null;
  /** Amount shown as paid on the receipt */
  amount: number | null;
  /** Date payment was made, YYYY-MM-DD */
  payment_date: string | null;
  /** Vendor / contractor that received the payment */
  vendor: string | null;
  /** Reference number — check number, ACH confirmation, transaction ID, etc. */
  reference_number: string | null;
}

/**
 * Use Claude Haiku to extract structured data from a payment receipt.
 * Cost: ~$0.01-0.03 per receipt.
 */
export async function extractReceiptData(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string,
): Promise<ExtractedReceiptData> {
  const empty: ExtractedReceiptData = {
    payment_method: null,
    amount: null,
    payment_date: null,
    vendor: null,
    reference_number: null,
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return empty;

  const client = new Anthropic({ apiKey });

  let mediaType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  if (fileType === "application/pdf") mediaType = "application/pdf";
  else if (fileType === "image/png") mediaType = "image/png";
  else if (fileType === "image/webp") mediaType = "image/webp";
  else if (fileType === "image/gif") mediaType = "image/gif";
  else mediaType = "image/jpeg";

  const base64 = Buffer.from(fileBuffer).toString("base64");

  const sourceContent: Anthropic.Messages.ContentBlockParam[] =
    mediaType === "application/pdf"
      ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }]
      : [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }];

  sourceContent.push({
    type: "text",
    text: `Extract payment information from this receipt. Filename: "${fileName}".

Return ONLY a JSON object with these fields (use null if a field is not clearly visible):

{
  "payment_method": "Short description of how the payment was made (e.g. 'Check #1234', 'ACH transfer', 'Venmo', 'Cash', 'Credit card ****4242', 'Wire transfer')",
  "amount": 12345.67,
  "payment_date": "YYYY-MM-DD",
  "vendor": "Who received the payment",
  "reference_number": "Check number, ACH confirmation, transaction ID, or similar"
}

Rules:
- "payment_method": Be specific but concise. Include check number if a check. Include last 4 digits for cards. If unclear, return null.
- "amount": Number only, no $ or commas.
- "payment_date": YYYY-MM-DD only.
- "reference_number": The unique identifier for this payment transaction.
Return ONLY valid JSON, no other text.`,
  });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: sourceContent }],
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      payment_method: parsed.payment_method || null,
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      payment_date: parsed.payment_date || null,
      vendor: parsed.vendor || null,
      reference_number: parsed.reference_number || null,
    };
  } catch (error) {
    console.error("Receipt extraction error:", error);
    return empty;
  }
}
