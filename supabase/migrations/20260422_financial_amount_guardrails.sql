-- Prevent negative amounts from corrupting financial totals. Zero is
-- allowed so a draft draw can exist before any invoices land on it (the
-- recalc trigger drops it to 0 between creation and first invoice).

ALTER TABLE contractor_payments
  DROP CONSTRAINT IF EXISTS contractor_payments_amount_nonneg;
ALTER TABLE contractor_payments
  ADD CONSTRAINT contractor_payments_amount_nonneg CHECK (amount >= 0);

ALTER TABLE draw_requests
  DROP CONSTRAINT IF EXISTS draw_requests_amount_nonneg;
ALTER TABLE draw_requests
  ADD CONSTRAINT draw_requests_amount_nonneg CHECK (amount >= 0);

-- Index lookups used by the recalc trigger + financial aggregates.
CREATE INDEX IF NOT EXISTS idx_contractor_payments_project
  ON contractor_payments (project_id);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_draw
  ON contractor_payments (draw_request_id)
  WHERE draw_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_draw_requests_project
  ON draw_requests (project_id);
CREATE INDEX IF NOT EXISTS idx_draw_requests_project_status
  ON draw_requests (project_id, status);
