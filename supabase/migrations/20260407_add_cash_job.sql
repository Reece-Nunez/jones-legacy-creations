ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS is_cash_job boolean NOT NULL DEFAULT false;
