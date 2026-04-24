-- Explicit financing model per project.
--   external_loan   (default) — a 3rd-party lender. Interest and origination
--                               fees are costs to Blake.
--   seller_financed            — Blake IS the lender. Interest and origination
--                               fees are revenue to Blake.
--   cash                       — No financing. No draws, no interest, no fee.
--
-- is_cash_job stays in place as a convenience flag (UI in a lot of places
-- branches on it). The two fields are kept in sync by the app layer.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS financing_type text NOT NULL
    DEFAULT 'external_loan';

ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_financing_type_check;
ALTER TABLE projects
  ADD CONSTRAINT projects_financing_type_check
    CHECK (financing_type = ANY (ARRAY['external_loan'::text, 'seller_financed'::text, 'cash'::text]));

UPDATE projects
SET financing_type = CASE WHEN is_cash_job THEN 'cash' ELSE 'external_loan' END
WHERE financing_type = 'external_loan' OR financing_type IS NULL;

COMMENT ON COLUMN projects.financing_type IS
  'How the build is financed. Drives profit math in lib/finance/project-financials.ts: external_loan treats interest+origination as costs; seller_financed treats them as revenue; cash ignores both.';
