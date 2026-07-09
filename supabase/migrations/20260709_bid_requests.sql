-- ── Bid Requests ──────────────────────────────────────────────────────────────
-- Blake uploads plans, assigns contractors, then blasts an individual bid request
-- to each sub. The sub opens a tokenized public link and accepts or declines the
-- job ("accept the project as a task"). On acceptance we file a PDF record and
-- auto-reply "your bid has been accepted, we'll contact you for scheduling", then
-- staff walk the row through completed → paid.
--
-- Shape and security model mirror change_orders / selection_approvals exactly:
--   • staff-managed table → admin_only via is_admin() (excludes contractors).
--   • the public accept/decline goes through a service-role API route; the random
--     `token` column is the trust boundary (like invoice_upload_tokens).
--   • acceptance provenance (name, timestamp, IP, user-agent, the exact terms
--     shown) is captured for ESIGN evidence.
--
-- One row = one contractor's request for one project. A "blast" simply inserts
-- many rows (one per recipient) sharing the same title / scope / message.

create table if not exists public.bid_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,                                 -- e.g. "Framing — bid request"
  scope_description text,                              -- the work being bid
  custom_message text,                                 -- Blake's note for this blast
  -- Recipient: links to a contractor when picked from the list, but the contact
  -- fields are snapshotted so an ad-hoc recipient (or a later contractor edit)
  -- doesn't rewrite what this request was actually sent to.
  contractor_id uuid references public.contractors(id) on delete set null,
  contractor_name text,
  contractor_email text,
  contractor_phone text,
  status text not null default 'draft'
    check (status in (
      'draft', 'sent', 'viewed', 'accepted', 'declined', 'completed', 'paid', 'void'
    )),
  token text unique,                                   -- public accept/decline link
  terms_text text,                                     -- snapshot of what they agreed to
  -- Response capture (typed-name acceptance, ESIGN)
  decided_at timestamptz,
  responder_name text,
  responder_ip text,
  responder_user_agent text,
  decline_reason text,
  -- Lifecycle (staff-driven)
  completed_at timestamptz,                            -- work finished → triggers "pay" prompt
  paid_at timestamptz,
  document_id uuid references public.documents(id) on delete set null,
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bid_requests_project_idx on public.bid_requests(project_id);
create index if not exists bid_requests_token_idx on public.bid_requests(token);

-- ── RLS: staff-only (public accept/decline uses the service-role route) ────────
drop policy if exists admin_only on public.bid_requests;
alter table public.bid_requests enable row level security;
create policy admin_only on public.bid_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Extend documents categories with bid_request ──────────────────────────────
-- The acceptance PDFs are filed as documents; the category filter surfaces them.
alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents add constraint documents_category_check
  check (category in (
    'contract', 'permit', 'invoice', 'photo', 'plan', 'draw_request', 'general',
    'change_order', 'selection', 'bid_request'
  ));
