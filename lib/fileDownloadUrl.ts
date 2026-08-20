import { parseStorageUrl } from "@/lib/supabase/storagePath";

// Convert a stored Supabase public URL into a URL that points at our admin
// signed-URL redirect endpoint. The endpoint will validate the bucket,
// mint a short-lived signed URL, and 302-redirect the browser to it.
//
// The bucket and path go across as the decoded object key wrapped in a single
// encodeURIComponent, so the server's searchParams.get() hands the route the
// exact storage key. The previous version passed the *already-encoded*
// pathname through encodeURIComponent, producing "%2520" for a space; that
// happened to survive because supabase-js drops the key straight into the
// request URL and the storage server decodes it once, but it meant callers
// never actually held a usable key. See parseStorageUrl.
//
// If the URL doesn't match the expected pattern we fall back to the
// original (e.g. for absolute URLs that happen to be on a CDN).
export function fileDownloadUrl(publicUrl: string | null | undefined): string {
  if (!publicUrl) return "";
  const parsed = parseStorageUrl(publicUrl);
  if (!parsed) return publicUrl;
  return `/api/admin/files/download?bucket=${encodeURIComponent(
    parsed.bucket
  )}&path=${encodeURIComponent(parsed.path)}`;
}
