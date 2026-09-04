-- ── Document kind + parsed budget ─────────────────────────────────────────────
-- What a document IS decides what may be read off it. A vendor invoice carries
-- three addresses (the vendor's, Jones Custom Homes' bill-to, and sometimes the
-- job site) and two company names, so treating any address on it as the project
-- address rewrites the project with the wrong party's details — which is
-- exactly what the first round of scanning did.
--
-- Classifying once, at upload, and storing it here means the field-eligibility
-- rules in lib/documents/document-kind.ts can be applied consistently by both
-- the upload path and the catch-up scan without re-billing a model call.

alter table public.documents
  add column if not exists document_kind text;

alter table public.documents drop constraint if exists documents_document_kind_check;
alter table public.documents add constraint documents_document_kind_check
  check (document_kind is null or document_kind in (
    'invoice', 'receipt', 'budget', 'contract', 'loan', 'permit', 'plan', 'other'
  ));

-- Budget line items read off an uploaded budget, held until Blake reviews them.
-- Parked on the document rather than written straight into budget_line_items:
-- applying replaces the project's budget, so it needs a confirmation step.
alter table public.documents
  add column if not exists parsed_budget jsonb;

-- Lets the review panel find "this document has a budget waiting to be applied"
-- without scanning every document row.
create index if not exists documents_parsed_budget_idx
  on public.documents(project_id)
  where parsed_budget is not null;
