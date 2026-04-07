ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
