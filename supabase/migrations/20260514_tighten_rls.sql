-- ── Tighten Row-Level Security ────────────────────────────────────────────────
-- Before this migration:
--   • Many public tables had RLS disabled entirely (silent leak via REST).
--   • Tables that had RLS on used "Allow all on X using (true)" policies,
--     making them readable/writable by anyone with the public anon key.
--
-- After this migration:
--   • RLS is ENABLED on every public table.
--   • Every table (except user_profiles) is admin-only via is_admin().
--   • user_profiles allows authed users to read the team and manage their
--     own row; admins can manage any row.
--   • Service-role clients (used by webhooks and the public submit-*
--     endpoints) bypass RLS as before.

-- ── Helper: is_admin() ────────────────────────────────────────────────────────
-- SECURITY DEFINER lets the function read user_profiles regardless of the
-- caller's own RLS, avoiding recursion when policies reference it.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_profiles
    where auth_id = auth.uid() and is_active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── Enable RLS + drop legacy permissive policies + add admin policies ─────────
do $$
declare
  t text;
  admin_tables text[] := array[
    'activity_log',
    'allowance_packages',
    'budget_line_items',
    'company_settings',
    'contractor_insurance_documents',
    'contractor_payments',
    'contractors',
    'custom_trades',
    'dd_authorization_records',
    'dd_invite_tokens',
    'documents',
    'draw_requests',
    'estimates',
    'exclusion_library',
    'invoice_upload_tokens',
    'invoices',
    'permits',
    'project_contractors',
    'project_phases',
    'projects',
    'qbo_webhook_events',
    'quickbooks_entity_map',
    'quickbooks_tokens',
    'quote_allowances',
    'quote_exclusions',
    'quote_files',
    'quote_items',
    'quote_job_types',
    'quote_outputs',
    'quote_revisions',
    'quote_risk_flags',
    'quote_sections',
    'quote_templates',
    'quote_vendor_quotes',
    'quotes',
    'tasks'
  ];
begin
  foreach t in array admin_tables loop
    -- Drop legacy permissive policy if present
    execute format('drop policy if exists %I on public.%I', 'Allow all on ' || t, t);
    -- Drop our own policy in case the migration is re-run
    execute format('drop policy if exists %I on public.%I', 'admin_only', t);
    -- Enable RLS
    execute format('alter table public.%I enable row level security', t);
    -- Admin-only policy: any authed row in user_profiles + is_active
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'admin_only', t
    );
  end loop;
end $$;

-- ── user_profiles: special policies ───────────────────────────────────────────
-- Anyone authed can read profiles (needed for team list, avatars, etc.).
-- Inserts allowed for self (profile auto-create) or admin (team management).
-- Updates/deletes restricted to self-or-admin.

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select" on public.user_profiles;
drop policy if exists "user_profiles_insert" on public.user_profiles;
drop policy if exists "user_profiles_update" on public.user_profiles;
drop policy if exists "user_profiles_delete" on public.user_profiles;

create policy "user_profiles_select" on public.user_profiles
  for select to authenticated
  using (true);

create policy "user_profiles_insert" on public.user_profiles
  for insert to authenticated
  with check (auth.uid() = auth_id or public.is_admin());

create policy "user_profiles_update" on public.user_profiles
  for update to authenticated
  using (auth.uid() = auth_id or public.is_admin())
  with check (auth.uid() = auth_id or public.is_admin());

create policy "user_profiles_delete" on public.user_profiles
  for delete to authenticated
  using (public.is_admin());
