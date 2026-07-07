-- ── Contractor project-scoped access ──────────────────────────────────────────
-- Introduces a "contractor" role: an external subcontractor who signs in with
-- Google OAuth but only sees the project(s) explicitly granted to them.
--
-- Design:
--   • user_profiles.role gains 'contractor'.
--   • project_access maps a contractor's profile → the projects they may see.
--   • is_admin() is TIGHTENED to exclude contractors. Because every existing
--     "admin_only" policy is defined as `using (is_admin())`, this single
--     change stops contractors inheriting blanket staff access — no need to
--     touch those policies.
--   • has_project_access(project_id) = staff OR a matching grant. New scoped
--     SELECT policies on the project-facing tables use it, layered ON TOP of
--     the staff admin policies (Postgres ORs permissive policies), plus a
--     narrow INSERT-on-documents / UPDATE-on-tasks for the "view + limited
--     uploads" tier.
--   • Storage: contractors may read/write files under their project's folder
--     in the private project-documents bucket (path = "<project_id>/<file>").

-- ── 1. Role constraint ────────────────────────────────────────────────────────
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check
  check (role = any (array[
    'technical_director','owner','project_manager','office_manager','office_admin','contractor'
  ]));

-- ── 2. Grants table ───────────────────────────────────────────────────────────
create table if not exists public.project_access (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null,
  unique (user_profile_id, project_id)
);
create index if not exists project_access_profile_idx on public.project_access(user_profile_id);
create index if not exists project_access_project_idx on public.project_access(project_id);

-- ── 3. Helper functions ───────────────────────────────────────────────────────
-- is_admin(): active STAFF member (any role EXCEPT contractor). Redefining it
-- here is what demotes contractors out of every existing admin_only policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_profiles
    where auth_id = auth.uid()
      and is_active = true
      and role <> 'contractor'
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- has_project_access(pid): staff see everything; contractors see only the
-- projects granted to them. SECURITY DEFINER so it can read project_access /
-- user_profiles regardless of the caller's own RLS.
create or replace function public.has_project_access(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists(
    select 1
    from public.project_access pa
    join public.user_profiles up on up.id = pa.user_profile_id
    where up.auth_id = auth.uid()
      and up.is_active = true
      and pa.project_id = pid
  );
$$;
revoke all on function public.has_project_access(uuid) from public;
grant execute on function public.has_project_access(uuid) to authenticated;

-- ── 4. project_access RLS ─────────────────────────────────────────────────────
alter table public.project_access enable row level security;

drop policy if exists "project_access_admin_all" on public.project_access;
create policy "project_access_admin_all" on public.project_access
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- A contractor may read their own grant rows (so the app can resolve which
-- projects to show them) but never write them.
drop policy if exists "project_access_self_read" on public.project_access;
create policy "project_access_self_read" on public.project_access
  for select to authenticated
  using (exists(
    select 1 from public.user_profiles up
    where up.id = user_profile_id and up.auth_id = auth.uid()
  ));

-- ── 5. Scoped SELECT on project-facing tables ─────────────────────────────────
-- Additive to the staff admin policies. has_project_access() returns true for
-- staff too, so these are a no-op for staff and the gate for contractors.
do $$
declare
  t text;
  proj_tables text[] := array[
    'activity_log','budget_line_items','contractor_payments','documents',
    'draw_requests','estimates','invoices','loan_ledger','permits',
    'project_contractors','project_misc_charges','project_phases',
    'project_settlements','quotes','tasks'
  ];
begin
  foreach t in array proj_tables loop
    execute format('drop policy if exists %I on public.%I', 'contractor_project_read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_project_access(project_id))',
      'contractor_project_read', t
    );
  end loop;
end $$;

-- projects: scope by the row's own id.
drop policy if exists "contractor_project_read" on public.projects;
create policy "contractor_project_read" on public.projects
  for select to authenticated
  using (public.has_project_access(id));

-- contractors directory: a contractor may see only the contractor/vendor
-- records tied to a project they can access, so payment rows resolve names.
drop policy if exists "contractor_project_read" on public.contractors;
create policy "contractor_project_read" on public.contractors
  for select to authenticated
  using (
    exists(select 1 from public.contractor_payments cp
           where cp.contractor_id = contractors.id and public.has_project_access(cp.project_id))
    or exists(select 1 from public.project_contractors pc
           where pc.contractor_id = contractors.id and public.has_project_access(pc.project_id))
  );

-- ── 6. Limited write for contractors ──────────────────────────────────────────
-- Upload documents to their project.
drop policy if exists "contractor_document_insert" on public.documents;
create policy "contractor_document_insert" on public.documents
  for insert to authenticated
  with check (public.has_project_access(project_id));

-- Update tasks on their project (e.g. mark status). Column-level restriction
-- is enforced at the app layer; RLS scopes it to the granted project.
drop policy if exists "contractor_task_update" on public.tasks;
create policy "contractor_task_update" on public.tasks
  for update to authenticated
  using (public.has_project_access(project_id))
  with check (public.has_project_access(project_id));

-- ── 7. Storage: project-documents scoped to the project folder ────────────────
-- Path convention is "<project_id>/<file>" (see the documents POST route).
-- Safe parse: return false (not error) if the first segment isn't a uuid, so
-- legacy/oddly-named objects never break policy evaluation.
create or replace function public.can_access_project_file(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  pid uuid;
begin
  begin
    pid := split_part(object_name, '/', 1)::uuid;
  exception when others then
    return false;
  end;
  return public.has_project_access(pid);
end;
$$;
revoke all on function public.can_access_project_file(text) from public;
grant execute on function public.can_access_project_file(text) to authenticated;

drop policy if exists "Contractors can read their project-documents" on storage.objects;
create policy "Contractors can read their project-documents"
on storage.objects for select to authenticated
using (bucket_id = 'project-documents' and public.can_access_project_file(name));

drop policy if exists "Contractors can write their project-documents" on storage.objects;
create policy "Contractors can write their project-documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-documents' and public.can_access_project_file(name));
