-- awaiting_host_agreement is 24 characters; status was VARCHAR(20).
ALTER TABLE visit_requests ALTER COLUMN status TYPE VARCHAR(40);

ALTER TABLE visit_requests DROP CONSTRAINT IF EXISTS visit_requests_status_check;
ALTER TABLE visit_requests
  ADD CONSTRAINT visit_requests_status_check
  CHECK (status IN (
    'pending', 'accepted', 'declined', 'awaiting_agreement', 'awaiting_host_agreement',
    'awaiting_key', 'awaiting_payment', 'payment_sent', 'confirmed', 'cancelled'
  ));
