import Anthropic from "@anthropic-ai/sdk";
import { FLAG_FIELDS, type FlagField } from "./flag-fields";
import type { RawFlag } from "./flag-plan";

/**
 * Ask Claude to read a document against what the project already claims, and
 * report only the places they disagree.
 *
 * The model is given the exact catalogue of fields it may name, together with
 * the current value of each, and told to return nothing when a document simply
 * has nothing to say about a field. Two things still can't be assumed about
 * what comes back — that the field names are real, and that the "differences"
 * are differences — so callers run the result through planFlags() before it
 * goes anywhere near the database.
 *
 * Cost: one Haiku call per document, in the same range as the existing
 * extraction pass (~$0.01–0.03).
 */

export type FlagSubjectContext = {
  field: FlagField;
  current: string | null;
};

export type DetectFlagsInput = {
  fileBuffer: ArrayBuffer;
  fileType: string;
  fileName: string;
  /** Field catalogue with current values, built by the caller. */
  context: FlagSubjectContext[];
};

function mediaTypeFor(fileType: string) {
  if (fileType === "application/pdf") return "application/pdf" as const;
  if (fileType === "image/png") return "image/png" as const;
  if (fileType === "image/webp") return "image/webp" as const;
  if (fileType === "image/gif") return "image/gif" as const;
  return "image/jpeg" as const;
}

export async function detectDocumentFlags(input: DetectFlagsInput): Promise<RawFlag[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  if (input.context.length === 0) return [];

  const client = new Anthropic({ apiKey });
  const mediaType = mediaTypeFor(input.fileType);
  const base64 = Buffer.from(input.fileBuffer).toString("base64");

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

  const catalogue = input.context
    .map((c) => `- ${c.field.key} (${c.field.label}, ${c.field.type}): ${c.current ?? "(blank)"}`)
    .join("\n");

  const fieldKeys = FLAG_FIELDS.map((f) => f.key).join(", ");

  content.push({
    type: "text",
    text: `This document was filed against a construction project. The filename is "${input.fileName}".

Here is what our records currently say. Each line is "field_key (label, type): current value":

${catalogue}

Read the document and report ONLY fields where the document clearly states something DIFFERENT from our records, or states something for a field our records leave blank.

Rules:
- Use only these field keys, exactly as written: ${fieldKeys}
- Report a field only if the document actually states a value for it. If the document says nothing about a field, leave it out. Most documents will only touch two or three fields; returning an empty list is a perfectly good answer.
- Do NOT report a difference that is only formatting: "$45,744.00" and "45744" are the same number, "1234 S Main St." and "1234 South Main Street" are the same address, "3/5/2026" and "2026-03-05" are the same date, "ACME Concrete LLC" and "Acme Concrete, LLC" are the same company.
- A payment amount refers to THIS document's invoice total, not a running balance or a subtotal.
- If you are reading a value out of a table or a scan that is hard to make out, say so and set confidence "low".

Return ONLY a JSON array, no other text. Each element:
{
  "field": "<one of the field keys above>",
  "value": "<what the document says, as plain text>",
  "explanation": "<one short sentence: where on the document you read it, and what it disagrees with>",
  "confidence": "high" | "medium" | "low"
}

If nothing disagrees, return [].`,
  });

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [{ role: "user", content }],
    });

    const text = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Document flag detection error:", error);
    return [];
  }
}
