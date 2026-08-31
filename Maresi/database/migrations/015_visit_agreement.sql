-- After the host accepts, the guest signs a care agreement, then pays.

ALTER TABLE visit_requests DROP CONSTRAINT IF EXISTS visit_requests_status_check;
ALTER TABLE visit_requests
  ADD CONSTRAINT visit_requests_status_check
  CHECK (status IN (
    'pending', 'accepted', 'declined', 'awaiting_agreement', 'awaiting_payment',
    'payment_sent', 'confirmed', 'cancelled'
  ));

ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS agreement_full_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS agreement_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreement_signed_at TIMESTAMPTZ;
