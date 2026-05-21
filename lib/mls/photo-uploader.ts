/**
 * Pull MLS photos off the Spark CDN and into the local Supabase bucket.
 *
 * We do this so:
 *   1. The photos keep working if the MLS listing is taken down or its
 *      URL pattern changes.
 *   2. Next/Image can optimize them (Supabase host is already allowlisted).
 *   3. The brokerage controls the storage rather than depending on Spark.
 */

import { createAdminClient } from "@/lib/supabase/admin";

const LISTING_PHOTOS_BUCKET = "real-estate-photos";

export interface ImportedPhoto {
  /** The new public URL on the Supabase bucket. */
  url: string;
  /** The original Spark URL — kept for debugging / re-import. */
  source: string;
}

export interface PhotoImportResult {
  photos: ImportedPhoto[];
  /** Spark URLs that failed to download / upload, with a one-line reason. */
  failures: Array<{ source: string; reason: string }>;
}

/**
 * Download each Spark URL and upload it to the listing-photos bucket.
 *
 * Concurrency is capped to keep the lambda well inside its memory ceiling
 * (chromium already uses ~250MB) and to avoid hammering the Spark CDN. The
 * caller can pass `prefix` so all photos for the same listing live in one
 * folder, which makes manual cleanup easier.
 */
export async function importSparkPhotos(
  sparkUrls: string[],
  prefix: string,
  options: { concurrency?: number; maxPhotos?: number } = {}
): Promise<PhotoImportResult> {
  const concurrency = options.concurrency ?? 4;
  const maxPhotos = options.maxPhotos ?? 60;
  const admin = createAdminClient();
  const photos: ImportedPhoto[] = [];
  const failures: Array<{ source: string; reason: string }> = [];

  const queue = [...new Set(sparkUrls)].slice(0, maxPhotos);

  async function worker() {
    while (queue.length > 0) {
      const source = queue.shift();
      if (!source) return;
      try {
        const res = await fetch(source, {
          headers: {
            // Be polite: identify as a browser. Spark's CDN tends to serve
            // photos to any user-agent, but some MLSs add hotlink protection.
            "user-agent":
              "Mozilla/5.0 (compatible; JonesLegacyCreations/1.0; +https://joneslegacycreations.com)",
            referer: "https://my.flexmls.com/",
          },
        });
        if (!res.ok) {
          failures.push({
            source,
            reason: `Fetch failed: HTTP ${res.status}`,
          });
          continue;
        }
        const contentType =
          res.headers.get("content-type") || "application/octet-stream";
        if (!contentType.startsWith("image/")) {
          failures.push({ source, reason: `Not an image (${contentType})` });
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());

        const ext = guessExtension(contentType, source);
        const path = `${prefix}/${Date.now()}-${randomId()}.${ext}`;

        const { error: uploadErr } = await admin.storage
          .from(LISTING_PHOTOS_BUCKET)
          .upload(path, buf, {
            contentType,
            upsert: false,
          });
        if (uploadErr) {
          failures.push({ source, reason: uploadErr.message });
          continue;
        }

        const { data: pub } = admin.storage
          .from(LISTING_PHOTOS_BUCKET)
          .getPublicUrl(path);

        photos.push({ url: pub.publicUrl, source });
      } catch (err) {
        failures.push({
          source,
          reason: err instanceof Error ? err.message : "unknown error",
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () => worker())
  );

  return { photos, failures };
}

function guessExtension(contentType: string, sourceUrl: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  // Fall back to URL extension if content-type was vague.
  const m = sourceUrl.match(/\.(jpe?g|png|webp|gif)(?:\?|$)/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function sanitizeSlugForFolder(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, "-").slice(0, 60) || "mls-import";
}
