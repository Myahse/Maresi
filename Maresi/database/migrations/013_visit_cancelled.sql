-- Guest can cancel a stay. Paid stays are refunded if the host has not withdrawn yet.

ALTER TABLE visit_requests DROP CONSTRAINT IF EXISTS visit_requests_status_check;
ALTER TABLE visit_requests
  ADD CONSTRAINT visit_requests_status_check
  CHECK (status IN (
    'pending', 'accepted', 'declined', 'awaiting_payment', 'payment_sent', 'confirmed', 'cancelled'
  ));
