-- ── Email subscribers ────────────────────────────────────────────────────
-- Captures visitors who aren't ready to fill out the full lead form but
-- will give an email for future updates. Per the audit: "visitors who
-- aren't ready today leave with no string attached." This adds the
-- string.
--
-- Schema rationale:
--   • Single-table for now; ESPs (Mailchimp / Resend Broadcasts /
--     ConvertKit) can be wired in later by syncing this table.
--   • `source` discriminator captures WHERE on the site they signed
--     up — useful for "which page magnet converts best?" reporting.
--   • `tags` JSONB lets Blake later segment for targeted sends
--     ("everyone who signed up from the construction page") without
--     schema migrations.
--   • Single opt-in (status='active' on insert) keeps the friction
--     low — small list, service business, low spam-complaint risk.
--     Adding double opt-in later is a status='pending' default plus
--     a confirmation endpoint.
--   • unsubscribe_token is a stable random string set on insert so
--     emails can include /unsubscribe?token=... links that won't
--     guess by sequential ID.

CREATE TABLE IF NOT EXISTS public.email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'unsubscribed', 'bounced', 'spam'
  )),
  source TEXT NOT NULL DEFAULT 'footer' CHECK (source IN (
    'footer', 'homepage', 'estimate_page', 'construction_page',
    'real_estate_page', 'interior_design_page', 'lead_magnet',
    'blog', 'other'
  )),
  /** Free-form interest tags so Blake can segment later
   *  (e.g. ["construction", "first-time-buyer"]). Defaults to
   *  empty array. */
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  /** Reasonably unguessable token for unsubscribe links.
   *  encode(gen_random_bytes(16), 'hex') = 32-char hex. */
  unsubscribe_token TEXT NOT NULL UNIQUE
    DEFAULT encode(gen_random_bytes(16), 'hex'),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email should be unique once normalized (lowercased, trimmed). We
-- enforce that in the app layer + a unique index on lowercased value
-- so re-submitting a casing variant doesn't create a duplicate row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_subscribers_email_lower
  ON public.email_subscribers (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_email_subscribers_status_created
  ON public.email_subscribers (status, created_at DESC);

COMMENT ON TABLE public.email_subscribers IS
  'Newsletter / future-broadcast list. Single opt-in by default '
  '(status=''active'' on insert). Unsubscribe link in every email '
  'uses /api/unsubscribe?token=… with unsubscribe_token.';

ALTER TABLE public.email_subscribers ENABLE ROW LEVEL SECURITY;

-- Anon INSERT only — same as leads. The public form posts via the
-- server route which uses service-role, but allowing anon insert
-- means a future client-direct opt-in stays compatible.
CREATE POLICY "anon insert on email_subscribers"
  ON public.email_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "admin all on email_subscribers"
  ON public.email_subscribers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
