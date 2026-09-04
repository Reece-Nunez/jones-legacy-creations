/**
 * Parsing for stored Supabase Storage URLs.
 *
 * Kept separate from signedUrl.ts because the browser bundle needs it too
 * (see lib/fileDownloadUrl.ts) and signedUrl.ts pulls in the service-role
 * admin client, which must never reach the client.
 */

export type ParsedStorageUrl = { bucket: string; path: string };

/**
 * `u.pathname` is percent-encoded, and a malformed sequence (a stray "%")
 * makes decodeURIComponent throw. A half-broken URL shouldn't take down the
 * page that renders it, so fall back to the raw segment.
 */
function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Split a stored Storage URL into its bucket and object key.
 *
 * The returned `path` is the DECODED key — byte-for-byte what lives in
 * storage.objects.name, spaces and all.
 *
 * That distinction is the whole point of this function. supabase-js puts the
 * key straight into the request URL for createSignedUrl/download, so an
 * already-encoded string survives by accident: the storage server decodes it
 * once on the way in and the two errors cancel. But remove() sends the key in
 * a JSON body, where nothing decodes it — an encoded key matches no object
 * and the call deletes zero files *and reports no error*. Returning the real
 * key makes every caller correct instead of only the URL-shaped ones.
 *
 * Handles all three URL shapes we have stored:
 *   /storage/v1/object/public/<bucket>/<path>   pre-lockdown public URLs
 *   /storage/v1/object/<bucket>/<path>          post-lockdown
 *   /storage/v1/object/sign/<bucket>/<path>     signed
 */
export function parseStorageUrl(
  url: string | null | undefined,
): ParsedStorageUrl | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const marker = "/storage/v1/object/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;

    let rest = u.pathname.slice(i + marker.length);
    if (rest.startsWith("public/")) rest = rest.slice("public/".length);
    if (rest.startsWith("sign/")) rest = rest.slice("sign/".length);

    const slash = rest.indexOf("/");
    if (slash === -1) return null;

    const bucket = decodeSegment(rest.slice(0, slash));
    const path = decodeSegment(rest.slice(slash + 1));
    if (!bucket || !path) return null;

    return { bucket, path };
  } catch {
    return null;
  }
}

/**
 * Is this storage key inside the given project's folder?
 *
 * Project document keys are minted server-side as `<projectId>/<timestamp>-<name>`,
 * but the browser hands the key back when it registers the uploaded file — so
 * it has to be re-checked. The record, not the object, is what the UI reads,
 * so an unchecked key would let a caller hang a document off another project's
 * file. Traversal segments are rejected outright rather than normalised: no
 * legitimate key contains one.
 */
export function isProjectStoragePath(path: string, projectId: string): boolean {
  if (!path || !projectId) return false;
  if (!path.startsWith(`${projectId}/`)) return false;
  return !path.split("/").includes("..");
}
