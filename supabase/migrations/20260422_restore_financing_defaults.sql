-- Restore typical external-loan defaults at the DB level. The form already
-- handles these per financing_type (see ProjectForm.tsx) but keeping them
-- at the column level means raw inserts of an external_loan project also
-- start with sensible numbers. For cash or seller_financed projects, the
-- form explicitly writes NULLs.
ALTER TABLE projects ALTER COLUMN down_payment_percent SET DEFAULT 20;
ALTER TABLE projects ALTER COLUMN interest_rate SET DEFAULT 8.75;
ALTER TABLE projects ALTER COLUMN origination_fee_percent SET DEFAULT 2;
