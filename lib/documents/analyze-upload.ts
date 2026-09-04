import Anthropic from "@anthropic-ai/sdk";
import { isDocumentKind, type DocumentKind } from "./document-kind";
import { parseNumber } from "./flag-compare";

/**
 * One pass over an uploaded file: what is it, and what should be done with it.
 *
 * Until now the invoice extractor only ran when the uploader happened to pick
 * the "Invoice" category in the upload form. Files dropped into the Documents
 * tab as plain uploads were stored and nothing else — which is why a GEM
 * Engineering invoice sat there as `category: general` with no payment behind
 * it. Detection was never wrong; it was never invoked.
 *
 * So classification happens on every non-photo upload, and the kind decides
 * what else comes back: an invoice yields the fields needed to create a
 * payment, a budget yields its line items. One model call does both, because
 * the model has to read the document either way.
 */

export type ParsedBudgetLine = {
  line_number: string;
  description: string;
  amount: number;
};

export type UploadAnalysis = {
  kind: DocumentKind;
  confidence: "high" | "medium" | "low";
  /** Populated for invoice/receipt. */
  vendor_name: string | null;
  amount: number | null;
  invoice_date: string | null;
  due_date: string | null;
  description: string | null;
  is_paid: boolean;
  card_fee_warning: string | null;
  /** Populated for budget. */
  budget_lines: ParsedBudgetLine[];
};

function empty(): UploadAnalysis {
  return {
    kind: "other",
    confidence: "low",
    vendor_name: null,
    amount: null,
    invoice_date: null,
    due_date: null,
    description: null,
    is_paid: false,
    card_fee_warning: null,
    budget_lines: [],
  };
}

function mediaTypeFor(fileType: string) {
  if (fileType === "application/pdf") return "application/pdf" as const;
  if (fileType === "image/png") return "image/png" as const;
  if (fileType === "image/webp") return "image/webp" as const;
  if (fileType === "image/gif") return "image/gif" as const;
  return "image/jpeg" as const;
}

const PROMPT = `Classify this construction document and extract what matters for its kind.

"kind" must be exactly one of:
- "invoice" — a bill from a vendor or subcontractor asking to be paid. Also use this for a quote or bid covering a single trade.
- "receipt" — proof a purchase was already paid (store receipt, card slip).
- "budget" — a whole-project cost breakdown: a numbered or itemised list of trades or cost codes with amounts, covering the job rather than one vendor's work.
- "contract" — an agreement with the homeowner/client (construction agreement, purchase agreement, change order).
- "loan" — a lender document (deed of trust, note, settlement statement, bank draw schedule).
- "permit" — a permit, permit application, or an inspection or regulatory notice.
- "plan" — drawings, stamped engineering, plats, specifications.
- "other" — anything else, including site photos and correspondence.

Tell invoice from budget by scope: one vendor billing for their own work is an "invoice" even if it lists many line items; a breakdown of the whole house across trades (framing, plumbing, electrical, cabinets...) is a "budget" even if a vendor's logo is on it.

If kind is "invoice" or "receipt", also return:
- "vendor_name": the company ISSUING the bill (the "from" / letterhead party), never the party being billed.
- "amount": the total due, as a number. If card and ACH prices differ, use the ACH/check amount.
- "invoice_date", "due_date": as YYYY-MM-DD, or null.
- "description": a short phrase for what the work was.
- "is_paid": true only if the document clearly states it has been paid.
- "card_fee_warning": a short string if card and ACH pricing differ or a card surcharge is listed, else null.

If kind is "budget", also return "budget_lines": an array of every cost line, in document order:
- "line_number": the line or cost-code number as printed ("1", "10a"). If the lines are unnumbered, number them sequentially from 1.
- "description": the trade or cost description.
- "amount": the budgeted amount as a number; use 0 if the line is blank.
Skip subtotal, total, contingency-summary and header rows — only real cost lines.

Return ONLY a JSON object with exactly these keys:
{"kind": "...", "confidence": "high"|"medium"|"low", "vendor_name": null, "amount": null, "invoice_date": null, "due_date": null, "description": null, "is_paid": false, "card_fee_warning": null, "budget_lines": []}

Use null / [] / false for anything that does not apply to this kind. Return ONLY valid JSON, no other text.`;

export async function analyzeUpload(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string,
): Promise<UploadAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return empty();

  const client = new Anthropic({ apiKey });
  const mediaType = mediaTypeFor(fileType);
  const base64 = Buffer.from(fileBuffer).toString("base64");

  const content: Anthropic.Messages.ContentBlockParam[] = [];
  if (mediaType === "application/pdf") {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    });
  } else {
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 },
    });
  }

  content.push({ type: "text", text: `The filename is "${fileName}".\n\n${PROMPT}` });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [{ role: "user", content }],
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const parsed = JSON.parse(
      text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim(),
    );

    return {
      kind: isDocumentKind(parsed.kind) ? parsed.kind : "other",
      confidence: ["high", "medium", "low"].includes(parsed.confidence)
        ? parsed.confidence
        : "low",
      vendor_name: nonEmpty(parsed.vendor_name),
      amount: typeof parsed.amount === "number" ? parsed.amount : null,
      invoice_date: nonEmpty(parsed.invoice_date),
      due_date: nonEmpty(parsed.due_date),
      description: nonEmpty(parsed.description),
      is_paid: parsed.is_paid === true,
      card_fee_warning: nonEmpty(parsed.card_fee_warning),
      budget_lines: normalizeBudgetLines(parsed.budget_lines),
    };
  } catch (error) {
    console.error("Upload analysis error:", error);
    return empty();
  }
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.toLowerCase() !== "null" ? text : null;
}

/**
 * A budget is written straight into budget_line_items on approval, so the rows
 * are cleaned here rather than trusted: a line with no description or an
 * unreadable amount is dropped, and repeated line numbers are made unique so
 * the (project_id, line_number) index can't reject the whole import over one
 * duplicated cost code.
 */
export function normalizeBudgetLines(raw: unknown): ParsedBudgetLine[] {
  if (!Array.isArray(raw)) return [];

  const lines: ParsedBudgetLine[] = [];
  const used = new Set<string>();

  for (const [index, item] of raw.entries()) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    const description = typeof row.description === "string" ? row.description.trim() : "";
    if (!description) continue;

    const amountRaw = row.amount;
    const amount =
      typeof amountRaw === "number"
        ? amountRaw
        : typeof amountRaw === "string"
          ? (parseNumber(amountRaw) ?? 0)
          : 0;
    if (!Number.isFinite(amount) || amount < 0) continue;

    const printed =
      typeof row.line_number === "string" && row.line_number.trim()
        ? row.line_number.trim().slice(0, 16)
        : String(index + 1);

    let candidate = printed;
    let suffix = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${printed}-${suffix}`;
      suffix += 1;
    }
    used.add(candidate.toLowerCase());

    lines.push({ line_number: candidate, description: description.slice(0, 200), amount });
  }

  return lines;
}
