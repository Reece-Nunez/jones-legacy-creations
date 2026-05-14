-- ── Lock down the contractor-w9 bucket ───────────────────────────────────────
-- contractor-w9 stores W-9 forms (with EINs/SSNs) and insurance COIs. Before
-- this migration the bucket was public AND had a SELECT policy granting reads
-- to the anonymous role, so anyone with a stored file URL could fetch the
-- document without authentication.
--
-- After this migration:
--   • bucket.public = false (Supabase will refuse direct .../object/public/...
--     access for the bucket)
--   • The public-read policy is dropped.
--   • A new policy allows authenticated admins (via is_admin()) to read,
--     which lets our cookie-bound server routes work.
--   • Service-role clients bypass RLS as before — used by the /api/admin/
--     contractors W-9 endpoints and the W-9 download redirect endpoint to
--     mint short-lived signed URLs for browsers.

update storage.buckets set public = false where id = 'contractor-w9';

drop policy if exists "Allow public reads on contractor-w9" on storage.objects;

drop policy if exists "Authenticated admins can read contractor-w9" on storage.objects;
create policy "Authenticated admins can read contractor-w9"
on storage.objects for select
to authenticated
using (bucket_id = 'contractor-w9' and public.is_admin());
