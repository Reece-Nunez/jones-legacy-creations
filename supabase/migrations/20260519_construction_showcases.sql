-- ── Construction project showcases (admin-managed, public read of active) ──

create table if not exists public.construction_showcases (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                  -- URL-safe identifier for /services/construction/projects/<slug>
  title text not null,
  location text,                              -- "Hatch, UT" — free text, not normalized
  description text,
  features text[] not null default '{}',
  cover_image_url text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_construction_showcases_status_sort
  on public.construction_showcases (status, sort_order, created_at desc);

drop trigger if exists trg_construction_showcases_updated_at on public.construction_showcases;
create trigger trg_construction_showcases_updated_at
before update on public.construction_showcases
for each row execute function public.update_updated_at();

-- Per-showcase photo gallery
create table if not exists public.construction_showcase_photos (
  id uuid primary key default gen_random_uuid(),
  showcase_id uuid not null references public.construction_showcases(id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_construction_showcase_photos_showcase
  on public.construction_showcase_photos (showcase_id, sort_order);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.construction_showcases enable row level security;
alter table public.construction_showcase_photos enable row level security;

drop policy if exists "construction_showcases_admin_all" on public.construction_showcases;
create policy "construction_showcases_admin_all"
on public.construction_showcases for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "construction_showcases_public_active" on public.construction_showcases;
create policy "construction_showcases_public_active"
on public.construction_showcases for select
to anon, authenticated
using (status = 'active');

drop policy if exists "construction_showcase_photos_admin_all" on public.construction_showcase_photos;
create policy "construction_showcase_photos_admin_all"
on public.construction_showcase_photos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Photos of active showcases are publicly readable; everything else hides.
drop policy if exists "construction_showcase_photos_public_active" on public.construction_showcase_photos;
create policy "construction_showcase_photos_public_active"
on public.construction_showcase_photos for select
to anon, authenticated
using (
  exists (
    select 1 from public.construction_showcases s
    where s.id = construction_showcase_photos.showcase_id and s.status = 'active'
  )
);

-- ── Storage: dedicated public bucket for showcase photos ────────────────────
insert into storage.buckets (id, name, public)
values ('construction-photos', 'construction-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Admins can write construction-photos" on storage.objects;
create policy "Admins can write construction-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'construction-photos' and public.is_admin());

drop policy if exists "Admins can update construction-photos" on storage.objects;
create policy "Admins can update construction-photos"
on storage.objects for update
to authenticated
using (bucket_id = 'construction-photos' and public.is_admin())
with check (bucket_id = 'construction-photos' and public.is_admin());

drop policy if exists "Admins can delete construction-photos" on storage.objects;
create policy "Admins can delete construction-photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'construction-photos' and public.is_admin());

-- (We intentionally don't add a SELECT policy. Public buckets serve objects
-- via direct URL without one; not having it prevents anon from LISTING the
-- bucket via /rest/v1/storage.objects.)
