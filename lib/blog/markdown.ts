/**
 * Server-side markdown → HTML for blog posts.
 *
 * Why server-only: rendering on the server means the public /blog
 * route ships plain HTML to the browser — no client-side parsing JS,
 * Google indexes the rendered content directly, and the per-page
 * payload stays tiny.
 *
 * `marked` is configured with safe-ish defaults:
 *   - GitHub-flavored markdown enabled (tables, autolinks)
 *   - Line breaks inside paragraphs are NOT converted to <br> (writers
 *     want paragraph control, not chat-style line breaks).
 *   - No raw HTML is escaped — we trust admin input. If non-admins
 *     ever gain write access, layer in DOMPurify here.
 */

import { Marked } from "marked";

const marked = new Marked({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(md: string): string {
  if (!md) return "";
  // Synchronous call is safe — Marked's async only kicks in for custom
  // extensions, none of which we use.
  return marked.parse(md, { async: false }) as string;
}

/**
 * Rough reading-time estimate. 200 wpm = casual English reading pace
 * (Medium uses 265; we err a hair conservative so the "5 min" badge
 * doesn't underpromise). Returns a non-zero minimum of 1 minute.
 */
export function estimateReadingTimeMinutes(md: string): number {
  if (!md) return 1;
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Generate a URL-safe slug from a title. Used by the admin editor as
 * a default when creating a new post; user can override.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    // Strip diacritics
    .replace(/[̀-ͯ]/g, "")
    // Anything non-alphanumeric becomes a hyphen
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
