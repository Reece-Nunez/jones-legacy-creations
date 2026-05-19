import Anthropic from "@anthropic-ai/sdk";

interface GenerateInput {
  title: string;
  location: string | null;
  features: string[];
  photoUrls: string[]; // first N will be used as visual context
}

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024; // 6 MB per photo

// Replace punctuation that screams "written by an LLM" with the plain ASCII
// equivalents. We do this as a post-processing safety net even though the
// prompt explicitly forbids these characters.
export function stripAIPunctuation(text: string): string {
  return text
    .replace(/—/g, ", ")   // em-dash → comma + space
    .replace(/–/g, "-")    // en-dash → hyphen
    .replace(/[“”„‟]/g, '"') // curly doubles
    .replace(/[‘’‚‛]/g, "'") // curly singles
    .replace(/…/g, "...")  // ellipsis
    .replace(/ /g, " ")    // non-breaking space
    .replace(/ {2,}/g, " ")     // collapse runs of spaces
    .replace(/ ,/g, ",")        // tidy up the comma replacement
    .replace(/\s+\n/g, "\n")
    .trim();
}

async function fetchAsBase64(url: string): Promise<
  | { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }
  | null
> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    if (ct.includes("png")) mediaType = "image/png";
    else if (ct.includes("webp")) mediaType = "image/webp";
    else if (ct.includes("gif")) mediaType = "image/gif";
    else mediaType = "image/jpeg";
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_PHOTO_BYTES) return null;
    return { data: Buffer.from(buf).toString("base64"), mediaType };
  } catch {
    return null;
  }
}

export async function generateShowcaseDescription(
  input: GenerateInput
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const photoCandidates = input.photoUrls.slice(0, MAX_PHOTOS);
  const fetched = await Promise.all(photoCandidates.map(fetchAsBase64));
  const photos = fetched.filter(
    (p): p is { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" } => p !== null
  );

  const client = new Anthropic({ apiKey });

  const content: Anthropic.Messages.ContentBlockParam[] = [];
  for (const p of photos) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: p.mediaType, data: p.data },
    });
  }

  const locationLine = input.location ? `Location: ${input.location}` : "Location: not specified";
  const featuresLine =
    input.features.length > 0
      ? `Highlighted features: ${input.features.join(", ")}`
      : "Highlighted features: none listed";

  content.push({
    type: "text",
    text: `You are writing a short description for a custom home Jones Legacy Creations recently completed. Jones Legacy Creations is a custom home builder in southern Utah, and the writing voice should match the builder, Blake, who is grounded and direct, not florid.

Project title: ${input.title}
${locationLine}
${featuresLine}

Look at the photos and write a description of this home in 80 to 130 words. Focus on what makes the home feel like itself, what a buyer or a fan of the builder would notice, and any standout features visible in the photos. Stay grounded. Avoid marketing fluff.

Hard rules for the writing style:
- No em-dashes or en-dashes. Use commas, periods, or simple hyphens instead.
- No curly quotes. Use straight quotes only if you absolutely need them.
- No ellipses. Just end the sentence.
- No semicolons.
- No exclamation marks.
- Do not start with the word "Welcome".
- Do not use phrases like "nestled", "boasts", "stunning", "breathtaking", "step inside", "imagine", "elevated", "discover", or "where X meets Y".
- Write in plain English. Short sentences are fine. Vary the rhythm.
- Address the reader as "you" only if it sounds natural, never forced.

Return only the description text. No headings, no quotation marks, no preamble.`,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 600,
    messages: [{ role: "user", content }],
  });

  const block = response.content.find((c) => c.type === "text");
  const raw = block && block.type === "text" ? block.text : "";
  return stripAIPunctuation(raw);
}
