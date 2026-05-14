-- ── Flip views to SECURITY INVOKER ───────────────────────────────────────────
-- Postgres views default to running with the privileges of the view CREATOR
-- (SECURITY DEFINER semantics), which bypasses RLS on the underlying tables.
-- Supabase's security advisor flags this because anon could SELECT these
-- views and read data RLS would otherwise block. After making RLS strict in
-- the earlier migration, these two views are now the only remaining bypass.
--
-- Postgres 15+ supports `WITH (security_invoker = true)` on views, which
-- makes the view honor the caller's RLS on the base tables. Our admin policy
-- on every base table is "auth.uid() is an active row in user_profiles" via
-- is_admin(), so admins continue to read the view normally, and anon can't.

alter view public.v_project_financials set (security_invoker = true);
alter view public.v_draw_amount_integrity set (security_invoker = true);
