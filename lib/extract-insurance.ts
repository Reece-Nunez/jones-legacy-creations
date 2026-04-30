import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedInsuranceData {
  /** Carrier name (e.g. "The Hartford", "State Farm", "Progressive Commercial") */
  insurance_company: string | null;
  /** Policy number as printed on the certificate */
  policy_number: string | null;
  /**
   * Type of coverage. Common values seen on COIs:
   *   "General Liability", "Workers Compensation", "Commercial Auto",
   *   "Umbrella", "Professional Liability", "Builder's Risk"
   */
  coverage_type: string | null;
  /** When the policy expires, YYYY-MM-DD */
  expiration_date: string | null;
  /** Insured (named contractor) for sanity-checking */
  named_insured: string | null;
}

/**
 * Use Claude Haiku to extract structured data from a certificate of insurance.
 * Cost: ~$0.01-0.03 per document.
 */
export async function extractInsuranceData(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string,
): Promise<ExtractedInsuranceData> {
  const empty: ExtractedInsuranceData = {
    insurance_company: null,
    policy_number: null,
    coverage_type: null,
    expiration_date: null,
    named_insured: null,
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
    text: `Extract policy info from this certificate of insurance (COI). Filename: "${fileName}".

Return ONLY a JSON object with these fields (use null if a field is not clearly visible):

{
  "insurance_company": "Carrier name (e.g. 'The Hartford', 'State Farm', 'Progressive Commercial')",
  "policy_number": "Policy number as printed",
  "coverage_type": "One of: General Liability, Workers Compensation, Commercial Auto, Umbrella, Professional Liability, Builder's Risk, or another short label that matches the policy",
  "expiration_date": "YYYY-MM-DD",
  "named_insured": "Name of the insured business or person"
}

Rules:
- "insurance_company": The carrier issuing the policy (often labeled INSURER, PRODUCER, or appears in the top-left of an ACORD form). If multiple insurers are listed (one per line of coverage), return the one matching the most prominent / first listed coverage.
- "coverage_type": Pick the coverage shown on the certificate. If multiple coverages are listed (an ACORD 25 often has a few), pick the most prominent one. Use the canonical labels above where possible.
- "expiration_date": YYYY-MM-DD only. If multiple expirations exist (one per coverage), pick the soonest.
- "named_insured": The name in the NAMED INSURED / INSURED block.
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
      insurance_company: parsed.insurance_company || null,
      policy_number: parsed.policy_number || null,
      coverage_type: parsed.coverage_type || null,
      expiration_date: parsed.expiration_date || null,
      named_insured: parsed.named_insured || null,
    };
  } catch (error) {
    console.error("Insurance extraction error:", error);
    return empty;
  }
}
