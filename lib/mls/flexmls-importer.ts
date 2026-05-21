/**
 * flexmls.com importer.
 *
 * flexmls is a SPA — the listing data is fetched client-side after JS runs,
 * so a plain HTTP fetch returns an empty shell. We use a headless chromium
 * (via playwright-core + @sparticuz/chromium on Vercel, or a locally
 * installed Chrome on dev machines) to render the page, then snapshot the
 * visible text and the full set of Spark CDN image URLs.
 *
 * The visible text gets passed to Claude later for structured field
 * extraction (see lib/mls/extract-fields.ts) — much more resilient than
 * fragile CSS selectors that break on every flexmls UI tweak.
 */

import type { Browser } from "playwright-core";

export interface FlexmlsScrapeResult {
  /** Plain text rendered on the page after JS executed. */
  bodyText: string;
  /** Unique high-res Spark CDN photo URLs found in the rendered DOM. */
  photoUrls: string[];
  /** OG description as fallback / cross-check signal. */
  ogDescription: string | null;
  /** OG image — the cover photo Spark assigned. */
  ogImage: string | null;
  /** Source page URL, normalized. */
  sourceUrl: string;
}

const SPARK_CDN_HOST_RE = /(?:^|\.)sparkplatform\.com$/i;

// On Vercel/Linux we pull the chromium binary lazily so it isn't loaded into
// memory for unrelated routes. On Windows/macOS dev machines, the developer
// must point CHROMIUM_PATH at a local Chrome/Chromium install — sparticuz's
// binary is Linux-only.
async function launchBrowser(): Promise<Browser> {
  const { chromium } = await import("playwright-core");

  // Production / Vercel: use bundled sparticuz binary.
  const isServerless =
    !!process.env.VERCEL ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === "production";

  if (isServerless && !process.env.CHROMIUM_PATH) {
    const sparticuz = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      headless: true,
    });
  }

  const executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) {
    throw new Error(
      "MLS import requires a local Chrome/Chromium for dev. Set CHROMIUM_PATH env var (e.g., C:/Program Files/Google/Chrome/Application/chrome.exe)."
    );
  }
  return chromium.launch({ executablePath, headless: true });
}

/**
 * Render a flexmls listing URL and return the rendered text + photo URLs.
 *
 * The caller is responsible for downloading the photos and parsing the text.
 * This function only does what's hard: drive the browser and wait for JS.
 */
export async function scrapeFlexmlsListing(
  url: string
): Promise<FlexmlsScrapeResult> {
  if (!/^https?:\/\/(?:my\.|.*\.)?flexmls\.com\//i.test(url)) {
    throw new Error("URL must be a flexmls.com listing share link");
  }

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      viewport: { width: 1440, height: 1800 },
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    // flexmls lazy-renders the listing detail panel. Wait for either the
    // price ($ token followed by digits) OR a known photo URL pattern,
    // whichever happens first — neither is guaranteed, but together they
    // cover the realistic loading paths.
    await Promise.race([
      page
        .waitForFunction(
          () =>
            /\$\s?\d{2,}/.test(document.body.innerText) &&
            document.body.innerText.length > 800,
          { timeout: 30000 }
        )
        .catch(() => null),
      page.waitForTimeout(20000),
    ]);

    // Give the gallery a beat to populate after the main content paints.
    await page.waitForTimeout(1500);

    const result = await page.evaluate(() => {
      const bodyText = (document.body.innerText || "").trim();

      const photoUrls = new Set<string>();
      for (const img of Array.from(document.querySelectorAll("img"))) {
        const src = img.getAttribute("src") || img.getAttribute("data-src");
        if (!src) continue;
        try {
          const u = new URL(src, location.href);
          if (/sparkplatform\.com$/i.test(u.hostname)) {
            photoUrls.add(u.href);
          }
        } catch {
          // ignore malformed URLs
        }
      }

      const meta = (name: string, attr: "property" | "name" = "property") =>
        (document.querySelector(
          `meta[${attr}="${name}"]`
        ) as HTMLMetaElement | null)?.content ?? null;

      return {
        bodyText,
        photoUrls: Array.from(photoUrls),
        ogDescription: meta("og:description"),
        ogImage: meta("og:image"),
      };
    });

    await context.close();

    return {
      ...result,
      sourceUrl: url,
    };
  } finally {
    await browser.close().catch(() => {
      /* best-effort */
    });
  }
}

/**
 * Normalize a Spark CDN photo URL to a higher-resolution variant. flexmls
 * thumbnails are typically `/stg/640x480/.../id-o.jpg` — we swap to a larger
 * size so the gallery photos look reasonable on the public detail page.
 */
export function upgradeSparkPhotoResolution(url: string): string {
  // Pattern: https://cdn.resize.sparkplatform.com/stg/<WxH>/true/<id>-o.jpg
  return url.replace(
    /\/stg\/\d+x\d+\/(true|false)\//,
    "/stg/1280x1024/$1/"
  );
}

export function isSparkPhotoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return SPARK_CDN_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}
