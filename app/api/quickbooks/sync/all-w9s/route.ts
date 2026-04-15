/**
 * POST /api/quickbooks/sync/all-w9s
 *
 * Iterates all contractors that have a W9 on file but haven't had their
 * W9 data extracted to QBO yet (w9_qbo_extracted_at IS NULL).
 * Calls the same Claude extraction + QBO vendor update logic as the
 * per-contractor extract-w9 route.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/quickbooks/auth";
import { updateVendorContractorInfo } from "@/lib/quickbooks/client";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface W9Fields {
  name: string | null;
  business_name: string | null;
  ein: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

async function extractFromW9(fileBuffer: ArrayBuffer, mimeType: string): Promise<W9Fields> {
  const base64 = Buffer.from(fileBuffer).toString("base64");
  const isImage = mimeType.startsWith("image/");

  const fileContent = isImage
    ? ({ type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } } as const)
    : ({ type: "document", source: { type: "base64", media_type: "application/pdf" as const, data: base64 } } as const);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: [
        fileContent,
        {
          type: "text",
          text: `Extract the following fields from this W9 tax form. Return JSON only, no markdown:
{
  "name": "<legal name or individual name on line 1>",
  "business_name": "<business/DBA name on line 2 if different from name, else null>",
  "ein": "<Employer Identification Number in XX-XXXXXXX format if present, else null>",
  "address": "<street address>",
  "city": "<city>",
  "state": "<2-letter state abbreviation>",
  "zip": "<zip code>"
}
If a field is not visible or not present, use null.`,
        },
      ],
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(clean) as W9Fields;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Contractors with a W9 file that haven't been extracted yet
  const { data: contractors, error } = await supabase
    .from("contractors")
    .select("id, name, w9_file_url, w9_file_name")
    .not("w9_file_url", "is", null)
    .is("w9_qbo_extracted_at", null);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch contractors" }, { status: 500 });
  }

  const { realmId } = await getValidAccessToken();

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (const contractor of contractors ?? []) {
    // Check if this contractor has a QBO vendor mapping
    const { data: vendorMap } = await supabase
      .from("quickbooks_entity_map")
      .select("qbo_id")
      .eq("entity_type", "vendor")
      .eq("local_id", contractor.id)
      .eq("realm_id", realmId)
      .maybeSingle();

    if (!vendorMap) {
      skipped++;
      continue;
    }

    try {
      const fileRes = await fetch(contractor.w9_file_url!);
      if (!fileRes.ok) throw new Error(`Failed to download W9: ${fileRes.status}`);

      const mimeType =
        fileRes.headers.get("content-type") ??
        (contractor.w9_file_name?.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      const fileBuffer = await fileRes.arrayBuffer();
      const fields = await extractFromW9(fileBuffer, mimeType);

      await updateVendorContractorInfo(vendorMap.qbo_id, {
        legalName: fields.business_name ?? fields.name ?? undefined,
        businessName: fields.business_name ?? fields.name ?? undefined,
        ein: fields.ein ?? undefined,
        address: fields.address ?? undefined,
        city: fields.city ?? undefined,
        state: fields.state ?? undefined,
        zip: fields.zip ?? undefined,
      });

      await supabase
        .from("contractors")
        .update({ w9_qbo_extracted_at: new Date().toISOString() })
        .eq("id", contractor.id);

      succeeded++;
    } catch (err) {
      console.error(`[QBO] W9 sync failed for contractor ${contractor.id} (${contractor.name}):`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  return NextResponse.json({ succeeded, failed, skipped, total: (contractors?.length ?? 0) + skipped });
}
