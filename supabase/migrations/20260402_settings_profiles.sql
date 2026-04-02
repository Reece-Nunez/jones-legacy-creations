-- ── Company Settings (singleton row) ──────────────────────────────────────────
create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  company_email text default null,
  company_phone text default null,
  company_address text default null,
  company_city text default null,
  company_state text default 'UT',
  company_zip text default null,
  license_number text default null,
  logo_url text default null,
  website text default null,
  -- Quote defaults
  default_valid_days integer default 30,
  default_payment_terms text default null,
  -- Email settings
  email_reply_to text default null,
  email_footer_text text default null,
  -- Notifications
  notify_new_estimate boolean default true,
  notify_quote_accepted boolean default true,
  notify_draw_submitted boolean default true,
  --
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Seed a single row so we always have one to update
insert into company_settings (company_name)
values ('Jones Legacy Creations')
on conflict do nothing;

-- ── User Profiles ─────────────────────────────────────────────────────────────
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique not null,
  display_name text not null default '',
  email text not null,
  avatar_url text default null,
  role text not null default 'admin' check (role in ('owner', 'admin', 'project_manager', 'viewer')),
  phone text default null,
  title text default null,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  timezone text default 'America/Denver',
  notify_email boolean default true,
  notify_in_app boolean default true,
  is_active boolean default true,
  last_login_at timestamptz default null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for auth lookups
create index if not exists idx_user_profiles_auth_id on user_profiles (auth_id);
