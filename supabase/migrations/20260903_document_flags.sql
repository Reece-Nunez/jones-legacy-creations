-- ── Document Flags ────────────────────────────────────────────────────────────
-- Blake uploads a pile of invoices, contracts and permits. Claude reads each one
-- against what the project already says and reports the places they disagree —
-- an invoice billed to a different address, a contract value that doesn't match
-- the one on file, a vendor name spelled three ways. Each disagreement lands
-- here as a row Blake accepts (write the document's value over the record) or
-- rejects (never show me this again for this document).
--
-- One row = one field on one record that one document disputes.
--
-- Safety model: `target_table` / `target_field` are NOT free text as far as the
-- application is concerned. Accept only writes through the allow-list in
-- lib/documents/flag-fields.ts, so a hallucinated or crafted field name can
-- never reach an arbitrary column. The check constraint here is the second line
-- of defence, restricting writes to the two project-scoped tables — never to
-- `contractors`, which is shared across projects.

create table if not exists public.document_flags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,

  category text not null
    check (category in ('money', 'identity', 'address', 'reference')),

  -- Where accepting writes to.
  target_table text not null
    check (target_table in ('projects', 'contractor_payments')),
  target_id uuid not null,
  target_field text not null,

  -- What the record said when the flag was raised, kept so the review panel can
  -- show "was → becomes" and so a stale flag (the field changed underneath it)
  -- can be spotted rather than silently clobbering newer data.
  current_value text,
  suggested_value text not null,

  confidence text not null default 'medium'
    check (confidence in ('high', 'medium', 'low')),
  explanation text,

  status text not null default 'open'
    check (status in ('open', 'accepted', 'rejected')),
  resolved_at timestamptz,
  resolved_by uuid references public.user_profiles(id) on delete set null,

  created_at timestamptz not null default now(),

  -- One live flag per (document, record, field). Re-scanning a document
  -- refreshes the open flag instead of stacking duplicates, and a flag already
  -- accepted or rejected is not raised again.
  unique (document_id, target_table, target_id, target_field)
);

create index if not exists document_flags_project_idx
  on public.document_flags(project_id);
create index if not exists document_flags_open_idx
  on public.document_flags(project_id, status) where status = 'open';

-- Marks a document as having been through the discrepancy scan, so "Scan
-- documents" can skip what it has already read and Blake isn't paying for the
-- same Haiku call twice.
alter table public.documents
  add column if not exists flags_scanned_at timestamptz;

-- ── RLS: staff-only ───────────────────────────────────────────────────────────
-- Contractors can upload documents to projects they're granted, but reviewing
-- discrepancies against project financials is staff work.
alter table public.document_flags enable row level security;
drop policy if exists admin_only on public.document_flags;
create policy admin_only on public.document_flags
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
