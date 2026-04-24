-- Self-audit: rows here mean a draw's stored amount doesn't match the
-- sum of its linked contractor_payments. The trigger should keep these
-- in sync; any rows returned point to a bug or out-of-band DB edit.
CREATE OR REPLACE VIEW v_draw_amount_integrity AS
SELECT
  dr.id AS draw_id,
  dr.project_id,
  dr.draw_number,
  dr.status,
  dr.amount AS stored_amount,
  COALESCE(
    (SELECT SUM(cp.amount) FROM contractor_payments cp WHERE cp.draw_request_id = dr.id),
    0
  ) AS computed_amount,
  dr.amount - COALESCE(
    (SELECT SUM(cp.amount) FROM contractor_payments cp WHERE cp.draw_request_id = dr.id),
    0
  ) AS drift
FROM draw_requests dr
WHERE dr.status <> 'funded'
  AND dr.amount <> COALESCE(
    (SELECT SUM(cp.amount) FROM contractor_payments cp WHERE cp.draw_request_id = dr.id),
    0
  );

COMMENT ON VIEW v_draw_amount_integrity IS
  'Diagnostic: non-funded draws whose stored amount differs from the sum of linked contractor_payments. Should always be empty thanks to the recalc trigger.';
