-- Stores every inbound QBO webhook event for auditability and debugging.
-- Events are never deleted — they serve as a permanent audit trail.
CREATE TABLE IF NOT EXISTS qbo_webhook_events (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  realm_id     text        NOT NULL,
  entity_type  text        NOT NULL,  -- e.g. 'BillPayment', 'Bill', 'Vendor'
  entity_id    text        NOT NULL,  -- QBO entity Id
  operation    text        NOT NULL,  -- 'Create' | 'Update' | 'Delete' | 'Void' | 'Merge'
  payload      jsonb,                 -- raw entity object from QBO
  processed_at timestamptz DEFAULT now(),
  error        text                   -- set if processing this event failed
);

CREATE INDEX IF NOT EXISTS qbo_webhook_events_realm_entity
  ON qbo_webhook_events (realm_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS qbo_webhook_events_processed_at
  ON qbo_webhook_events (processed_at DESC);
