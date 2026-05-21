import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import {
  scrapeFlexmlsListing,
  upgradeSparkPhotoResolution,
  isSparkPhotoUrl,
} from "@/lib/mls/flexmls-importer";
import { extractListingFields } from "@/lib/mls/extract-fields";
import {
  importSparkPhotos,
  sanitizeSlugForFolder,
} from "@/lib/mls/photo-uploader";

// The headless browser + photo downloads take longer than the default 10s
// limit. Vercel Pro allows up to 300s; this endpoint is admin-only so the
// extra cost is bounded.
export const maxDuration = 300;
export const runtime = "nodejs";

interface ImportRequestBody {
  url: string;
  /** Optional slug hint for the storage folder — defaults to a timestamp. */
  slugHint?: string;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const gate = await requireAdmin();
    if (gate instanceof NextResponse) return gate;

    let body: ImportRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const url = (body.url || "").trim();
    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    if (!/^https?:\/\/(?:my\.|.*\.)?flexmls\.com\//i.test(url)) {
      return NextResponse.json(
        { error: "Only flexmls.com listing share links are supported." },
        { status: 400 }
      );
    }

    console.log(`[mls-import] start url=${url}`);

    // 1. Render the SPA and pull the visible text + photo URLs.
    let scraped;
    try {
      scraped = await scrapeFlexmlsListing(url);
    } catch (err) {
      console.error("[mls-import] render error", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Render failed: ${err.message}`
              : "Render failed",
        },
        { status: 502 }
      );
    }
    console.log(
      `[mls-import] rendered text=${scraped.bodyText.length}ch photos=${scraped.photoUrls.length} +${Date.now() - startedAt}ms`
    );

    // 2. Run the structured-field extractor on the rendered text. Falling
    //    back to a best-effort empty struct on failure so we can still return
    //    the photos / OG fields for manual fill-in.
    let fields;
    try {
      fields = await extractListingFields(
        scraped.bodyText,
        scraped.ogDescription
      );
    } catch (err) {
      console.error("[mls-import] extract error", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Field extraction failed: ${err.message}`
              : "Field extraction failed",
        },
        { status: 502 }
      );
    }
    console.log(`[mls-import] extracted +${Date.now() - startedAt}ms`);

    // 3. Upgrade thumbnail Spark URLs to a usable resolution and dedupe.
    //    Always include the OG image even if the gallery scrape missed it.
    const candidatePhotoUrls = new Set<string>();
    if (scraped.ogImage && isSparkPhotoUrl(scraped.ogImage)) {
      candidatePhotoUrls.add(upgradeSparkPhotoResolution(scraped.ogImage));
    }
    for (const u of scraped.photoUrls) {
      if (isSparkPhotoUrl(u)) {
        candidatePhotoUrls.add(upgradeSparkPhotoResolution(u));
      }
    }

    // 4. Download + re-upload to Supabase. The folder is the slug hint if
    //    given (matches the listing's slug if it already exists), otherwise
    //    a timestamp so each import sits in its own namespace.
    const folder = sanitizeSlugForFolder(
      body.slugHint || `mls-import-${Date.now()}`
    );

    const photoResult = await importSparkPhotos(
      Array.from(candidatePhotoUrls),
      folder
    );
    console.log(
      `[mls-import] photos uploaded=${photoResult.photos.length} failed=${photoResult.failures.length} +${Date.now() - startedAt}ms`
    );

    // The first photo is the most likely cover — prefer the OG image's
    // imported URL when present, otherwise the first successful import.
    let coverPhotoUrl: string | null = null;
    if (scraped.ogImage) {
      const ogUpgraded = upgradeSparkPhotoResolution(scraped.ogImage);
      const match = photoResult.photos.find((p) => p.source === ogUpgraded);
      coverPhotoUrl = match?.url ?? null;
    }
    if (!coverPhotoUrl && photoResult.photos.length > 0) {
      coverPhotoUrl = photoResult.photos[0].url;
    }

    return NextResponse.json({
      fields,
      coverPhotoUrl,
      photos: photoResult.photos.map((p) => p.url),
      photoFailures: photoResult.failures,
      sourceUrl: scraped.sourceUrl,
    });
  } catch (err) {
    // Catch-all so the lambda returns a real error body instead of crashing
    // with a raw 502. Surfaces the message in Vercel function logs too.
    console.error("[mls-import] unhandled error", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `MLS import failed: ${err.message}`
            : "MLS import failed",
      },
      { status: 500 }
    );
  }
}
