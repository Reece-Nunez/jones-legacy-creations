-- Expand contractor_payments to track the full lifecycle:
--   pending -> paid_personal (Blake fronted) -> reimbursed (draw funded, auto)
--   pending -> paid_from_draw (Blake paid from draw funds) + optional receipt

ALTER TABLE contractor_payments
  ADD COLUMN IF NOT EXISTS receipt_file_url text,
  ADD COLUMN IF NOT EXISTS receipt_file_name text,
  ADD COLUMN IF NOT EXISTS receipt_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_from_draw_date date,
  ADD COLUMN IF NOT EXISTS reimbursed_date date,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS personal_amount numeric;

ALTER TABLE contractor_payments
  DROP CONSTRAINT IF EXISTS contractor_payments_status_check;

UPDATE contractor_payments
SET status = 'paid_personal'
WHERE status = 'paid';

UPDATE contractor_payments cp
SET status = 'reimbursed',
    reimbursed_date = dr.funded_date
FROM draw_requests dr
WHERE cp.status = 'funded'
  AND cp.draw_request_id = dr.id
  AND cp.paid_date IS NOT NULL;

UPDATE contractor_payments cp
SET status = 'paid_from_draw',
    paid_from_draw_date = dr.funded_date
FROM draw_requests dr
WHERE cp.status = 'funded'
  AND cp.draw_request_id = dr.id
  AND cp.paid_date IS NULL;

UPDATE contractor_payments
SET status = 'paid_from_draw'
WHERE status = 'funded';

ALTER TABLE contractor_payments
  ADD CONSTRAINT contractor_payments_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'paid_personal'::text, 'reimbursed'::text, 'paid_from_draw'::text]));
