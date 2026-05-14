// Convert a stored Supabase public URL into a URL that points at our admin
// signed-URL redirect endpoint. The endpoint will validate the bucket,
// mint a short-lived signed URL, and 302-redirect the browser to it.
//
// Pre-bucket-lockdown URLs look like:
//   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
// Post-lockdown they still parse the same way; we just strip "public/".
//
// If the URL doesn't match the expected pattern we fall back to the
// original (e.g. for absolute URLs that happen to be on a CDN).
export function fileDownloadUrl(publicUrl: string | null | undefined): string {
  if (!publicUrl) return "";
  try {
    const u = new URL(publicUrl);
    const marker = "/storage/v1/object/";
    const i = u.pathname.indexOf(marker);
    if (i === -1) return publicUrl;
    let rest = u.pathname.slice(i + marker.length);
    if (rest.startsWith("public/")) rest = rest.slice("public/".length);
    if (rest.startsWith("sign/")) rest = rest.slice("sign/".length);
    const slash = rest.indexOf("/");
    if (slash === -1) return publicUrl;
    const bucket = rest.slice(0, slash);
    const path = rest.slice(slash + 1);
    return `/api/admin/files/download?bucket=${encodeURIComponent(
      bucket
    )}&path=${encodeURIComponent(path)}`;
  } catch {
    return publicUrl;
  }
}
