-- Add 'takeover' to the project_type check constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check
  CHECK (project_type IN (
    'residential','commercial','renovation','interior_design','other',
    'new_home','takeover','addition','garage','deck_patio'
  ));
