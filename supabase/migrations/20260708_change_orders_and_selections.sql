-- ── Change Orders + Selection Approvals ───────────────────────────────────────
-- Two client-facing approval flows that share one shape: staff create a record,
-- a tokenized public link is shared with the client, the client acts on it
-- (signs a change order / approves-or-declines a selection), and a generated PDF
-- is filed into the project's documents.
--
-- Security model mirrors the existing submit-* flows:
--   • Both tables are staff-managed → admin_only via is_admin() (which already
--     excludes contractors, see 20260707_contractor_project_access.sql).
--   • The public client action goes through service-role API routes that bypass
--     RLS; the random `token` column is the trust boundary, exactly like
--     invoice_upload_tokens / dd_invite_tokens.
--   • Signature / decision provenance (name, timestamp, IP, user-agent, the
--     exact consent/disclaimer text shown) is captured for ESIGN evidence.

-- ── 1. change_orders ──────────────────────────────────────────────────────────
create table if not exists public.change_orders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  reason text,
  cost_delta numeric(12,2) not null default 0,       -- +/- to the contract price
  schedule_impact_days integer not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'signed', 'void')),
  token text unique,                                  -- public signing link
  client_name text,
  client_email text,
  client_phone text,
  -- Signature capture (typed-name e-signature, ESIGN)
  signed_at timestamptz,
  signer_name text,
  signer_ip text,
  signer_user_agent text,
  consent_text text,                                  -- snapshot of what they agreed to
  document_id uuid references public.documents(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists change_orders_project_idx on public.change_orders(project_id);
create index if not exists change_orders_token_idx on public.change_orders(token);

-- ── 2. selection_approvals ────────────────────────────────────────────────────
create table if not exists public.selection_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,                                -- e.g. "Kitchen countertop"
  selection_name text,                                -- e.g. "Quartz — Calacatta"
  description text,
  location text,                                      -- room / area
  cost_impact numeric(12,2),
  image_url text,                                     -- stored public URL in project-documents (private bucket)
  disclaimer_text text not null,                      -- snapshot of the liability language shown
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'declined')),
  token text unique,
  client_name text,
  client_email text,
  client_phone text,
  -- Decision capture
  decided_at timestamptz,
  decision text check (decision in ('approved', 'declined')),
  decider_name text,
  decider_ip text,
  decider_user_agent text,
  decline_reason text,
  document_id uuid references public.documents(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists selection_approvals_project_idx on public.selection_approvals(project_id);
create index if not exists selection_approvals_token_idx on public.selection_approvals(token);

-- ── 3. RLS: staff-only (public client actions use the service-role routes) ─────
do $$
declare
  t text;
begin
  foreach t in array array['change_orders', 'selection_approvals'] loop
    execute format('drop policy if exists %I on public.%I', 'admin_only', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'admin_only', t
    );
  end loop;
end $$;

-- ── 4. Extend documents categories with change_order + selection ──────────────
-- The generated PDFs are filed as documents; the category filter surfaces them.
alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents add constraint documents_category_check
  check (category in (
    'contract', 'permit', 'invoice', 'photo', 'plan', 'draw_request', 'general',
    'change_order', 'selection'
  ));
