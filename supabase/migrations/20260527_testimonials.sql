-- ── Testimonials ─────────────────────────────────────────────────────────
-- Client quotes / reviews shown on the public service pages. Zero
-- testimonials currently on the site even though Blake has 100+
-- completed projects — that's leaving 10-20% conversion lift on the
-- table by every public-form-design study I've ever read.
--
-- Schema rationale:
--   • `service` lets a single testimonial target the right page; a
--     home build is "construction", a staging job is
--     "interior_design", a listing closure is "real_estate". A
--     testimonial that fits all three (rare) gets one row per service.
--   • `status` lets Blake draft a quote, polish it, then publish.
--     'archived' hides without deleting (useful when a client
--     relationship sours later — don't lose the audit).
--   • `display_order` is an int instead of a smart sort so Blake can
--     pin a stellar quote first regardless of date.
--   • `project_id` is optional FK so we can later auto-show the
--     project's photos beside the testimonial.
--   • `source_url` lets us link to the original Google/Yelp review
--     for credibility; the same row works whether the quote is
--     verbatim from a Google review or hand-collected.

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  /** Subtitle shown beneath the name. Free-form so Blake can write
   *  "Homeowner, Hurricane UT" / "Buyer, St. George" / "Custom home
   *  client, 2026". */
  author_role TEXT,
  /** Optional link to the completed project so the UI can pair the
   *  quote with photos from that build. */
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  service TEXT NOT NULL CHECK (service IN (
    'construction', 'real_estate', 'interior_design', 'general'
  )),
  /** 1-5; null means "no rating, just a quote". */
  rating SMALLINT CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  quote TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'archived'
  )),
  /** Lower numbers display first. Defaults to 100 so new entries land
   *  at the bottom until Blake pins them. */
  display_order SMALLINT NOT NULL DEFAULT 100,
  /** Where the quote came from. 'manual' = Blake typed it from a text
   *  message or email; 'google' / 'yelp' / etc. = third-party review.
   *  Schema doesn't enforce values so we can add new sources without
   *  migration churn. */
  source TEXT DEFAULT 'manual',
  source_url TEXT,
  /** Optional avatar or thumbnail. Falls back to initials in the UI. */
  author_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_service_published
  ON public.testimonials (service, status, display_order)
  WHERE status = 'published';

COMMENT ON TABLE public.testimonials IS
  'Client quotes shown on public service pages. Filter by service '
  '(construction / real_estate / interior_design / general) and '
  'status=''published''; order by display_order then created_at desc.';

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anon can READ published testimonials only — they render on public
-- pages so we don't need an authenticated session.
CREATE POLICY "anon read published testimonials"
  ON public.testimonials
  FOR SELECT
  TO anon
  USING (status = 'published');

CREATE POLICY "admin all on testimonials"
  ON public.testimonials
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
