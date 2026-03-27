-- ============================================
-- Jones Legacy Creations - Project Management
-- Full Database Schema
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- CONTRACTORS DIRECTORY
-- ============================================
create table contractors (
  id uuid primary key default uuid_generate_v4(),
  type text not null default 'contractor' check (type in ('contractor', 'vendor')),
  name text not null,
  company text,
  email text,
  phone text,
  trade text not null,
  license_number text,
  w9_file_url text,
  w9_file_name text,
  vendor_category text,
  account_number text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- PROJECTS
-- ============================================
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  client_name text not null,
  client_email text,
  client_phone text,
  address text,
  city text,
  state text default 'UT',
  zip text,
  status text not null default 'lead' check (status in (
    'lead', 'estimate_sent', 'approved', 'waiting_on_permit',
    'in_progress', 'waiting_on_payment', 'completed', 'archived'
  )),
  project_type text default 'residential' check (project_type in (
    'residential', 'commercial', 'renovation', 'interior_design', 'other'
  )),
  description text,
  notes text,
  estimated_value numeric(12,2),
  contract_value numeric(12,2),
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INVOICES
-- ============================================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  invoice_number text not null,
  description text,
  amount numeric(12,2) not null,
  status text not null default 'draft' check (status in (
    'draft', 'sent', 'paid', 'overdue'
  )),
  due_date date,
  paid_date date,
  created_at timestamptz default now()
);

-- ============================================
-- CONTRACTOR PAYMENTS
-- ============================================
create table contractor_payments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  contractor_id uuid references contractors(id) on delete set null,
  contractor_name text not null,
  description text,
  amount numeric(12,2) not null,
  status text not null default 'pending' check (status in (
    'pending', 'paid'
  )),
  due_date date,
  paid_date date,
  invoice_file_url text,
  invoice_file_name text,
  created_at timestamptz default now()
);

-- ============================================
-- DRAW REQUESTS (investor financing)
-- ============================================
create table draw_requests (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  draw_number integer not null,
  description text,
  amount numeric(12,2) not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'approved', 'funded', 'denied'
  )),
  submitted_date date,
  funded_date date,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- PERMITS
-- ============================================
create table permits (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  permit_type text not null,
  permit_number text,
  status text not null default 'not_applied' check (status in (
    'not_applied', 'applied', 'approved', 'denied', 'expired'
  )),
  applied_date date,
  approved_date date,
  expiry_date date,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- DOCUMENTS / FILES
-- ============================================
create table documents (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size integer,
  category text default 'general' check (category in (
    'contract', 'permit', 'invoice', 'photo', 'plan', 'draw_request', 'general'
  )),
  created_at timestamptz default now()
);

-- ============================================
-- TASKS / CHECKLIST
-- ============================================
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  completed boolean default false,
  due_date date,
  assigned_to text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  action text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ============================================
-- ESTIMATES / BIDS (public-facing)
-- ============================================
create table estimates (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null,
  client_email text not null,
  client_phone text,
  project_type text not null,
  description text not null,
  address text,
  city text,
  state text default 'UT',
  zip text,
  square_footage integer,
  budget_range text,
  timeline text,
  estimated_min numeric(12,2),
  estimated_max numeric(12,2),
  status text not null default 'new' check (status in (
    'new', 'reviewed', 'converted', 'declined'
  )),
  project_id uuid references projects(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_contractors_trade on contractors(trade);
create index idx_projects_status on projects(status);
create index idx_projects_type on projects(project_type);
create index idx_invoices_project on invoices(project_id);
create index idx_invoices_status on invoices(status);
create index idx_contractor_payments_project on contractor_payments(project_id);
create index idx_contractor_payments_contractor on contractor_payments(contractor_id);
create index idx_draw_requests_project on draw_requests(project_id);
create index idx_draw_requests_status on draw_requests(status);
create index idx_permits_project on permits(project_id);
create index idx_documents_project on documents(project_id);
create index idx_tasks_project on tasks(project_id);
create index idx_activity_log_project on activity_log(project_id);
create index idx_activity_log_created on activity_log(created_at);
create index idx_estimates_status on estimates(status);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger contractors_updated_at
  before update on contractors
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- (Open for now — no auth yet)
-- ============================================
alter table contractors enable row level security;
alter table projects enable row level security;
alter table invoices enable row level security;
alter table contractor_payments enable row level security;
alter table draw_requests enable row level security;
alter table permits enable row level security;
alter table documents enable row level security;
alter table tasks enable row level security;
alter table activity_log enable row level security;
alter table estimates enable row level security;

create policy "Allow all on contractors" on contractors for all using (true) with check (true);
create policy "Allow all on projects" on projects for all using (true) with check (true);
create policy "Allow all on invoices" on invoices for all using (true) with check (true);
create policy "Allow all on contractor_payments" on contractor_payments for all using (true) with check (true);
create policy "Allow all on draw_requests" on draw_requests for all using (true) with check (true);
create policy "Allow all on permits" on permits for all using (true) with check (true);
create policy "Allow all on documents" on documents for all using (true) with check (true);
create policy "Allow all on tasks" on tasks for all using (true) with check (true);
create policy "Allow all on activity_log" on activity_log for all using (true) with check (true);
create policy "Allow all on estimates" on estimates for all using (true) with check (true);
