/**
 * Pure helpers for testimonial video uploads.
 *
 * Kept out of the React component so the size/type rules that gate a
 * 40 MB phone recording are unit-testable without a browser or a
 * Supabase client.
 */

/** Supabase's default standard-upload ceiling, mirrored by the
 *  testimonial-videos bucket's file_size_limit. Validating here too
 *  gives the admin a readable error instead of a 413 from storage. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Poster frames are stills — a much tighter budget is fine. */
export const MAX_POSTER_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const ACCEPTED_POSTER_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ValidationResult = { ok: true } | { ok: false; error: string };

/** Human-readable megabytes, one decimal, for error copy. */
export function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The subset of File we actually read. Lets tests pass plain objects. */
export interface UploadCandidate {
  name: string;
  size: number;
  type: string;
}

export function validateVideoFile(file: UploadCandidate): ValidationResult {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type as (typeof ACCEPTED_VIDEO_TYPES)[number])) {
    return {
      ok: false,
      error: "Video must be an MP4, MOV, or WebM file",
    };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      // Naming the compression path matters: the alternative is Blake
      // retrying the same 200 MB file and getting the same error.
      error: `Video is ${formatMb(file.size)} — the limit is ${formatMb(
        MAX_VIDEO_BYTES,
      )}. Compress it to 1080p before uploading.`,
    };
  }
  if (file.size === 0) {
    return { ok: false, error: "That video file is empty" };
  }
  return { ok: true };
}

export function validatePosterFile(file: UploadCandidate): ValidationResult {
  if (!ACCEPTED_POSTER_TYPES.includes(file.type as (typeof ACCEPTED_POSTER_TYPES)[number])) {
    return { ok: false, error: "Poster must be a JPG, PNG, or WebP image" };
  }
  if (file.size > MAX_POSTER_BYTES) {
    return {
      ok: false,
      error: `Poster is ${formatMb(file.size)} — the limit is ${formatMb(
        MAX_POSTER_BYTES,
      )}`,
    };
  }
  return { ok: true };
}

/** Strip anything that would break a storage object key or a URL.
 *
 *  Underscores normalise to hyphens so keys use one separator style
 *  rather than mixing both. Runs of dots collapse to a single dot and
 *  leading dots are dropped: path separators are already stripped, so
 *  "../.." cannot traverse, but leaving the sequence in the key invites
 *  someone to reintroduce a separator later and turn it into a bug. */
export function sanitizeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.\-]+/g, "-")
      .replace(/\.{2,}/g, ".")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 80)
      .replace(/[-.]+$/, "") || "file"
  );
}

/**
 * Storage key for a testimonial asset: `<author-slug>/<ts>-<filename>`.
 *
 * Foldering by author keeps the bucket browsable in the Supabase UI when
 * Blake needs to find or delete one; the timestamp prevents a re-upload
 * of the same filename from colliding (the bucket uses upsert: false).
 */
export function buildAssetPath(
  authorName: string,
  filename: string,
  now: number = Date.now(),
): string {
  const folder = sanitizeFilename(authorName).slice(0, 40) || "testimonial";
  return `${folder}/${now}-${sanitizeFilename(filename)}`;
}

/** "2:14" from 134. Returns null when the duration is unknown or bogus
 *  so callers can omit the runtime rather than print "0:00". */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const whole = Math.round(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
