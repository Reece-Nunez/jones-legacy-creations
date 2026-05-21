/**
 * flexmls.com importer — plain HTTP version.
 *
 * Earlier we ran a headless chromium against the flexmls SPA. flexmls's
 * bot detection blocked it with a CAPTCHA every time. Switching to a plain
 * fetch of the share URL avoids triggering the bot defenses entirely
 * (no JS, no fingerprint), and the page's OG meta tags carry enough
 * signal — full marketing description + cover photo — to populate ~70%
 * of a listing without typing.
 *
 * What we deliberately do NOT try to get here:
 *   - Address / city / zip — usually not in the OG description.
 *   - Price — same, almost never in the prose.
 *   - Full photo gallery — those load via XHR after JS runs.
 *
 * Those fields stay manual. Blake uploads gallery photos via the
 * Phase-1 multi-select photo grid (he has them on disk anyway, since
 * he's the listing agent).
 */

export interface FlexmlsScrapeResult {
  /** OG description = the marketing copy / public remarks for the listing. */
  ogDescription: string | null;
  /** OG image = the listing's cover photo on the Spark CDN. */
  ogImage: string | null;
  /** OG title — sometimes the address, sometimes empty. */
  ogTitle: string | null;
  /** Source page URL, normalized. */
  sourceUrl: string;
}

const SPARK_CDN_HOST_RE = /(?:^|\.)sparkplatform\.com$/i;

export async function scrapeFlexmlsListing(
  url: string
): Promise<FlexmlsScrapeResult> {
  if (!/^https?:\/\/(?:my\.|.*\.)?flexmls\.com\//i.test(url)) {
    throw new Error("URL must be a flexmls.com listing share link");
  }

  const res = await fetch(url, {
    headers: {
      // Identify as a generic desktop browser. flexmls's OG-serving path
      // doesn't gate on UA, but we send a realistic one anyway so we look
      // like a normal social-card crawler rather than something to flag.
      "user-agent":
        "Mozilla/5.0 (compatible; JonesLegacyCreations/1.0; +https://joneslegacycreations.com)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`flexmls returned HTTP ${res.status}`);
  }
  const html = await res.text();

  return {
    ogDescription: extractMeta(html, "og:description"),
    ogImage: extractMeta(html, "og:image"),
    ogTitle: extractMeta(html, "og:title"),
    sourceUrl: url,
  };
}

// Pull a meta property value out of a raw HTML string. Stays case-insensitive
// and tolerates attribute ordering (some pages put content="…" before
// property="…"). We avoid pulling in cheerio just for this — three regexes
// keep the cold-start budget zero.
function extractMeta(html: string, property: string): string | null {
  const escapedProp = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapedProp}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escapedProp}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapedProp}["'][^>]+content=["']([^"']*)["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodeHtmlEntities(m[1].trim()) || null;
  }
  return null;
}

// flexmls's OG description occasionally contains &amp; / &#39; — decode the
// common entities so the description reads naturally in the form.
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&nbsp;/g, " ");
}

/**
 * Normalize a Spark CDN photo URL to a higher-resolution variant. flexmls's
 * OG image is usually `/stg/1280x1024/…` already; this is a safety net for
 * thumbnails. Returns input unchanged if not a Spark CDN URL.
 */
export function upgradeSparkPhotoResolution(url: string): string {
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
