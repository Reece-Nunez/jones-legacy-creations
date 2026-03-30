import Anthropic from "@anthropic-ai/sdk";

export interface ExtractedPermitData {
  square_footage: number | null;
  stories: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage_spaces: number | null;
  finish_level: string | null;
  lot_size: string | null;
  project_type: string | null;
  permit_number: string | null;
}

/**
 * Use Claude Haiku to extract property details from a building permit PDF/image.
 */
export async function extractPermitData(
  fileBuffer: ArrayBuffer,
  fileType: string,
  fileName: string
): Promise<ExtractedPermitData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return emptyResult();
  }

  const client = new Anthropic({ apiKey });

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
    text: `Extract property details from this building permit document. The filename is "${fileName}".

Return ONLY a JSON object with these fields (use null for any field you can't find):

{
  "square_footage": 2400,
  "stories": 2,
  "bedrooms": 4,
  "bathrooms": 2.5,
  "garage_spaces": 2,
  "finish_level": "standard",
  "lot_size": "0.25 acres",
  "project_type": "new_home",
  "permit_number": "BP-2026-001234"
}

Field guidance:
- "square_footage": Total heated/conditioned square footage as an integer
- "stories": Number of stories/floors as an integer
- "bedrooms": Number of bedrooms as an integer
- "bathrooms": Number of bathrooms (use .5 for half baths, e.g. 2.5)
- "garage_spaces": Number of garage bays/spaces as an integer
- "finish_level": One of "budget", "standard", "mid_range", "high_end" — infer from materials/specs if possible
- "lot_size": Lot size as a string (e.g. "0.25 acres" or "10,890 sq ft")
- "project_type": One of "new_home", "addition", "garage", "deck_patio", "renovation", "commercial", "other"
- "permit_number": The permit or application number

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

    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return {
      square_footage: typeof parsed.square_footage === "number" ? parsed.square_footage : null,
      stories: typeof parsed.stories === "number" ? parsed.stories : null,
      bedrooms: typeof parsed.bedrooms === "number" ? parsed.bedrooms : null,
      bathrooms: typeof parsed.bathrooms === "number" ? parsed.bathrooms : null,
      garage_spaces: typeof parsed.garage_spaces === "number" ? parsed.garage_spaces : null,
      finish_level: parsed.finish_level || null,
      lot_size: parsed.lot_size || null,
      project_type: parsed.project_type || null,
      permit_number: parsed.permit_number || null,
    };
  } catch (error) {
    console.error("Permit extraction error:", error);
    return emptyResult();
  }
}

function emptyResult(): ExtractedPermitData {
  return {
    square_footage: null,
    stories: null,
    bedrooms: null,
    bathrooms: null,
    garage_spaces: null,
    finish_level: null,
    lot_size: null,
    project_type: null,
    permit_number: null,
  };
}
