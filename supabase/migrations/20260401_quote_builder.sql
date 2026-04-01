-- ============================================
-- Quote Builder System
-- Migration: 20260401
-- ============================================

-- ============================================
-- QUOTE JOB TYPES (reference table)
-- ============================================
create table quote_job_types (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE TEMPLATES
-- ============================================
create table quote_templates (
  id uuid primary key default uuid_generate_v4(),
  job_type_slug text not null references quote_job_types(slug),
  name text not null,
  description text,
  sections jsonb,
  default_exclusions jsonb,
  default_allowances jsonb,
  default_pricing_controls jsonb,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- QUOTES (main quote/estimate record)
-- ============================================
create table quotes (
  id uuid primary key default uuid_generate_v4(),
  quote_number text unique not null,
  project_id uuid references projects(id) on delete set null,
  job_type_slug text not null references quote_job_types(slug),
  template_id uuid references quote_templates(id) on delete set null,
  estimate_stage text not null default 'ballpark' check (estimate_stage in (
    'ballpark', 'detailed', 'final'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'in_progress', 'pending_sub_bids', 'review',
    'sent', 'accepted', 'declined', 'expired', 'revised'
  )),
  revision_number integer default 1,
  parent_quote_id uuid references quotes(id) on delete set null,

  -- Client / project info (denormalized for standalone quotes)
  client_name text,
  client_email text,
  client_phone text,
  project_name text,
  address text,
  city text,
  county text,
  state text default 'UT',
  zip text,
  parcel_lot_info text,

  -- Project details
  occupied_or_vacant text check (occupied_or_vacant in ('occupied', 'vacant', 'unknown')),
  financing_required boolean,
  target_start_date date,
  desired_completion_date date,
  plans_available text check (plans_available in ('yes', 'no', 'partial')),
  engineering_available text check (engineering_available in ('yes', 'no', 'needed')),
  permit_status text check (permit_status in (
    'not_needed', 'not_applied', 'applied', 'approved', 'unknown'
  )),
  utilities_status text check (utilities_status in (
    'available', 'partial', 'none', 'unknown'
  )),
  owner_supplied_materials text,
  scope_summary text,
  included_scope text,
  excluded_scope text,
  notes text,

  -- Pricing controls
  labor_burden_pct numeric(5,2) default 0,
  overhead_pct numeric(5,2) default 10,
  profit_pct numeric(5,2) default 10,
  contingency_pct numeric(5,2) default 5,
  sales_tax_pct numeric(5,2) default 0,
  permit_allowance numeric(12,2) default 0,
  dumpster_allowance numeric(12,2) default 0,
  equipment_allowance numeric(12,2) default 0,
  cleanup_allowance numeric(12,2) default 0,

  -- Totals (calculated, stored for performance)
  subtotal numeric(12,2) default 0,
  total_materials numeric(12,2) default 0,
  total_labor numeric(12,2) default 0,
  total_subcontractor numeric(12,2) default 0,
  total_equipment numeric(12,2) default 0,
  overhead_amount numeric(12,2) default 0,
  profit_amount numeric(12,2) default 0,
  contingency_amount numeric(12,2) default 0,
  tax_amount numeric(12,2) default 0,
  grand_total numeric(12,2) default 0,

  -- Quote output
  valid_through_date date,
  payment_schedule jsonb,
  change_order_language text,

  -- Job-type-specific inputs stored as JSONB
  job_type_inputs jsonb default '{}',

  -- Metadata
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- QUOTE SECTIONS (cost categories)
-- ============================================
create table quote_sections (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  category_slug text not null,
  name text not null,
  sort_order integer default 0,
  is_visible_to_client boolean default true,
  subtotal numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE ITEMS (line items within sections)
-- ============================================
create table quote_items (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  section_id uuid not null references quote_sections(id) on delete cascade,
  description text,
  quantity numeric(10,2) default 1,
  unit text check (unit in (
    'ea', 'sf', 'lf', 'sy', 'hr', 'day', 'ls', 'ton', 'cy', 'gal'
  )),
  material_cost numeric(12,2) default 0,
  labor_cost numeric(12,2) default 0,
  equipment_cost numeric(12,2) default 0,
  subcontractor_cost numeric(12,2) default 0,
  markup_pct numeric(5,2) default 0,
  tax numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  is_internal_only boolean default false,
  is_allowance boolean default false,
  is_vendor_quote_required boolean default false,
  vendor_quote_status text default 'not_needed' check (vendor_quote_status in (
    'not_needed', 'pending', 'received', 'expired'
  )),
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE EXCLUSIONS
-- ============================================
create table quote_exclusions (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  exclusion_text text not null,
  category text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- EXCLUSION LIBRARY (reusable templates)
-- ============================================
create table exclusion_library (
  id uuid primary key default uuid_generate_v4(),
  text text not null,
  category text,
  applicable_job_types text[],
  active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE ALLOWANCES
-- ============================================
create table quote_allowances (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  category text,
  description text,
  amount numeric(12,2),
  notes text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- ALLOWANCE PACKAGES (reusable templates)
-- ============================================
create table allowance_packages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  items jsonb,
  applicable_job_types text[],
  active boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE VENDOR QUOTES
-- ============================================
create table quote_vendor_quotes (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  quote_item_id uuid references quote_items(id) on delete set null,
  contractor_id uuid references contractors(id) on delete set null,
  vendor_name text,
  scope_description text,
  amount numeric(12,2),
  status text not null default 'requested' check (status in (
    'requested', 'received', 'accepted', 'declined', 'expired'
  )),
  received_date date,
  expiry_date date,
  file_url text,
  file_name text,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE RISK FLAGS
-- ============================================
create table quote_risk_flags (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  flag_type text not null,
  severity text not null default 'info' check (severity in (
    'info', 'warning', 'critical'
  )),
  description text,
  resolved boolean default false,
  resolution_notes text,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE REVISIONS (history)
-- ============================================
create table quote_revisions (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  revision_number integer not null,
  changed_by text,
  change_summary text,
  snapshot jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE FILES
-- ============================================
create table quote_files (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  category text check (category in (
    'photo', 'plan', 'vendor_quote', 'inspection', 'engineering', 'permit', 'other'
  )),
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- QUOTE OUTPUTS (generated proposals)
-- ============================================
create table quote_outputs (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references quotes(id) on delete cascade,
  revision_number integer,
  output_type text not null check (output_type in (
    'proposal', 'summary', 'detailed'
  )),
  content jsonb,
  pdf_url text,
  sent_to_client boolean default false,
  sent_date timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_quote_templates_job_type on quote_templates(job_type_slug);
create index idx_quotes_project on quotes(project_id);
create index idx_quotes_job_type on quotes(job_type_slug);
create index idx_quotes_template on quotes(template_id);
create index idx_quotes_status on quotes(status);
create index idx_quotes_quote_number on quotes(quote_number);
create index idx_quotes_parent on quotes(parent_quote_id);
create index idx_quote_sections_quote on quote_sections(quote_id);
create index idx_quote_items_quote on quote_items(quote_id);
create index idx_quote_items_section on quote_items(section_id);
create index idx_quote_exclusions_quote on quote_exclusions(quote_id);
create index idx_quote_allowances_quote on quote_allowances(quote_id);
create index idx_quote_vendor_quotes_quote on quote_vendor_quotes(quote_id);
create index idx_quote_vendor_quotes_item on quote_vendor_quotes(quote_item_id);
create index idx_quote_vendor_quotes_contractor on quote_vendor_quotes(contractor_id);
create index idx_quote_risk_flags_quote on quote_risk_flags(quote_id);
create index idx_quote_revisions_quote on quote_revisions(quote_id);
create index idx_quote_files_quote on quote_files(quote_id);
create index idx_quote_outputs_quote on quote_outputs(quote_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
create trigger quote_templates_updated_at
  before update on quote_templates
  for each row execute function update_updated_at();

create trigger quotes_updated_at
  before update on quotes
  for each row execute function update_updated_at();

-- ============================================
-- QUOTE NUMBER AUTO-GENERATION
-- ============================================
create or replace function generate_quote_number()
returns trigger as $$
declare
  current_year text;
  next_seq integer;
begin
  current_year := to_char(now(), 'YYYY');

  select coalesce(max(
    cast(substring(quote_number from 10 for 4) as integer)
  ), 0) + 1
  into next_seq
  from quotes
  where quote_number like 'QTE-' || current_year || '-%';

  new.quote_number := 'QTE-' || current_year || '-' || lpad(next_seq::text, 4, '0');
  return new;
end;
$$ language plpgsql;

create trigger quotes_auto_number
  before insert on quotes
  for each row
  when (new.quote_number is null or new.quote_number = '')
  execute function generate_quote_number();

-- ============================================
-- ROW LEVEL SECURITY
-- (Open for now - no auth yet)
-- ============================================
alter table quote_job_types enable row level security;
alter table quote_templates enable row level security;
alter table quotes enable row level security;
alter table quote_sections enable row level security;
alter table quote_items enable row level security;
alter table quote_exclusions enable row level security;
alter table exclusion_library enable row level security;
alter table quote_allowances enable row level security;
alter table allowance_packages enable row level security;
alter table quote_vendor_quotes enable row level security;
alter table quote_risk_flags enable row level security;
alter table quote_revisions enable row level security;
alter table quote_files enable row level security;
alter table quote_outputs enable row level security;

create policy "Allow all on quote_job_types" on quote_job_types for all using (true) with check (true);
create policy "Allow all on quote_templates" on quote_templates for all using (true) with check (true);
create policy "Allow all on quotes" on quotes for all using (true) with check (true);
create policy "Allow all on quote_sections" on quote_sections for all using (true) with check (true);
create policy "Allow all on quote_items" on quote_items for all using (true) with check (true);
create policy "Allow all on quote_exclusions" on quote_exclusions for all using (true) with check (true);
create policy "Allow all on exclusion_library" on exclusion_library for all using (true) with check (true);
create policy "Allow all on quote_allowances" on quote_allowances for all using (true) with check (true);
create policy "Allow all on allowance_packages" on allowance_packages for all using (true) with check (true);
create policy "Allow all on quote_vendor_quotes" on quote_vendor_quotes for all using (true) with check (true);
create policy "Allow all on quote_risk_flags" on quote_risk_flags for all using (true) with check (true);
create policy "Allow all on quote_revisions" on quote_revisions for all using (true) with check (true);
create policy "Allow all on quote_files" on quote_files for all using (true) with check (true);
create policy "Allow all on quote_outputs" on quote_outputs for all using (true) with check (true);

-- ============================================
-- SEED: JOB TYPES
-- ============================================
insert into quote_job_types (slug, name, description, sort_order) values
  ('new_construction', 'New Construction', 'Ground-up new home or building construction', 1),
  ('takeover', 'Takeover', 'Taking over an incomplete or abandoned project from another contractor', 2),
  ('addition', 'Addition', 'Adding new space to an existing structure', 3),
  ('remodel', 'Remodel', 'Renovating or remodeling existing interior or exterior spaces', 4),
  ('shop_storage', 'Shop / Storage', 'Detached shop, garage, or storage building construction', 5),
  ('repair_punch', 'Repair / Punch List', 'Small repairs, punch list items, or warranty work', 6);

-- ============================================
-- SEED: EXCLUSION LIBRARY
-- ============================================
insert into exclusion_library (text, category, applicable_job_types, sort_order) values
  -- Scope exclusions (general)
  ('Landscaping, irrigation, and final grading', 'scope', '{new_construction,addition,remodel}', 1),
  ('Fencing and retaining walls', 'scope', '{new_construction,addition}', 2),
  ('Window coverings and treatments', 'scope', '{new_construction,remodel}', 3),
  ('Furniture, decor, and staging', 'scope', '{new_construction,remodel}', 4),
  ('Low-voltage wiring (security, audio, networking)', 'scope', '{new_construction,remodel,addition}', 5),
  ('Solar panel installation', 'scope', '{new_construction,remodel,addition}', 6),
  ('Driveway and flatwork beyond specified scope', 'scope', '{new_construction,addition}', 7),
  ('Swimming pool, hot tub, or water features', 'scope', '{new_construction,remodel}', 8),

  -- Conditions exclusions
  ('Unforeseen structural deficiencies or hidden damage', 'conditions', '{remodel,takeover,addition}', 10),
  ('Asbestos, lead paint, or hazardous material abatement', 'conditions', '{remodel,takeover}', 11),
  ('Soil remediation or environmental cleanup', 'conditions', '{new_construction,addition}', 12),
  ('Rock excavation beyond normal soil conditions', 'conditions', '{new_construction,addition}', 13),
  ('Work required due to existing code violations', 'conditions', '{takeover,remodel}', 14),
  ('Mold remediation', 'conditions', '{remodel,takeover}', 15),

  -- Warranty exclusions
  ('Warranty on owner-supplied materials or appliances', 'warranty', '{new_construction,remodel,addition}', 20),
  ('Warranty on work performed by others or prior contractors', 'warranty', '{takeover}', 21),
  ('Natural settling, shrinkage cracks, or nail pops after 1 year', 'warranty', '{new_construction,addition}', 22),

  -- Liability exclusions
  ('Damage to existing landscaping during construction', 'liability', '{addition,remodel}', 30),
  ('Damage to existing finishes in occupied areas', 'liability', '{remodel,addition}', 31),
  ('Delays caused by owner-directed changes or late decisions', 'liability', '{new_construction,remodel,addition,takeover}', 32),

  -- Schedule exclusions
  ('Delays due to weather, material shortages, or supply chain issues', 'schedule', '{new_construction,remodel,addition,takeover}', 40),
  ('Delays due to municipal permitting or inspection timelines', 'schedule', '{new_construction,addition}', 41),
  ('Weekend or after-hours work (available at additional cost)', 'schedule', '{new_construction,remodel,addition,takeover}', 42),

  -- Takeover-specific
  ('Correction of defects or non-code-compliant work by prior contractor', 'scope', '{takeover}', 50),
  ('Investigation or forensic assessment of prior work beyond initial walkthrough', 'scope', '{takeover}', 51),
  ('Warranty on any portion of work completed by prior contractor', 'warranty', '{takeover}', 52);

-- ============================================
-- SEED: ALLOWANCE PACKAGES
-- ============================================
insert into allowance_packages (name, description, items, applicable_job_types) values
  (
    'Standard New Construction Allowances',
    'Default allowance package for new residential construction',
    '[
      {"category": "cabinets", "description": "Kitchen and bathroom cabinetry", "amount": 15000},
      {"category": "countertops", "description": "Kitchen and bathroom countertops", "amount": 5000},
      {"category": "flooring", "description": "All flooring materials", "amount": 12000},
      {"category": "appliances", "description": "Kitchen appliance package", "amount": 5000},
      {"category": "lighting", "description": "Light fixtures throughout", "amount": 3500},
      {"category": "plumbing_fixtures", "description": "Faucets, sinks, shower fixtures", "amount": 3000},
      {"category": "tile", "description": "Shower and backsplash tile", "amount": 4000},
      {"category": "hardware", "description": "Door and cabinet hardware", "amount": 1500},
      {"category": "landscaping", "description": "Basic front yard landscaping", "amount": 5000},
      {"category": "driveway_flatwork", "description": "Driveway and walkways", "amount": 8000}
    ]'::jsonb,
    '{new_construction}'
  );
