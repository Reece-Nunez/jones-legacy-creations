-- Proof of insurance tracking per contractor.
ALTER TABLE contractors
  ADD COLUMN IF NOT EXISTS insurance_file_url text,
  ADD COLUMN IF NOT EXISTS insurance_file_name text,
  ADD COLUMN IF NOT EXISTS insurance_expiration_date date;
