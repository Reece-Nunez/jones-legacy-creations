-- Add owner purchase tracking to budget line items
ALTER TABLE budget_line_items
  ADD COLUMN IF NOT EXISTS is_owner_purchase boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_purchased boolean NOT NULL DEFAULT false;

-- Backfill is_owner_purchase from the "Owner Purchase" text in notes
UPDATE budget_line_items
SET is_owner_purchase = true
WHERE notes LIKE '%Owner Purchase%';

-- Clean up notes: remove the "Owner Purchase" / "Owner Purchase — " prefix now that we have a real column
UPDATE budget_line_items
SET notes = CASE
  WHEN notes = 'Owner Purchase' THEN NULL
  WHEN notes LIKE 'Owner Purchase — %' THEN SUBSTRING(notes FROM 18)
  ELSE notes
END
WHERE is_owner_purchase = true;
