-- ── Lead capture (unified) ────────────────────────────────────────────────
-- Every public form (contact, construction, real-estate, interior-design,
-- and any future lead-magnet capture) writes a row here BEFORE Resend
-- sends the notification email. Before this migration, lead persistence
-- was Resend-only — a single SES/Resend hiccup meant the lead was gone
-- forever, with no funnel data and no follow-up path.
--
-- Schema rationale:
--   • One table per lead source would force a join for /admin/leads
--     triage. One table with a `source` discriminator + raw_payload
--     JSONB keeps everything queryable while preserving the original
--     form values verbatim for audit.
--   • status column gives Blake a triage workflow without bolting on
--     a CRM. Default 'new'; he flips to 'contacted' / 'qualified' /
--     'won' / 'lost' / 'spam' as he works the lead.
--   • The estimates table already exists for AI estimate leads; we
--     don't migrate it here — it has its own AI-result shape. /admin/leads
--     will UNION the two for the triage view.

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN (
    'contact', 'construction', 'real_estate', 'interior_design',
    'newsletter', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'qualified', 'won', 'lost', 'spam'
  )),

  -- Common fields every form has. NULL if a particular form doesn't
  -- collect that field (e.g. newsletter signup only has email).
  full_name TEXT,
  email TEXT,
  phone TEXT,
  subject TEXT,
  message TEXT,

  -- Original form payload verbatim — keeps source-specific fields
  -- (project_type, square_footage, budget_range, listing_id, etc.)
  -- without a schema migration every time a form adds a question.
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Tracking context — populated client-side when the form fires.
  -- Lets Blake see "this lead came from a Facebook ad" without
  -- bolting on a separate analytics platform.
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,

  -- Triage workflow
  notes TEXT,
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  contacted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  /** When status='won', link to the project that came out of this lead.
   *  Foundation for "leads that became projects" reporting and for the
   *  Reece-commission tracking Blake mentioned (2% of profit on web-
   *  sourced projects). */
  converted_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for the triage page: filter by status, sort by created_at.
CREATE INDEX IF NOT EXISTS idx_leads_status_created
  ON public.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source_created
  ON public.leads (source, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email
  ON public.leads (email)
  WHERE email IS NOT NULL;

COMMENT ON TABLE public.leads IS
  'Unified lead capture from every public form. Writing here BEFORE the '
  'Resend notification means a Resend failure doesn''t lose the lead. '
  'Fields common to every form get their own column; source-specific '
  'fields live in raw_payload JSONB.';

-- RLS: insert is open to anon (forms post from the browser via the
-- server route, but the service-role client bypasses this anyway —
-- still, leave room for future direct-from-browser forms). Read/update
-- restricted to admins.
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon insert on leads"
  ON public.leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "admin all on leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
