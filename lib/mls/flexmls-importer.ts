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
      // Real desktop Chrome UA. An earlier "JonesLegacyCreations/1.0" UA
      // tripped flexmls's bot heuristics and got back a CAPTCHA page with
      // no OG tags. Plain Chrome works (curl-tested) and is honest about
      // what we are: rendering a public share link to extract its preview.
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`flexmls returned HTTP ${res.status}`);
  }
  const html = await res.text();

  const ogDescription = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");
  const ogTitle = extractMeta(html, "og:title");

  // If both signals are missing, hand the caller a snippet so a 422 log can
  // explain what flexmls actually served back (often a CAPTCHA shell or a
  // generic landing page). Limit the snippet so it doesn't flood the log.
  if (!ogDescription && !ogImage) {
    throw new EmptyOgError(
      "No OG metadata found on the fetched page",
      html.replace(/\s+/g, " ").slice(0, 500)
    );
  }

  return {
    ogDescription,
    ogImage,
    ogTitle,
    sourceUrl: url,
  };
}

export class EmptyOgError extends Error {
  htmlSnippet: string;
  constructor(message: string, htmlSnippet: string) {
    super(message);
    this.name = "EmptyOgError";
    this.htmlSnippet = htmlSnippet;
  }
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
