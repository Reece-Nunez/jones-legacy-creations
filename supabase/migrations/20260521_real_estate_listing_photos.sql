-- ── Per-listing photo gallery (admin-managed, public read of active rows) ──

create table if not exists public.real_estate_listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.real_estate_listings(id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_real_estate_listing_photos_listing
  on public.real_estate_listing_photos (listing_id, sort_order);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.real_estate_listing_photos enable row level security;

drop policy if exists "real_estate_listing_photos_admin_all" on public.real_estate_listing_photos;
create policy "real_estate_listing_photos_admin_all"
on public.real_estate_listing_photos for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Photos of public-visible listings (active or pending) are publicly readable,
-- matching the listing row's own public-read policy.
drop policy if exists "real_estate_listing_photos_public_active" on public.real_estate_listing_photos;
create policy "real_estate_listing_photos_public_active"
on public.real_estate_listing_photos for select
to anon, authenticated
using (
  exists (
    select 1 from public.real_estate_listings l
    where l.id = real_estate_listing_photos.listing_id
      and l.status in ('active', 'pending')
  )
);

-- The 'real-estate-photos' storage bucket and its admin-write policies were
-- created in 20260515_real_estate_listings.sql, so nothing to add here.
