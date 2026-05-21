import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import { extractListingFields } from "@/lib/mls/extract-fields";

// Pure AI-extraction route — no fetch, no headless browser. Blake pastes
// the listing description from his MLS / flexmls page (where his own IP
// has no bot challenges) and we parse beds/baths/sqft/lot/etc. out of it.
export const maxDuration = 30;
export const runtime = "nodejs";

interface ExtractRequestBody {
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin();
    if (gate instanceof NextResponse) return gate;

    let body: ExtractRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const description = (body.description || "").trim();
    if (!description) {
      return NextResponse.json(
        { error: "Paste the listing description first." },
        { status: 400 }
      );
    }
    if (description.length < 30) {
      return NextResponse.json(
        {
          error:
            "Description is too short to extract anything reliable — paste at least a couple of sentences.",
        },
        { status: 400 }
      );
    }

    const fields = await extractListingFields(description);
    return NextResponse.json({ fields });
  } catch (err) {
    console.error("[extract-from-description] error", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Extraction failed: ${err.message}`
            : "Extraction failed",
      },
      { status: 500 }
    );
  }
}
