/**
 * Turn the flexmls listing's OG description (marketing copy) into
 * structured listing fields.
 *
 * Why an LLM instead of regex: the description prose varies wildly per
 * listing ("3,656 sq ft", "3656 square feet", "5BR/4BA", "five
 * bedrooms"…). Claude reads it once, returns everything in one shot,
 * and degrades gracefully (nulls when missing) rather than blowing up
 * on an unexpected phrasing.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedListingFields {
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  lot_size: string | null;
  property_type:
    | "single_family"
    | "townhome"
    | "condo"
    | "land"
    | "multi_family"
    | "other"
    | null;
  description: string | null;
  /** Anything the model is unsure about — shown to admin during QC. */
  notes: string | null;
}

const SYSTEM_PROMPT = `You are extracting structured real estate listing fields from a listing's public marketing description.

Most fields (address, price) are typically NOT in marketing prose — return null for those without apology. The fields you'll usually find are: bedrooms, bathrooms, square_footage, lot_size, and the description itself.

Return only the JSON object described in the user message. If a field isn't clearly stated, return null. Don't guess.`;

const RESPONSE_SCHEMA_DESCRIPTION = `Return a single JSON object with these exact keys:
- address: string | null    // street address only, e.g. "123 N Main St" (no city/state/zip)
- city: string | null
- state: string | null      // 2-letter code, e.g. "UT"
- zip: string | null        // 5-digit US zip code if present
- price: number | null      // list price as a plain number, no commas/symbols
- bedrooms: number | null   // total bedrooms as an integer
- bathrooms: number | null  // total baths (can be a decimal like 2.5)
- square_footage: number | null  // finished sq ft of the home, as an integer
- lot_size: string | null   // human-readable lot size, e.g. "0.40 acres" or "8,712 sqft"
- property_type: "single_family" | "townhome" | "condo" | "land" | "multi_family" | "other" | null
- description: string | null  // the marketing/public remarks paragraph, cleaned up (no leading "Description:" labels)
- notes: string | null      // optional, free-form caveat for fields you're unsure about — null if confident

Output the JSON object only. No prose, no markdown fences.`;

export async function extractListingFields(
  description: string,
  ogTitle?: string | null
): Promise<ExtractedListingFields> {
  if (!description.trim()) {
    return emptyFields();
  }

  const userContent = [
    RESPONSE_SCHEMA_DESCRIPTION,
    "",
    "--- Listing description (marketing copy) ---",
    description,
    ogTitle ? `\n--- Listing title hint ---\n${ogTitle}` : "",
  ].join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  // Pull the text out of the first content block. The model is instructed to
  // return raw JSON; we still defensively strip code fences in case it adds
  // them anyway.
  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Extractor returned no text");
  }
  const raw = block.text.trim().replace(/^```(?:json)?\s*|```\s*$/g, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Extractor returned non-JSON: ${raw.slice(0, 200)}`);
  }

  return coerce(parsed);
}

function emptyFields(): ExtractedListingFields {
  return {
    address: null,
    city: null,
    state: null,
    zip: null,
    price: null,
    bedrooms: null,
    bathrooms: null,
    square_footage: null,
    lot_size: null,
    property_type: null,
    description: null,
    notes: null,
  };
}

// Best-effort type coercion. Claude is usually correct but occasionally
// returns numbers as strings or vice versa — clamp everything to the
// declared shape so the form doesn't crash on import.
function coerce(raw: unknown): ExtractedListingFields {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const cleaned = v.replace(/[$,\s]/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const propType = (v: unknown): ExtractedListingFields["property_type"] => {
    const s = str(v)?.toLowerCase();
    if (
      s === "single_family" ||
      s === "townhome" ||
      s === "condo" ||
      s === "land" ||
      s === "multi_family" ||
      s === "other"
    ) {
      return s;
    }
    return null;
  };

  return {
    address: str(obj.address),
    city: str(obj.city),
    state: str(obj.state)?.toUpperCase().slice(0, 2) ?? null,
    zip: str(obj.zip),
    price: num(obj.price),
    bedrooms: num(obj.bedrooms),
    bathrooms: num(obj.bathrooms),
    square_footage: num(obj.square_footage),
    lot_size: str(obj.lot_size),
    property_type: propType(obj.property_type),
    description: str(obj.description),
    notes: str(obj.notes),
  };
}
