/**
 * Avatar helpers, kept out of the component so they can be tested directly.
 */

/** "Brad Lister" -> "BL". Falls back to "?" for an empty or unusable name. */
export function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

/**
 * Hosts whose avatar URLs we treat as "no avatar".
 *
 * Google hands back a profile-photo URL for every account, and we copy it into
 * user_profiles at first sign-in (app/api/admin/profile/route.ts:27). For
 * anyone who never set a Google photo — currently everyone here — that URL is
 * a *generated* single-letter monogram, about 1KB of flat colour. Rendering it
 * makes the user list half Google's letter tile and half our own initials
 * badge, which is what it looked like before this.
 *
 * There is no reliable way to tell a generated monogram from a real photo by
 * URL: both are served from lh3.googleusercontent.com/a/<opaque id>. Rather
 * than sniff response sizes, we treat the whole auto-populated host as "not an
 * avatar the user chose" and fall through to initials.
 *
 * Trade-off: someone who does set a real Google profile photo won't see it
 * here. They can upload one on their profile page, which stores it in our own
 * avatars bucket and renders normally.
 */
const AUTO_POPULATED_AVATAR_HOSTS = new Set(["lh3.googleusercontent.com"]);

/**
 * The avatar URL worth rendering, or null when we should show initials.
 * Null/blank and unparseable values also resolve to null so callers only have
 * to handle the two real cases.
 */
export function resolveAvatarUrl(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return AUTO_POPULATED_AVATAR_HOSTS.has(hostname) ? null : url;
  } catch {
    return null;
  }
}
