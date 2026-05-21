-- ── Add URL slug to real_estate_listings for the public detail page ────────

alter table public.real_estate_listings
  add column if not exists slug text;

-- Backfill any existing rows. Build a slug from address-city-state and append
-- the first 6 chars of the id to guarantee uniqueness without per-row checks.
update public.real_estate_listings
set slug = regexp_replace(
  lower(
    regexp_replace(
      coalesce(address,'') || '-' || coalesce(city,'') || '-' || coalesce(state,''),
      '[^a-zA-Z0-9]+', '-', 'g'
    )
  ),
  '(^-+|-+$)', '', 'g'
) || '-' || substring(id::text from 1 for 6)
where slug is null;

alter table public.real_estate_listings
  alter column slug set not null;

create unique index if not exists idx_real_estate_listings_slug
  on public.real_estate_listings (slug);
