-- ── QBO webhook idempotency ─────────────────────────────────────────────────
-- QBO retries any webhook that doesn't return 200 within ~2 seconds. With
-- the current inline processing, a batched notification that takes too long
-- causes QBO to retry, and we'd process the same event twice (duplicate
-- activity_log entries, double-resets, etc.).
--
-- Fix: enforce idempotency at the DB level. The combination
-- (realm_id, entity_type, entity_id, operation, lastUpdated) uniquely
-- identifies an event from QBO's perspective. Insert with ON CONFLICT
-- DO NOTHING; if the row already exists, the event has been seen and we
-- skip processing entirely.

create unique index if not exists qbo_webhook_events_unique
  on public.qbo_webhook_events (
    realm_id, entity_type, entity_id, operation, (payload->>'lastUpdated')
  );
