-- ── Company (JLC) insurance documents ────────────────────────────────────────
-- Blake's own liability coverage — general liability, workers comp, commercial
-- auto, umbrella. Distinct from contractor_insurance_documents, which holds
-- COIs collected *from* subs. Same shape so the AI extractor
-- (lib/extract-insurance.ts) and the expiry-status UI are shared, but kept in
-- its own table because these rows have no contractor_id and are company-wide
-- records rather than per-vendor compliance artifacts.
--
-- Storage lives in a new private `company-documents` bucket rather than
-- reusing `contractor-w9`: that bucket's name and policies are scoped to
-- vendor paperwork, and mixing company records into it would make future
-- retention/permission changes ambiguous.

create table if not exists public.company_insurance_documents (
  id                uuid primary key default uuid_generate_v4(),
  file_url          text not null,
  file_name         text not null,
  insurance_company text,
  policy_number     text,
  coverage_type     text,
  expiration_date   date,
  notes             text,
  uploaded_at       timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- Dashboard/report reads sort by soonest expiration.
create index if not exists company_insurance_documents_expiration_idx
  on public.company_insurance_documents (expiration_date);

alter table public.company_insurance_documents enable row level security;

-- Admin-only, matching contractor_insurance_documents. Contractors must NOT
-- see company policy numbers, so no contractor carve-out here.
drop policy if exists admin_only on public.company_insurance_documents;
create policy admin_only
on public.company_insurance_documents for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ── Private bucket for company records ───────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('company-documents', 'company-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Authenticated admins can read company-documents" on storage.objects;
create policy "Authenticated admins can read company-documents"
on storage.objects for select
to authenticated
using (bucket_id = 'company-documents' and public.is_admin());

drop policy if exists "Authenticated admins can upload company-documents" on storage.objects;
create policy "Authenticated admins can upload company-documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'company-documents' and public.is_admin());

drop policy if exists "Authenticated admins can update company-documents" on storage.objects;
create policy "Authenticated admins can update company-documents"
on storage.objects for update
to authenticated
using (bucket_id = 'company-documents' and public.is_admin());

drop policy if exists "Authenticated admins can delete company-documents" on storage.objects;
create policy "Authenticated admins can delete company-documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'company-documents' and public.is_admin());
