import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/requireAdmin";
import {
  scrapeFlexmlsListing,
  upgradeSparkPhotoResolution,
  isSparkPhotoUrl,
  EmptyOgError,
} from "@/lib/mls/flexmls-importer";
import { extractListingFields } from "@/lib/mls/extract-fields";
import {
  importSparkPhotos,
  sanitizeSlugForFolder,
} from "@/lib/mls/photo-uploader";

// Plain HTTP fetch + AI extraction — no headless browser, no chromium. The
// whole thing finishes in 5–10s on a warm cache, well inside any plan's
// function timeout.
export const maxDuration = 60;
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

    // 1. Fetch the flexmls share page and pull its OG meta tags. An
    //    EmptyOgError means flexmls served us a page (200 OK) but without
    //    listing metadata — usually a CAPTCHA shell or an expired share
    //    link. Log a snippet so we can see what came back.
    let scraped;
    try {
      scraped = await scrapeFlexmlsListing(url);
    } catch (err) {
      if (err instanceof EmptyOgError) {
        console.error(
          "[mls-import] empty OG response, html snippet:",
          err.htmlSnippet
        );
        return NextResponse.json(
          {
            error:
              "Couldn't read listing data from that flexmls page. The share link may be expired, private, or flexmls served a verification page. Try opening the URL in a private browser window to confirm it loads for anyone.",
          },
          { status: 422 }
        );
      }
      console.error("[mls-import] fetch error", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Fetch failed: ${err.message}`
              : "Fetch failed",
        },
        { status: 502 }
      );
    }

    console.log(
      `[mls-import] fetched desc=${scraped.ogDescription?.length ?? 0}ch cover=${scraped.ogImage ? "yes" : "no"} +${Date.now() - startedAt}ms`
    );

    // 2. AI-extract structured fields from the description prose.
    let fields;
    try {
      fields = await extractListingFields(
        scraped.ogDescription ?? "",
        scraped.ogTitle
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

    // 3. Mirror the OG cover image into our own bucket. Flexmls/Spark URLs
    //    can rotate or hotlink-protect later — owning the file keeps the
    //    public listing detail page stable.
    let coverPhotoUrl: string | null = null;
    if (scraped.ogImage && isSparkPhotoUrl(scraped.ogImage)) {
      const folder = sanitizeSlugForFolder(
        body.slugHint || `mls-import-${Date.now()}`
      );
      const result = await importSparkPhotos(
        [upgradeSparkPhotoResolution(scraped.ogImage)],
        folder,
        { concurrency: 1, maxPhotos: 1 }
      );
      if (result.photos[0]) {
        coverPhotoUrl = result.photos[0].url;
      } else if (result.failures[0]) {
        console.warn(
          "[mls-import] cover photo upload failed",
          result.failures[0]
        );
      }
    }
    console.log(
      `[mls-import] done cover=${coverPhotoUrl ? "yes" : "no"} +${Date.now() - startedAt}ms`
    );

    return NextResponse.json({
      fields,
      coverPhotoUrl,
      // No gallery — Path A only gets the OG cover. Admin form uploads the
      // rest manually using the multi-select photo grid.
      photos: [] as string[],
      photoFailures: [],
      sourceUrl: scraped.sourceUrl,
    });
  } catch (err) {
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
