-- Tracks the last QBO sync error on a payment so failures surface in the UI
-- and the retry button can be shown.
ALTER TABLE contractor_payments
  ADD COLUMN IF NOT EXISTS qbo_sync_error text DEFAULT NULL;
