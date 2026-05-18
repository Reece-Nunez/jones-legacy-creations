-- ── Real estate listings (admin-managed, public read of active rows) ────────

create table if not exists public.real_estate_listings (
  id uuid primary key default gen_random_uuid(),

  address text not null,
  city text not null,
  state text not null default 'UT',
  zip text,

  price numeric(12,2),
  bedrooms integer,
  bathrooms numeric(3,1),
  square_footage integer,
  lot_size text,
  property_type text check (property_type in (
    'single_family', 'townhome', 'condo', 'land', 'multi_family', 'other'
  )),

  mls_url text,
  cover_photo_url text,
  description text,

  status text not null default 'draft' check (status in (
    'draft', 'active', 'pending', 'sold', 'archived'
  )),
  sort_order integer not null default 0,
  featured boolean not null default false,
  listed_at date,

  created_by uuid references public.user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_real_estate_listings_status
  on public.real_estate_listings (status);
create index if not exists idx_real_estate_listings_sort
  on public.real_estate_listings (sort_order, created_at desc);

-- Keep updated_at fresh
drop trigger if exists trg_real_estate_listings_updated_at on public.real_estate_listings;
create trigger trg_real_estate_listings_updated_at
before update on public.real_estate_listings
for each row execute function public.update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.real_estate_listings enable row level security;

drop policy if exists "real_estate_listings_admin_all" on public.real_estate_listings;
create policy "real_estate_listings_admin_all"
on public.real_estate_listings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Public can see active + pending listings only (so drafts and sold/archived
-- stay invisible from the website).
drop policy if exists "real_estate_listings_public_active" on public.real_estate_listings;
create policy "real_estate_listings_public_active"
on public.real_estate_listings for select
to anon, authenticated
using (status in ('active', 'pending'));

-- ── Storage: dedicated public bucket for listing photos ─────────────────────
insert into storage.buckets (id, name, public)
values ('real-estate-photos', 'real-estate-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Real-estate photos public read" on storage.objects;
create policy "Real-estate photos public read"
on storage.objects for select
to public
using (bucket_id = 'real-estate-photos');

drop policy if exists "Admins can write real-estate-photos" on storage.objects;
create policy "Admins can write real-estate-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'real-estate-photos' and public.is_admin());

drop policy if exists "Admins can update real-estate-photos" on storage.objects;
create policy "Admins can update real-estate-photos"
on storage.objects for update
to authenticated
using (bucket_id = 'real-estate-photos' and public.is_admin())
with check (bucket_id = 'real-estate-photos' and public.is_admin());

drop policy if exists "Admins can delete real-estate-photos" on storage.objects;
create policy "Admins can delete real-estate-photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'real-estate-photos' and public.is_admin());
