-- Add w9_required flag to contractors
-- Defaults to true for existing contractors, can be set to false
-- for contractors that don't need W9s (engineers, etc.)
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS w9_required boolean NOT NULL DEFAULT true;
