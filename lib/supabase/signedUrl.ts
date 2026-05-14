import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Given a stored Supabase public URL like
 *   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * (or the newer `/object/<bucket>/<path>` after the bucket goes private),
 * return the storage path relative to its bucket.
 *
 * Returns null if the URL doesn't match the bucket we expected.
 */
export function parseStoragePath(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const marker = `/storage/v1/object/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    // Strip the marker, then optional "public/", then expect "<bucket>/<path>"
    let rest = u.pathname.slice(i + marker.length);
    if (rest.startsWith("public/")) rest = rest.slice("public/".length);
    if (!rest.startsWith(`${bucket}/`)) return null;
    return rest.slice(bucket.length + 1);
  } catch {
    return null;
  }
}

/**
 * Mint a short-lived signed URL for an object in a private bucket. Uses the
 * service-role client so it works regardless of the caller's RLS context.
 */
export async function signObjectUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 60
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Convenience: given a stored public URL, return a short-lived signed URL
 * for the same object. Returns null if the URL is not in the expected bucket.
 */
export async function signFromPublicUrl(
  publicUrl: string,
  bucket: string,
  expiresInSeconds = 60
): Promise<string | null> {
  const path = parseStoragePath(publicUrl, bucket);
  if (!path) return null;
  return signObjectUrl(bucket, path, expiresInSeconds);
}
