-- One-to-many insurance docs per contractor. A contractor often carries
-- multiple policies (general liability, workers comp, auto) and may have
-- separate carriers for each.

CREATE TABLE IF NOT EXISTS contractor_insurance_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id uuid NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  insurance_company text,
  policy_number text,
  coverage_type text,
  expiration_date date,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contractor_insurance_contractor
  ON contractor_insurance_documents (contractor_id);

CREATE INDEX IF NOT EXISTS idx_contractor_insurance_expiration
  ON contractor_insurance_documents (expiration_date)
  WHERE expiration_date IS NOT NULL;

INSERT INTO contractor_insurance_documents
  (contractor_id, file_url, file_name, expiration_date)
SELECT
  id,
  insurance_file_url,
  COALESCE(insurance_file_name, 'insurance.pdf'),
  insurance_expiration_date
FROM contractors
WHERE insurance_file_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractor_insurance_documents cid
    WHERE cid.contractor_id = contractors.id
      AND cid.file_url = contractors.insurance_file_url
  );

ALTER TABLE contractors DROP COLUMN IF EXISTS insurance_file_url;
ALTER TABLE contractors DROP COLUMN IF EXISTS insurance_file_name;
ALTER TABLE contractors DROP COLUMN IF EXISTS insurance_expiration_date;
