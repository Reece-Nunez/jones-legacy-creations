/**
 * POST /api/admin/contractors/[id]/extract-w9
 *
 * Downloads the contractor's W9 from Supabase, uses Claude to extract
 * Name, EIN, and address fields, then pushes them to the QBO vendor record.
 */

import { NextRequest, NextResponse } from "next/server";
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

async function extractFromW9(
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<W9Fields> {
  const base64 = Buffer.from(fileBuffer).toString("base64");
  const isImage = mimeType.startsWith("image/");

  const fileContent = isImage
    ? ({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: base64,
        },
      } as const)
    : ({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf" as const,
          data: base64,
        },
      } as const);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    messages: [
      {
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
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(clean) as W9Fields;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch contractor
  const { data: contractor, error } = await supabase
    .from("contractors")
    .select("id, name, w9_file_url, w9_file_name")
    .eq("id", id)
    .single();

  if (error || !contractor) {
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
  }
  if (!contractor.w9_file_url) {
    return NextResponse.json({ error: "No W9 on file" }, { status: 400 });
  }

  // Look up QBO vendor
  const { realmId } = await getValidAccessToken();
  const { data: vendorMap } = await supabase
    .from("quickbooks_entity_map")
    .select("qbo_id")
    .eq("entity_type", "vendor")
    .eq("local_id", id)
    .eq("realm_id", realmId)
    .maybeSingle();

  if (!vendorMap) {
    return NextResponse.json(
      { error: "Contractor is not yet synced to QuickBooks. Sync them first." },
      { status: 400 }
    );
  }

  // Download the W9 file
  const fileRes = await fetch(contractor.w9_file_url);
  if (!fileRes.ok) {
    return NextResponse.json(
      { error: "Failed to download W9 from storage" },
      { status: 500 }
    );
  }

  const mimeType =
    fileRes.headers.get("content-type") ??
    (contractor.w9_file_name?.endsWith(".pdf")
      ? "application/pdf"
      : "image/jpeg");

  const fileBuffer = await fileRes.arrayBuffer();

  // Extract fields with Claude
  let fields: W9Fields;
  try {
    fields = await extractFromW9(fileBuffer, mimeType);
  } catch (err) {
    console.error("W9 extraction error:", err);
    return NextResponse.json(
      { error: "Could not read the W9 document. Try manually entering the details." },
      { status: 500 }
    );
  }

  // Push to QBO and stamp extracted_at
  try {
    await updateVendorContractorInfo(vendorMap.qbo_id, {
      legalName: fields.business_name ?? fields.name ?? undefined,
      businessName: fields.business_name ?? fields.name ?? undefined,
      ein: fields.ein ?? undefined,
      address: fields.address ?? undefined,
      city: fields.city ?? undefined,
      state: fields.state ?? undefined,
      zip: fields.zip ?? undefined,
    });

    // Record that info was extracted and pushed to QBO
    await supabase
      .from("contractors")
      .update({ w9_qbo_extracted_at: new Date().toISOString() })
      .eq("id", id);
  } catch (err) {
    console.error("QBO contractor info update error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update QuickBooks" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    extracted: {
      name: fields.name,
      business_name: fields.business_name,
      ein: fields.ein ? `${fields.ein.slice(0, 2)}-XXXXX${fields.ein.slice(-2)}` : null,
      address: fields.address,
      city: fields.city,
      state: fields.state,
      zip: fields.zip,
    },
  });
}
