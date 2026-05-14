-- ── Lock down the project-documents bucket ──────────────────────────────────
-- project-documents holds invoices, receipts, permits, project photos, and
-- other uploads. Pre-this-migration the bucket was public and had open
-- INSERT/SELECT/UPDATE/DELETE policies on storage.objects, so anyone with
-- a stored URL could fetch any file without auth — including invoices that
-- expose vendor pricing.
--
-- After this migration:
--   • bucket.public = false (no anon access via /object/public/...)
--   • All four open "Allow all …" policies on project-documents dropped
--   • New SELECT/INSERT/UPDATE/DELETE policies require is_admin()
--   • Service-role clients (used by webhooks and public submit-* endpoints)
--     bypass RLS as before — and routes that need to serve files to admin
--     browsers do so via short-lived signed URLs.
--
-- Note: the public gallery endpoint already runs server-side and now mints
-- signed URLs for the photos it returns. The data column file_url still
-- holds the legacy public URL pattern; we parse the storage path out of it.

update storage.buckets set public = false where id = 'project-documents';

drop policy if exists "Allow all reads" on storage.objects;
drop policy if exists "Allow all uploads" on storage.objects;
drop policy if exists "Allow all updates" on storage.objects;
drop policy if exists "Allow all deletes" on storage.objects;

drop policy if exists "Authenticated admins can read project-documents" on storage.objects;
create policy "Authenticated admins can read project-documents"
on storage.objects for select
to authenticated
using (bucket_id = 'project-documents' and public.is_admin());

drop policy if exists "Authenticated admins can write project-documents" on storage.objects;
create policy "Authenticated admins can write project-documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'project-documents' and public.is_admin());

drop policy if exists "Authenticated admins can update project-documents" on storage.objects;
create policy "Authenticated admins can update project-documents"
on storage.objects for update
to authenticated
using (bucket_id = 'project-documents' and public.is_admin())
with check (bucket_id = 'project-documents' and public.is_admin());

drop policy if exists "Authenticated admins can delete project-documents" on storage.objects;
create policy "Authenticated admins can delete project-documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'project-documents' and public.is_admin());
