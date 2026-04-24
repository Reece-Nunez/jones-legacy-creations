-- Drop column defaults that were silently back-filling financing numbers
-- on any project created without them. The app form now leaves these
-- blank until Blake sets them, so new projects start NULL instead of
-- 20% / 8.75% / 2% — which would skew projected profit on any project
-- the user hasn't fully configured yet.

ALTER TABLE projects ALTER COLUMN down_payment_percent DROP DEFAULT;
ALTER TABLE projects ALTER COLUMN interest_rate DROP DEFAULT;
ALTER TABLE projects ALTER COLUMN origination_fee_percent DROP DEFAULT;
