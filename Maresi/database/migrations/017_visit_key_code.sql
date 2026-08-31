ALTER TABLE visit_requests DROP CONSTRAINT IF EXISTS visit_requests_status_check;
ALTER TABLE visit_requests
  ADD CONSTRAINT visit_requests_status_check
  CHECK (status IN (
    'pending', 'accepted', 'declined', 'awaiting_agreement', 'awaiting_key',
    'awaiting_payment', 'payment_sent', 'confirmed', 'cancelled'
  ));

ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS key_code VARCHAR(6),
  ADD COLUMN IF NOT EXISTS key_confirmed_at TIMESTAMPTZ;
