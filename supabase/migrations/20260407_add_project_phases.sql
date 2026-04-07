create table project_phases (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  sort_order integer not null,
  name text not null,
  weight integer not null default 8,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_project_phases_project on project_phases(project_id);
