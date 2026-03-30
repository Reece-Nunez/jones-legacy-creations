-- Add property detail columns to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS square_footage integer,
  ADD COLUMN IF NOT EXISTS stories integer,
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms numeric(3,1),
  ADD COLUMN IF NOT EXISTS garage_spaces integer,
  ADD COLUMN IF NOT EXISTS finish_level text CHECK (finish_level IN ('budget','standard','mid_range','high_end')),
  ADD COLUMN IF NOT EXISTS lot_size text,
  ADD COLUMN IF NOT EXISTS flooring_preference text,
  ADD COLUMN IF NOT EXISTS countertop_preference text,
  ADD COLUMN IF NOT EXISTS cabinet_preference text;

-- Expand project_type to include estimator values
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check
  CHECK (project_type IN (
    'residential','commercial','renovation','interior_design','other',
    'new_home','addition','garage','deck_patio'
  ));
