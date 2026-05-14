-- ── Pin search_path on existing functions ───────────────────────────────────
-- Supabase's security advisor warns about functions whose search_path isn't
-- pinned: a caller can manipulate search_path to make the function resolve
-- to a malicious schema object. We pin every pre-existing function to the
-- standard public,pg_temp path. New functions added since the audit
-- (is_admin, recalc_quote_totals) already set search_path explicitly.

alter function public.generate_quote_number() set search_path = public, pg_temp;
alter function public.update_quickbooks_tokens_updated_at() set search_path = public, pg_temp;
alter function public.recalc_draw_amount(uuid) set search_path = public, pg_temp;
alter function public.trg_recalc_draw_amount() set search_path = public, pg_temp;
alter function public.update_updated_at() set search_path = public, pg_temp;
