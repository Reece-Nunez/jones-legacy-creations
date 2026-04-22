-- Keep draw_requests.amount in sync with the sum of its linked contractor_payments.
-- Funded draws are skipped so their historical amount stays frozen.

CREATE OR REPLACE FUNCTION recalc_draw_amount(p_draw_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_draw_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE draw_requests
  SET amount = COALESCE(
    (SELECT SUM(amount) FROM contractor_payments WHERE draw_request_id = p_draw_id),
    0
  )
  WHERE id = p_draw_id
    AND status <> 'funded';
END;
$$;

CREATE OR REPLACE FUNCTION trg_recalc_draw_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recalc_draw_amount(NEW.draw_request_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recalc_draw_amount(OLD.draw_request_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM recalc_draw_amount(NEW.draw_request_id);
    IF OLD.draw_request_id IS DISTINCT FROM NEW.draw_request_id THEN
      PERFORM recalc_draw_amount(OLD.draw_request_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS contractor_payments_recalc_draw ON contractor_payments;
CREATE TRIGGER contractor_payments_recalc_draw
AFTER INSERT OR UPDATE OR DELETE ON contractor_payments
FOR EACH ROW
EXECUTE FUNCTION trg_recalc_draw_amount();

-- Backfill: recalc every non-funded draw so existing stale rows get fixed.
UPDATE draw_requests dr
SET amount = COALESCE(
  (SELECT SUM(amount) FROM contractor_payments WHERE draw_request_id = dr.id),
  0
)
WHERE dr.status <> 'funded';
