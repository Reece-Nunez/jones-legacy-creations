-- ── Blog posts ──────────────────────────────────────────────────────────
-- Long-term local-SEO traffic engine. The audit's biggest-ROI gap by
-- expected lift, but compounds over months. Cornerstone content for
-- "custom home builder Hurricane UT", "Hurricane vs St George
-- neighborhoods", "cost to build in Washington County 2026" — search
-- traffic that currently bypasses the site entirely.
--
-- Schema rationale:
--   • Markdown stored in `content_md` (Blake writes in markdown,
--     `marked` renders to HTML on the server, no client JS for
--     reading — SEO-friendly and fast).
--   • Slug column for human-readable URLs at /blog/<slug>. Unique
--     constraint prevents collisions across drafts/reposts.
--   • `status` discriminator (draft / published / archived) gives
--     Blake a normal CMS publish flow without bolting on a separate
--     workflow table.
--   • `published_at` is what we sort the public index by. Distinct
--     from `created_at` because Blake might write a post in advance
--     and schedule its publish date.
--   • `cover_image_url` + `cover_image_alt` for OG cards and the
--     index card thumbnails.
--   • `tags` JSONB array is the open-ended categorization knob —
--     no schema migration to add a new tag, supports the future
--     "/blog/tag/[tag]" route if Blake wants it.
--   • `meta_description` is a separate column from `excerpt` so the
--     SEO-targeted version (concise, keyword-loaded) can differ from
--     the visible card subhead.
--   • `reading_time_minutes` is computed once on save (in app code)
--     so the public index can show "5 min read" without re-parsing
--     content for every request.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  /** Visible card subhead + first-paragraph teaser on the index. */
  excerpt TEXT,
  /** SEO meta-description, used for <meta name="description"> and
   *  the og:description. Falls back to excerpt at render time. */
  meta_description TEXT,
  /** Body content in markdown. Rendered server-side via `marked`. */
  content_md TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  cover_image_alt TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  /** "Blake Jones" / "The JLC team" etc. — single string for now;
   *  multi-author can become a FK to user_profiles later. */
  author_name TEXT,
  reading_time_minutes SMALLINT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'archived'
  )),
  /** When to surface publicly. NULL for drafts; populated on first
   *  publish. Lets Blake schedule a post by setting a future
   *  published_at + status='published'. */
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot read path: public index lists published posts ordered by
-- published_at desc.
CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON public.blog_posts (published_at DESC)
  WHERE status = 'published';

COMMENT ON TABLE public.blog_posts IS
  'Blog posts for the public /blog route. Markdown body rendered '
  'server-side via marked. status=''published'' rows appear in the '
  'public index and sitemap; drafts and archives stay admin-only.';

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anon can read published rows — server-side fetches and direct
-- client reads both work.
CREATE POLICY "anon read published posts"
  ON public.blog_posts
  FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "admin all on blog_posts"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
