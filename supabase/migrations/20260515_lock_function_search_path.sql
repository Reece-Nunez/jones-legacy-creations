-- ── Lock function search_path ────────────────────────────────────────────────
-- Supabase advisor warns when SECURITY DEFINER (or trigger) functions don't
-- pin search_path. Without a fixed search_path, a malicious user with the
-- ability to create schemas could shadow a built-in function and have the
-- definer-owned function execute attacker-controlled code. We resolve every
-- ref against `public` (and `pg_temp` last) to remove the ambiguity.

alter function public.generate_quote_number() set search_path = public, pg_temp;
alter function public.update_quickbooks_tokens_updated_at() set search_path = public, pg_temp;
alter function public.recalc_draw_amount(uuid) set search_path = public, pg_temp;
alter function public.trg_recalc_draw_amount() set search_path = public, pg_temp;
alter function public.update_updated_at() set search_path = public, pg_temp;
